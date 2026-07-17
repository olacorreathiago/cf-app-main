"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { startOfWeek, endOfWeek, addWeeks } from "date-fns";
import type { AthleteDashboardClass, AthleteDashboardWod } from "./dashboard-actions";

export interface BoxBookingSettings {
  cancellation_window_hours: number;
  booking_advance_days: number;
  max_waitlist: number;
}

export interface WeekClassesResult {
  classes: AthleteDashboardClass[];
  attendedClasses: AthleteDashboardClass[];
  boxName: string;
  boxId: string;
  settings: BoxBookingSettings;
}

const DEFAULT_SETTINGS: BoxBookingSettings = {
  cancellation_window_hours: 1,
  booking_advance_days: 7,
  max_waitlist: 5,
};

export async function fetchWodsForClasses(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  classes: AthleteDashboardClass[],
  userId: string,
  boxId: string
): Promise<Map<string, AthleteDashboardWod[]>> {
  const classIds = classes.map((c) => c.id);
  const result = new Map<string, AthleteDashboardWod[]>();
  if (classIds.length === 0) return result;

  // Use SECURITY DEFINER fn to bypass "athletes can view published wods" RLS —
  // athletes who attended a class can register results even for unpublished WODs.
  const { data: rows } = await supabase.rpc("get_attended_class_wods", {
    p_class_ids: classIds,
  });

  if (!rows || rows.length === 0) return result;

  const allWodIds = [...new Set(rows.map((r: { wod_id: string }) => r.wod_id))];

  // Fetch results for these WODs. Include both class-scoped results (class_id IN classIds)
  // and legacy unscoped results (class_id IS NULL) as fallback.
  const classIdList = classIds.join(",");
  const { data: myResults } = await supabase
    .from("wod_results")
    .select("id, wod_id, class_id, score_display, rx")
    .eq("user_id", userId)
    .eq("box_id", boxId)
    .in("wod_id", allWodIds)
    .or(`class_id.in.(${classIdList}),class_id.is.null`);

  // Key by "class_id:wod_id" for scoped results. For null class_id (legacy), key by wod_id only
  // so it matches any class. Scoped results take priority over unscoped ones.
  const resultMap: Record<string, { id: string; score_display: string; rx: boolean; is_pr: boolean }> = {};
  for (const r of myResults ?? []) {
    const unscopedKey = `null:${r.wod_id}`;
    const scopedKey = `${r.class_id}:${r.wod_id}`;
    if (r.class_id == null) {
      // Only store as fallback if no scoped result exists yet
      if (!resultMap[unscopedKey]) resultMap[unscopedKey] = { id: r.id, score_display: r.score_display ?? "", rx: r.rx, is_pr: false };
    } else {
      resultMap[scopedKey] = { id: r.id, score_display: r.score_display ?? "", rx: r.rx, is_pr: false };
    }
  }

  const resultIds = (myResults ?? []).map((r) => r.id);
  if (resultIds.length > 0) {
    const { data: prRows } = await supabase
      .from("prs")
      .select("wod_result_id")
      .in("wod_result_id", resultIds);
    const prResultIds = new Set((prRows ?? []).map((p) => p.wod_result_id));
    for (const r of myResults ?? []) {
      const key = r.class_id != null ? `${r.class_id}:${r.wod_id}` : `null:${r.wod_id}`;
      if (prResultIds.has(r.id) && resultMap[key]) resultMap[key].is_pr = true;
    }
  }

  for (const row of rows as Array<{
    class_id: string; wod_id: string; title: string; type: string; category: string;
    score_type: string; description: string | null; movements: AthleteDashboardWod["movements"];
    time_cap_minutes: number | null; scaling_notes: string | null;
    result_sets: number | null; result_reps_per_set: number | null;
  }>) {
    const wod: AthleteDashboardWod = {
      id: row.wod_id,
      title: row.title,
      type: row.type,
      category: row.category,
      score_type: row.score_type ?? "reps",
      description: row.description,
      movements: row.movements ?? [],
      time_cap_minutes: row.time_cap_minutes,
      scaling_notes: row.scaling_notes,
      result_sets: row.result_sets ?? null,
      result_reps_per_set: row.result_reps_per_set ?? null,
      my_result: resultMap[`${row.class_id}:${row.wod_id}`] ?? resultMap[`null:${row.wod_id}`] ?? null,
    };
    if (!result.has(row.class_id)) result.set(row.class_id, []);
    result.get(row.class_id)!.push(wod);
  }

  return result;
}

export async function getAthleteWeekClasses(weekOffset = 0): Promise<WeekClassesResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const preferredBoxId = cookieStore.get("athlete_active_box")?.value;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("box_id, boxes(id, name, settings)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at");

  const allBoxes = (memberships ?? [])
    .map((m) => {
      const box = m.boxes as unknown as { id: string; name: string; settings: Record<string, unknown> } | null;
      return box ? { id: box.id, name: box.name, settings: box.settings ?? {} } : null;
    })
    .filter((b): b is { id: string; name: string; settings: Record<string, unknown> } => b !== null);

  const activeBox =
    (preferredBoxId ? allBoxes.find((b) => b.id === preferredBoxId) : null) ?? allBoxes[0] ?? null;

  if (!activeBox) {
    return { classes: [], attendedClasses: [], boxName: "", boxId: "", settings: DEFAULT_SETTINGS };
  }

  const s = activeBox.settings;
  const settings: BoxBookingSettings = {
    cancellation_window_hours:
      typeof s.cancellation_window_hours === "number"
        ? s.cancellation_window_hours
        : DEFAULT_SETTINGS.cancellation_window_hours,
    booking_advance_days:
      typeof s.booking_advance_days === "number"
        ? s.booking_advance_days
        : DEFAULT_SETTINGS.booking_advance_days,
    max_waitlist:
      typeof s.max_waitlist === "number"
        ? s.max_waitlist
        : DEFAULT_SETTINGS.max_waitlist,
  };

  const now = new Date();
  const baseDate = addWeeks(now, weekOffset);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });

  // On current week: upcoming only (rangeStart = now). Other weeks: full week.
  const rangeStart = weekOffset === 0 ? now : weekStart;

  const { data: rawClasses } = await supabase
    .from("classes")
    .select("id, name, starts_at, duration_minutes, capacity, wod_ids, coach_id")
    .eq("box_id", activeBox.id)
    .eq("status", "scheduled")
    .gte("starts_at", rangeStart.toISOString())
    .lte("starts_at", weekEnd.toISOString())
    .order("starts_at");

  const classIds = (rawClasses ?? []).map((c) => c.id);

  // Coach names
  const coachIds = [...new Set((rawClasses ?? []).map((c) => c.coach_id).filter(Boolean) as string[])];
  const coachMap: Record<string, string> = {};
  if (coachIds.length > 0) {
    const { data: coaches } = await supabase
      .from("profiles")
      .select("id, full_name, nickname")
      .in("id", coachIds);
    for (const c of coaches ?? []) {
      coachMap[c.id] = c.nickname ?? c.full_name ?? "";
    }
  }

  // Booking counts
  const { data: countRows } = classIds.length > 0
    ? await supabase.rpc("get_class_booking_counts", { p_class_ids: classIds })
    : { data: [] };
  const countMap: Record<string, { confirmed: number; waitlist: number }> = {};
  for (const row of countRows ?? []) {
    countMap[row.class_id] = { confirmed: row.confirmed_count ?? 0, waitlist: row.waitlist_count ?? 0 };
  }
  if (classIds.length > 0) {
    const { data: trialRows } = await supabaseAdmin
      .from("trials")
      .select("class_id")
      .in("class_id", classIds)
      .not("status", "in", '("lost","converted")');
    for (const t of trialRows ?? []) {
      if (t.class_id) {
        if (!countMap[t.class_id]) countMap[t.class_id] = { confirmed: 0, waitlist: 0 };
        countMap[t.class_id].confirmed += 1;
      }
    }
  }

  // Athlete's own bookings
  const { data: myBookings } = classIds.length > 0
    ? await supabase
        .from("bookings")
        .select("class_id, status, attended")
        .eq("user_id", user.id)
        .in("class_id", classIds)
    : { data: [] };
  const myBookingMap: Record<string, "confirmed" | "waitlist" | "cancelled"> = {};
  const myAttendedMap: Record<string, boolean | null> = {};
  for (const b of myBookings ?? []) {
    myBookingMap[b.class_id] = b.status as "confirmed" | "waitlist" | "cancelled";
    myAttendedMap[b.class_id] = (b as { attended?: boolean | null }).attended ?? null;
  }

  // Waitlist positions for classes where this athlete is waitlisted
  const waitlistedIds = classIds.filter((id) => myBookingMap[id] === "waitlist");
  const waitlistPositionMap: Record<string, number> = {};
  if (waitlistedIds.length > 0) {
    const { data: posRows } = await supabase.rpc("get_waitlist_positions", {
      p_user_id: user.id,
      p_class_ids: waitlistedIds,
    });
    for (const row of posRows ?? []) {
      waitlistPositionMap[row.class_id] = row.waitlist_pos;
    }
  }

  const classes: AthleteDashboardClass[] = (rawClasses ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    starts_at: c.starts_at,
    duration_minutes: c.duration_minutes,
    capacity: c.capacity,
    wod_ids: (c.wod_ids as string[]) ?? [],
    coach_name: c.coach_id ? (coachMap[c.coach_id] ?? null) : null,
    confirmed_count: countMap[c.id]?.confirmed ?? 0,
    waitlist_count: countMap[c.id]?.waitlist ?? 0,
    my_booking_status: myBookingMap[c.id] ?? null,
    my_attended: myAttendedMap[c.id] ?? null,
    my_waitlist_position: waitlistPositionMap[c.id],
  }));

  // -------------------------------------------------------------------------
  // Past attended classes: any week, any class the athlete has a confirmed
  // booking for (including coach-added) that ended before now.
  // On week 0 → these become the "Já participei" section.
  // On other weeks → they're mixed into classes (all past already).
  // -------------------------------------------------------------------------
  let attendedClasses: AthleteDashboardClass[] = [];

  if (weekOffset === 0) {
    // Confirmed bookings with check-in (attended = true) — only those grant
    // access to the class WODs / result registration ("Já participei")
    const { data: myConfirmedBookings } = await supabase
      .from("bookings")
      .select("class_id")
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .eq("attended", true);

    const bookedIds = (myConfirmedBookings ?? []).map((b) => b.class_id);

    if (bookedIds.length > 0) {
      const { data: pastRaw } = await supabase
        .from("classes")
        .select("id, name, starts_at, duration_minutes, capacity, wod_ids, coach_id")
        .eq("box_id", activeBox.id)
        .gte("starts_at", weekStart.toISOString())
        .lt("starts_at", now.toISOString())
        .in("id", bookedIds)
        .order("starts_at");

      const pastIds = (pastRaw ?? []).map((c) => c.id);

      // Fetch missing coaches
      const missingCoachIds = [
        ...new Set(
          (pastRaw ?? [])
            .map((c) => c.coach_id)
            .filter((id): id is string => !!id && !(id in coachMap))
        ),
      ];
      if (missingCoachIds.length > 0) {
        const { data: extraCoaches } = await supabase
          .from("profiles")
          .select("id, full_name, nickname")
          .in("id", missingCoachIds);
        for (const c of extraCoaches ?? []) {
          coachMap[c.id] = c.nickname ?? c.full_name ?? "";
        }
      }

      const { data: pastCounts } = pastIds.length > 0
        ? await supabase.rpc("get_class_booking_counts", { p_class_ids: pastIds })
        : { data: [] };
      const pastCountMap: Record<string, { confirmed: number; waitlist: number }> = {};
      for (const row of pastCounts ?? []) {
        pastCountMap[row.class_id] = { confirmed: row.confirmed_count ?? 0, waitlist: row.waitlist_count ?? 0 };
      }

      attendedClasses = (pastRaw ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        starts_at: c.starts_at,
        duration_minutes: c.duration_minutes,
        capacity: c.capacity,
        wod_ids: (c.wod_ids as string[]) ?? [],
        coach_name: c.coach_id ? (coachMap[c.coach_id] ?? null) : null,
        confirmed_count: pastCountMap[c.id]?.confirmed ?? 0,
        waitlist_count: pastCountMap[c.id]?.waitlist ?? 0,
        my_booking_status: "confirmed" as const,
        my_attended: true,
      }));

      // Fetch WOD data for attended classes
      const wodsByClass = await fetchWodsForClasses(supabase, attendedClasses, user.id, activeBox.id);
      attendedClasses = attendedClasses.map((c) => ({ ...c, wods: wodsByClass.get(c.id) ?? [] }));
    }
  } else {
    // For other weeks: all classes are already in `classes`.
    // Fetch WOD data for checked-in past ones so the result button works.
    const pastAttended = classes.filter((c) => {
      const endsAt = new Date(new Date(c.starts_at).getTime() + c.duration_minutes * 60_000);
      return c.my_booking_status === "confirmed" && c.my_attended === true && endsAt < now;
    });
    if (pastAttended.length > 0) {
      const wodsByClass = await fetchWodsForClasses(supabase, pastAttended, user.id, activeBox.id);
      // Merge wods back into classes array
      const wodsMergeMap = new Map(wodsByClass);
      for (let i = 0; i < classes.length; i++) {
        if (wodsMergeMap.has(classes[i].id)) {
          classes[i] = { ...classes[i], wods: wodsMergeMap.get(classes[i].id) };
        }
      }
    }
  }

  return { classes, attendedClasses, boxName: activeBox.name, boxId: activeBox.id, settings };
}

export interface ClassAttendee {
  user_id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

export async function getClassAttendees(classId: string): Promise<ClassAttendee[]> {
  const supabase = await supabaseServer();
  const [{ data: bookingAttendees }, { data: trials }] = await Promise.all([
    supabase.rpc("get_class_attendees", { p_class_id: classId }),
    supabaseAdmin
      .from("trials")
      .select("id, name")
      .eq("class_id", classId),
  ]);
  const trialAttendees: ClassAttendee[] = (trials ?? []).map((t) => ({
    user_id: `trial-${t.id}`,
    full_name: t.name,
    nickname: null,
    avatar_url: null,
  }));
  return [...(bookingAttendees ?? []) as ClassAttendee[], ...trialAttendees];
}
