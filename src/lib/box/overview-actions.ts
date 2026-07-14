"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface OverviewClass {
  id: string;
  name: string;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  confirmed_count: number;
  coach_name: string | null;
  status: "ongoing" | "upcoming" | "finished";
  first_wod_title: string | null;
}

export interface BoxOverviewData {
  todayClasses: OverviewClass[];
  memberCount: number;
  classesThisWeek: number;
  totalWods: number;
}

export async function getBoxOverviewData(boxId: string): Promise<BoxOverviewData> {
  const now = new Date();
  const nowMs = now.getTime();
  const localToday = now.toLocaleDateString("sv");
  const localTomorrow = new Date(nowMs + 86_400_000).toLocaleDateString("sv");

  // Start of current week (Monday)
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const localMonday = new Date(nowMs - daysToMonday * 86_400_000).toLocaleDateString("sv");
  const localNextMonday = new Date(nowMs + (7 - daysToMonday) * 86_400_000).toLocaleDateString("sv");

  const { data: rawClasses } = await supabaseAdmin
    .from("classes")
    .select("id, name, starts_at, duration_minutes, capacity, wod_ids, coach_id")
    .eq("box_id", boxId)
    .gte("starts_at", `${localToday}T00:00:00`)
    .lt("starts_at", `${localTomorrow}T00:00:00`)
    .eq("status", "scheduled")
    .order("starts_at");

  const classIds = (rawClasses ?? []).map((c) => c.id);

  const coachIds = [
    ...new Set((rawClasses ?? []).map((c) => c.coach_id).filter(Boolean) as string[]),
  ];
  const coachMap: Record<string, string> = {};
  if (coachIds.length > 0) {
    const { data: coaches } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", coachIds);
    for (const c of coaches ?? []) {
      if (c.full_name) coachMap[c.id] = c.full_name;
    }
  }

  const confirmedMap: Record<string, number> = {};
  if (classIds.length > 0) {
    const [{ data: bookingRows }, { data: trialRows }] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select("class_id")
        .in("class_id", classIds)
        .eq("status", "confirmed"),
      supabaseAdmin
        .from("trials")
        .select("class_id")
        .in("class_id", classIds)
        .not("status", "in", '("lost","converted")'),
    ]);
    for (const b of bookingRows ?? []) {
      confirmedMap[b.class_id] = (confirmedMap[b.class_id] ?? 0) + 1;
    }
    for (const t of trialRows ?? []) {
      if (t.class_id) confirmedMap[t.class_id] = (confirmedMap[t.class_id] ?? 0) + 1;
    }
  }

  const allWodIds = [
    ...new Set((rawClasses ?? []).flatMap((c) => (c.wod_ids as string[]) ?? [])),
  ];
  const wodTitleMap: Record<string, string> = {};
  if (allWodIds.length > 0) {
    const { data: wods } = await supabaseAdmin
      .from("wods")
      .select("id, title")
      .in("id", allWodIds);
    for (const w of wods ?? []) wodTitleMap[w.id] = w.title;
  }

  const todayClasses: OverviewClass[] = (rawClasses ?? []).map((c) => {
    const startsAt = new Date(c.starts_at).getTime();
    const endsAt = startsAt + c.duration_minutes * 60_000;
    const status =
      nowMs >= endsAt ? "finished" : nowMs >= startsAt ? "ongoing" : "upcoming";
    const wodIds = (c.wod_ids as string[]) ?? [];
    return {
      id: c.id,
      name: c.name,
      starts_at: c.starts_at,
      duration_minutes: c.duration_minutes,
      capacity: c.capacity,
      confirmed_count: confirmedMap[c.id] ?? 0,
      coach_name: c.coach_id ? (coachMap[c.coach_id] ?? null) : null,
      status,
      first_wod_title: wodIds.length > 0 ? (wodTitleMap[wodIds[0]] ?? null) : null,
    };
  });

  const [{ count: memberCount }, { count: classesThisWeek }, { count: totalWods }] =
    await Promise.all([
      supabaseAdmin
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("box_id", boxId)
        .eq("status", "active"),
      supabaseAdmin
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("box_id", boxId)
        .eq("status", "scheduled")
        .gte("starts_at", `${localMonday}T00:00:00`)
        .lt("starts_at", `${localNextMonday}T00:00:00`),
      supabaseAdmin
        .from("wods")
        .select("id", { count: "exact", head: true })
        .eq("box_id", boxId)
        .not("published_at", "is", null),
    ]);

  return {
    todayClasses,
    memberCount: memberCount ?? 0,
    classesThisWeek: classesThisWeek ?? 0,
    totalWods: totalWods ?? 0,
  };
}
