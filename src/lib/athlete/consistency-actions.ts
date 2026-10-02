"use server";

import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { localDayIso, localYearMonth } from "@/lib/time";

export interface ConsistencyDay {
  dayIso: string;
  state: "trained" | "missed" | "closed" | "today" | "future";
  sessions: number;
}

export interface AthleteConsistency {
  week: {
    sessions: number;
    target: number | null;
    /** What the system would propose right now — shown in the goal drawer even when a custom target is active. */
    systemTarget: number | null;
    isCustomTarget: boolean;
    days: ConsistencyDay[];
    pace: "ahead" | "on" | "behind" | null;
    missingForTarget: number;
  };
  month: {
    sessions: number;
    year: number;
    month: number;
    record: { sessions: number; year: number; month: number } | null;
    isNewRecord: boolean;
  };
  lastWeek: { sessions: number; target: number | null; days: ConsistencyDay[] } | null;
}

// ── Date helpers (local calendar-day arithmetic, string-based) ─────────────

function addDays(dayIso: string, delta: number): string {
  const d = new Date(`${dayIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Monday = 0 ... Sunday = 6 */
function weekdayMon0(dayIso: string): number {
  const jsDay = new Date(`${dayIso}T12:00:00Z`).getUTCDay();
  return (jsDay + 6) % 7;
}

function mondayOf(dayIso: string): string {
  return addDays(dayIso, -weekdayMon0(dayIso));
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (new Date(`${toIso}T12:00:00Z`).getTime() - new Date(`${fromIso}T12:00:00Z`).getTime()) / 86_400_000
  );
}

// ── Core read ────────────────────────────────────────────────────────────

/** The athlete's own dashboard read — resolves the current session user. */
export async function getAthleteConsistency(boxId: string): Promise<AthleteConsistency> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return emptyConsistency();
  return computeAthleteConsistency(user.id, boxId);
}

/**
 * Same computation for an arbitrary athlete — used by the coach-side
 * check-in flow to build the "presença registada" notification, where the
 * caller is the coach, not the athlete. Uses the admin client throughout
 * since there's no athlete session to scope RLS to.
 */
export async function computeAthleteConsistency(userId: string, boxId: string): Promise<AthleteConsistency> {
  const supabase = supabaseAdmin;
  const user = { id: userId };

  const { data: membership } = await supabase
    .from("memberships")
    .select("status, start_date, created_at")
    .eq("user_id", user.id)
    .eq("box_id", boxId)
    .maybeSingle();

  const isActive = membership?.status === "active" || membership?.status === "trial";
  const membershipStart = membership?.start_date ?? membership?.created_at?.slice(0, 10) ?? localDayIso();

  const today = localDayIso();
  const thisMonday = mondayOf(today);
  const lastMonday = addDays(thisMonday, -7);
  const rangeFrom = addDays(thisMonday, -28); // covers up to 4 completed weeks back
  const rangeTo = addDays(thisMonday, 7); // exclusive — end of current week

  // Sessions = attended bookings, bucketed by the local day of the class.
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("attended, classes!inner(starts_at, box_id)")
    .eq("user_id", user.id)
    .eq("attended", true)
    .eq("classes.box_id", boxId)
    .gte("classes.starts_at", `${rangeFrom}T00:00:00`)
    .lt("classes.starts_at", `${rangeTo}T00:00:00`);

  const sessionsByDay: Record<string, number> = {};
  for (const row of bookingRows ?? []) {
    const cls = row.classes as unknown as { starts_at: string } | null;
    if (!cls) continue;
    const day = cls.starts_at.slice(0, 10);
    sessionsByDay[day] = (sessionsByDay[day] ?? 0) + 1;
  }

  // Operation days for the current week — a day with >= 1 scheduled class.
  const { data: weekClasses } = await supabase
    .from("classes")
    .select("starts_at")
    .eq("box_id", boxId)
    .eq("status", "scheduled")
    .gte("starts_at", `${thisMonday}T00:00:00`)
    .lt("starts_at", `${rangeTo}T00:00:00`);

  const operationDaysThisWeek = new Set((weekClasses ?? []).map((c) => c.starts_at.slice(0, 10)));

  // ── Weekly target ──────────────────────────────────────────────────────
  const { data: customGoal } = await supabase
    .from("athlete_weekly_goals")
    .select("weekly_target")
    .eq("user_id", user.id)
    .eq("box_id", boxId)
    .maybeSingle();

  const joinMonday = mondayOf(membershipStart);
  const weeksElapsed = Math.max(0, Math.floor(daysBetween(joinMonday, thisMonday) / 7));
  const weeksToAverage = Math.min(4, weeksElapsed);

  let systemTarget: number | null = null;
  if (weeksElapsed >= 2) {
    let total = 0;
    for (let i = 1; i <= weeksToAverage; i++) {
      const weekStart = addDays(thisMonday, -7 * i);
      let weekSum = 0;
      for (let d = 0; d < 7; d++) {
        weekSum += sessionsByDay[addDays(weekStart, d)] ?? 0;
      }
      total += weekSum;
    }
    systemTarget = Math.min(14, Math.max(1, Math.round(total / weeksToAverage)));
  }

  const isCustomTarget = !!customGoal;
  let target = isCustomTarget ? customGoal!.weekly_target : systemTarget;
  if (!isActive) target = null;

  // ── Current week ───────────────────────────────────────────────────────
  const weekDays: ConsistencyDay[] = [];
  let weekSessions = 0;
  let operationDaysElapsed = 0;
  for (let d = 0; d < 7; d++) {
    const dayIso = addDays(thisMonday, d);
    const sessions = sessionsByDay[dayIso] ?? 0;
    const isOperating = operationDaysThisWeek.has(dayIso);
    weekSessions += sessions;
    if (isOperating && dayIso <= today) operationDaysElapsed++;

    let state: ConsistencyDay["state"];
    if (sessions > 0) state = "trained";
    else if (!isOperating) state = "closed";
    else if (dayIso === today) state = "today";
    else if (dayIso < today) state = "missed";
    else state = "future";

    weekDays.push({ dayIso, state, sessions });
  }

  let pace: "ahead" | "on" | "behind" | null = null;
  if (target !== null && weekdayMon0(today) !== 0) {
    const operationDaysTotal = operationDaysThisWeek.size || 1;
    const expected = target * (operationDaysElapsed / operationDaysTotal);
    const diff = weekSessions - expected;
    pace = diff >= 1 ? "ahead" : diff <= -1 ? "behind" : "on";
  }

  const missingForTarget = target !== null ? Math.max(0, target - weekSessions) : 0;

  // ── Last week (Monday only) ───────────────────────────────────────────
  let lastWeek: AthleteConsistency["lastWeek"] = null;
  if (weekdayMon0(today) === 0) {
    const lastWeekDays: ConsistencyDay[] = [];
    let lastWeekSessions = 0;
    const { data: lastWeekClasses } = await supabase
      .from("classes")
      .select("starts_at")
      .eq("box_id", boxId)
      .eq("status", "scheduled")
      .gte("starts_at", `${lastMonday}T00:00:00`)
      .lt("starts_at", `${thisMonday}T00:00:00`);
    const lastWeekOperationDays = new Set((lastWeekClasses ?? []).map((c) => c.starts_at.slice(0, 10)));

    for (let d = 0; d < 7; d++) {
      const dayIso = addDays(lastMonday, d);
      const sessions = sessionsByDay[dayIso] ?? 0;
      lastWeekSessions += sessions;
      const isOperating = lastWeekOperationDays.has(dayIso);
      const state: ConsistencyDay["state"] = sessions > 0 ? "trained" : !isOperating ? "closed" : "missed";
      lastWeekDays.push({ dayIso, state, sessions });
    }

    lastWeek = { sessions: lastWeekSessions, target, days: lastWeekDays };
  }

  // ── Month + monthly record ────────────────────────────────────────────
  const { year, month } = localYearMonth();
  const monthFirstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const monthNextFirstDay = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  let monthSessions = 0;
  for (const [day, count] of Object.entries(sessionsByDay)) {
    if (day >= monthFirstDay && day < monthNextFirstDay) monthSessions += count;
  }
  // The 4-week lookback window may not cover the whole month (a month can
  // span up to ~5 weeks) — top up with a direct query for days it missed.
  if (monthFirstDay < rangeFrom) {
    const { data: extraRows } = await supabase
      .from("bookings")
      .select("attended, classes!inner(starts_at, box_id)")
      .eq("user_id", user.id)
      .eq("attended", true)
      .eq("classes.box_id", boxId)
      .gte("classes.starts_at", `${monthFirstDay}T00:00:00`)
      .lt("classes.starts_at", `${rangeFrom}T00:00:00`);
    monthSessions += (extraRows ?? []).length;
  }

  const { year: joinYear, month: joinMonth } = localYearMonth(new Date(`${membershipStart}T12:00:00Z`));
  const isFirstMonth = joinYear === year && joinMonth === month;

  let recordOut: AthleteConsistency["month"]["record"] = null;
  let isNewRecord = false;

  if (!isFirstMonth) {
    const { data: existingRecord } = await supabaseAdmin
      .from("athlete_monthly_records")
      .select("best_sessions, best_year, best_month")
      .eq("user_id", user.id)
      .eq("box_id", boxId)
      .maybeSingle();

    recordOut = existingRecord
      ? { sessions: existingRecord.best_sessions, year: existingRecord.best_year, month: existingRecord.best_month }
      : null;

    if (monthSessions > 0) {
      if (!existingRecord) {
        await supabaseAdmin.from("athlete_monthly_records").insert({
          user_id: user.id,
          box_id: boxId,
          best_sessions: monthSessions,
          best_year: year,
          best_month: month,
        });
        isNewRecord = true;
      } else if (monthSessions > existingRecord.best_sessions) {
        await supabaseAdmin
          .from("athlete_monthly_records")
          .update({ best_sessions: monthSessions, best_year: year, best_month: month, achieved_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("box_id", boxId)
          .lt("best_sessions", monthSessions);
        isNewRecord = true;
      }
    }
  }

  return {
    week: { sessions: weekSessions, target, systemTarget, isCustomTarget, days: weekDays, pace, missingForTarget },
    month: { sessions: monthSessions, year, month, record: recordOut, isNewRecord },
    lastWeek,
  };
}

function emptyConsistency(): AthleteConsistency {
  return {
    week: { sessions: 0, target: null, systemTarget: null, isCustomTarget: false, days: [], pace: null, missingForTarget: 0 },
    month: { sessions: 0, year: 0, month: 0, record: null, isNewRecord: false },
    lastWeek: null,
  };
}

// ── Meta personalizada ───────────────────────────────────────────────────

const weeklyGoalSchema = z.number().int().min(1).max(14);

export async function setWeeklyGoal(boxId: string, target: number): Promise<{ error?: string }> {
  const parsed = weeklyGoalSchema.safeParse(target);
  if (!parsed.success) return { error: "Meta inválida — tem de ser entre 1 e 14." };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("athlete_weekly_goals")
    .upsert(
      { user_id: user.id, box_id: boxId, weekly_target: parsed.data, updated_at: new Date().toISOString() },
      { onConflict: "user_id,box_id" }
    );

  if (error) return { error: error.message };
  revalidatePath("/athlete");
  return {};
}

export async function resetWeeklyGoal(boxId: string): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("athlete_weekly_goals")
    .delete()
    .eq("user_id", user.id)
    .eq("box_id", boxId);

  if (error) return { error: error.message };
  revalidatePath("/athlete");
  return {};
}
