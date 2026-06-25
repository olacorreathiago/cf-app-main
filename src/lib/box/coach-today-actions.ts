"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface CoachTodayWod {
  id: string;
  title: string;
  type: string;
  score_type: string;
  description: string | null;
}

export interface CoachTodayResult {
  score_display: string;
  rx: boolean;
  dnf: boolean;
}

export interface CoachTodayAthlete {
  id: string;
  booking_id: string;
  full_name: string | null;
  avatar_url: string | null;
  attended: boolean | null;
  result: CoachTodayResult | null;
}

export interface CoachTodayClass {
  id: string;
  name: string;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  coach_id: string | null;
  status: "ongoing" | "upcoming" | "finished";
  wods: CoachTodayWod[];
  athletes: CoachTodayAthlete[];
  results_count: number;
}

export async function getCoachTodayData(boxId: string): Promise<CoachTodayClass[]> {
  const now = new Date();
  const nowMs = now.getTime();
  const localToday = now.toLocaleDateString("sv");
  const localTomorrow = new Date(nowMs + 86_400_000).toLocaleDateString("sv");

  const { data: rawClasses } = await supabaseAdmin
    .from("classes")
    .select("id, name, starts_at, duration_minutes, capacity, coach_id, wod_ids")
    .eq("box_id", boxId)
    .gte("starts_at", `${localToday}T00:00:00`)
    .lt("starts_at", `${localTomorrow}T00:00:00`)
    .eq("status", "scheduled")
    .order("starts_at");

  if (!rawClasses || rawClasses.length === 0) return [];

  const classIds = rawClasses.map((c) => c.id);

  // Confirmed bookings with profiles
  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("id, class_id, user_id, attended, profiles(id, full_name, avatar_url)")
    .in("class_id", classIds)
    .eq("status", "confirmed");

  // WODs for all classes
  const allWodIds = [
    ...new Set(rawClasses.flatMap((c) => (c.wod_ids as string[]) ?? [])),
  ];
  const wodMap: Record<string, CoachTodayWod> = {};
  if (allWodIds.length > 0) {
    const { data: wods } = await supabaseAdmin
      .from("wods")
      .select("id, title, type, score_type, description")
      .in("id", allWodIds);
    for (const w of wods ?? []) {
      wodMap[w.id] = {
        id: w.id,
        title: w.title,
        type: w.type,
        score_type: w.score_type ?? "reps",
        description: w.description,
      };
    }
  }

  // Results for today's classes
  const { data: results } = await supabaseAdmin
    .from("wod_results")
    .select("user_id, class_id, wod_id, score_display, rx, dnf")
    .in("class_id", classIds);

  // Index results by class_id + user_id (primary WOD = first wod_id of class)
  const resultMap: Record<string, CoachTodayResult> = {};
  for (const r of results ?? []) {
    const key = `${r.class_id}:${r.user_id}`;
    if (!resultMap[key]) {
      resultMap[key] = {
        score_display: r.score_display ?? "",
        rx: r.rx ?? false,
        dnf: r.dnf ?? false,
      };
    }
  }

  // Group bookings by class_id
  const bookingsByClass: Record<string, CoachTodayAthlete[]> = {};
  for (const b of bookings ?? []) {
    const profile = b.profiles as unknown as {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
    if (!bookingsByClass[b.class_id]) bookingsByClass[b.class_id] = [];
    bookingsByClass[b.class_id].push({
      id: b.user_id,
      booking_id: b.id,
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      attended: (b as unknown as { attended: boolean | null }).attended ?? null,
      result: resultMap[`${b.class_id}:${b.user_id}`] ?? null,
    });
  }

  return rawClasses.map((c) => {
    const startsAt = new Date(c.starts_at).getTime();
    const endsAt = startsAt + c.duration_minutes * 60_000;
    const status =
      nowMs >= endsAt ? "finished" : nowMs >= startsAt ? "ongoing" : "upcoming";
    const athletes = bookingsByClass[c.id] ?? [];
    const classWods = ((c.wod_ids as string[]) ?? [])
      .map((id) => wodMap[id])
      .filter(Boolean) as CoachTodayWod[];

    return {
      id: c.id,
      name: c.name,
      starts_at: c.starts_at,
      duration_minutes: c.duration_minutes,
      capacity: (c as unknown as { capacity: number }).capacity,
      coach_id: (c as unknown as { coach_id: string | null }).coach_id,
      status,
      wods: classWods,
      athletes,
      results_count: athletes.filter((a) => a.result !== null).length,
    };
  });
}
