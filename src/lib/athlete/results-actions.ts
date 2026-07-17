"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface ResultDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ResultClass {
  class_id: string;
  class_name: string;
  starts_at: string;
  wods: ResultWod[];
}

export interface ResultWod {
  wod_id: string;
  wod_title: string;
  wod_type: string;
  score_type: string;
  description: string | null;
  movements: { name: string }[];
  time_cap_minutes: number | null;
  result_sets: number | null;
  result_reps_per_set: number | null;
  is_benchmark: boolean;
  my_result: {
    id: string;
    score_display: string | null;
    rx: boolean;
    dnf: boolean;
    sets_data: unknown;
    notes: string | null;
    is_pr: boolean;
  } | null;
}

export interface AthleteResultsData {
  activeBoxId: string;
  // Days with at least one result in the queried month
  daysWithResults: ResultDay[];
}

export interface AthleteResultsForDay {
  classes: ResultClass[];
}

async function resolveActiveBoxId(supabase: Awaited<ReturnType<typeof supabaseServer>>, userId: string): Promise<string | null> {
  const { data: memberships } = await supabase
    .from("memberships")
    .select("box_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at");

  const allBoxIds = (memberships ?? []).map((m) => m.box_id);
  if (allBoxIds.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get("athlete_active_box")?.value;
  return (preferred && allBoxIds.includes(preferred) ? preferred : null) ?? allBoxIds[0];
}

export async function getAthleteResultsCalendar(year: number, month: number): Promise<AthleteResultsData> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeBoxId = await resolveActiveBoxId(supabase, user.id);
  if (!activeBoxId) return { activeBoxId: "", daysWithResults: [] };

  // Compare directly against date strings — avoids UTC offset shifting the day boundary
  const monthStr = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const from = `${year}-${monthStr}-01T00:00:00`;
  const to = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}T23:59:59`;

  // Find all classes the athlete attended (confirmed booking + check-in) in the month that have WODs
  const { data: classes } = await supabase
    .from("classes")
    .select("id, starts_at, wod_ids")
    .eq("box_id", activeBoxId)
    .gte("starts_at", from)
    .lte("starts_at", to);

  const classIds = (classes ?? []).filter((c) => {
    const ids = c.wod_ids as string[] | null;
    return ids && ids.length > 0;
  }).map((c) => c.id);

  if (classIds.length === 0) return { activeBoxId, daysWithResults: [] };

  const { data: bookings } = await supabase
    .from("bookings")
    .select("class_id")
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .eq("attended", true)
    .in("class_id", classIds);

  const bookedClassIds = new Set((bookings ?? []).map((b) => b.class_id));

  // Group attended classes by local date (use starts_at date portion)
  const countByDate: Record<string, number> = {};
  for (const cls of classes ?? []) {
    if (!bookedClassIds.has(cls.id)) continue;
    const ids = cls.wod_ids as string[] | null;
    if (!ids || ids.length === 0) continue;
    // Use the date part of starts_at (stored as UTC, close enough for PT)
    const d = cls.starts_at.slice(0, 10);
    countByDate[d] = (countByDate[d] ?? 0) + ids.length;
  }

  const daysWithResults: ResultDay[] = Object.entries(countByDate).map(([date, count]) => ({ date, count }));

  return { activeBoxId, daysWithResults };
}

export async function getAthleteResultsForDay(date: string): Promise<AthleteResultsForDay> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeBoxId = await resolveActiveBoxId(supabase, user.id);
  if (!activeBoxId) return { classes: [] };

  // Step 1: classes in the day where athlete has a confirmed booking
  // Use noon to avoid DST/midnight issues, then extract local date parts
  const nextDate = new Date(`${date}T12:00:00`);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = [
    nextDate.getFullYear(),
    String(nextDate.getMonth() + 1).padStart(2, "0"),
    String(nextDate.getDate()).padStart(2, "0"),
  ].join("-");

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, starts_at, wod_ids")
    .eq("box_id", activeBoxId)
    .gte("starts_at", `${date}T00:00:00`)
    .lt("starts_at", `${nextDateStr}T00:00:00`)
    .order("starts_at");

  const classIds = (classes ?? []).map((c) => c.id);
  if (classIds.length === 0) return { classes: [] };

  const { data: bookings } = await supabase
    .from("bookings")
    .select("class_id")
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .eq("attended", true)
    .in("class_id", classIds);

  const bookedClassIds = new Set((bookings ?? []).map((b) => b.class_id));
  const attendedClasses = (classes ?? []).filter((c) => bookedClassIds.has(c.id));
  if (attendedClasses.length === 0) return { classes: [] };

  // Step 2: all wod_ids from attended classes
  const allWodIds = [...new Set(attendedClasses.flatMap((c) => (c.wod_ids as string[]) ?? []))];
  if (allWodIds.length === 0) return { classes: [] };

  const { data: wods } = await supabase
    .from("wods")
    .select("id, title, type, score_type, description, movements, time_cap_minutes, result_sets, result_reps_per_set, is_benchmark")
    .in("id", allWodIds);

  const wodMap = new Map((wods ?? []).map((w) => [w.id, w]));

  // Step 3: user's results — prefer class-scoped results (class_id match) so the same
  // wod_id reused in a future session doesn't bleed a previous result.
  // Falls back to wod_id-only match (legacy rows without class_id).
  const { data: results } = await supabase
    .from("wod_results")
    .select("id, wod_id, class_id, score_type, score_display, rx, dnf, sets_data, notes, recorded_at")
    .eq("user_id", user.id)
    .eq("box_id", activeBoxId)
    .in("wod_id", allWodIds)
    .order("recorded_at", { ascending: false });

  // Build two maps:
  // - resultByClassWod: keyed by "class_id:wod_id" — one result per class session
  // - resultByWodFallback: keyed by wod_id — legacy results with class_id IS NULL
  // Results from classes not in this day's attended list are excluded.
  const classIdSet = new Set(classIds);
  type ResultRow = NonNullable<typeof results>[number];
  const resultByClassWod = new Map<string, ResultRow>();
  const resultByWodFallback = new Map<string, ResultRow>();

  for (const r of results ?? []) {
    if (r.class_id != null) {
      if (!classIdSet.has(r.class_id)) continue; // different session — skip
      const key = `${r.class_id}:${r.wod_id}`;
      if (!resultByClassWod.has(key)) resultByClassWod.set(key, r); // keep most recent (ordered desc)
    } else {
      // Legacy unscoped result — use as fallback only
      if (!resultByWodFallback.has(r.wod_id)) resultByWodFallback.set(r.wod_id, r);
    }
  }

  // Step 4: check which results are PRs
  const resultIds = [...resultByClassWod.values(), ...resultByWodFallback.values()].map((r) => r.id);
  const prSet = new Set<string>();
  if (resultIds.length > 0) {
    const { data: prRows } = await supabase
      .from("prs")
      .select("wod_result_id")
      .in("wod_result_id", resultIds);
    for (const p of prRows ?? []) {
      if (p.wod_result_id) prSet.add(p.wod_result_id);
    }
  }

  // Step 5: build output — show ALL wods per attended class
  const resultClasses: ResultClass[] = [];
  for (const cls of attendedClasses) {
    const wodIdsForClass = (cls.wod_ids as string[]) ?? [];
    const classWods: ResultWod[] = wodIdsForClass.reduce<ResultWod[]>((acc, wid) => {
      const w = wodMap.get(wid);
      if (!w) return acc;
      const r = resultByClassWod.get(`${cls.id}:${wid}`) ?? resultByWodFallback.get(wid) ?? null;
      acc.push({
        wod_id: wid,
        wod_title: w.title,
        wod_type: w.type,
        score_type: w.score_type ?? "reps",
        description: w.description,
        movements: (w.movements as { name: string }[]) ?? [],
        time_cap_minutes: w.time_cap_minutes,
        result_sets: w.result_sets,
        result_reps_per_set: w.result_reps_per_set,
        is_benchmark: w.is_benchmark ?? false,
        my_result: r
          ? { id: r.id, score_display: r.score_display, rx: r.rx, dnf: r.dnf, sets_data: r.sets_data, notes: r.notes, is_pr: prSet.has(r.id) }
          : null,
      });
      return acc;
    }, []);

    if (classWods.length > 0) {
      resultClasses.push({ class_id: cls.id, class_name: cls.name, starts_at: cls.starts_at, wods: classWods });
    }
  }

  return { classes: resultClasses };
}
