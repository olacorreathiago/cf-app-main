"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchWodsForClasses } from "./classes-actions";

export interface AthleteBox {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: string;
}

export interface AthleteDashboardClass {
  id: string;
  name: string;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  wod_ids: string[];
  coach_name: string | null;
  confirmed_count: number;
  waitlist_count: number;
  my_booking_status: "confirmed" | "waitlist" | "cancelled" | null;
  wods?: AthleteDashboardWod[];
}

export interface AthleteDashboardWod {
  id: string;
  title: string;
  type: string;
  category: string;
  score_type: string;
  description: string | null;
  movements: { name: string; video_url?: string; rx_weight?: string; scaled_weight?: string }[];
  time_cap_minutes: number | null;
  scaling_notes: string | null;
  result_sets: number | null;
  result_reps_per_set: number | null;
  my_result: { id: string; score_display: string; rx: boolean; is_pr: boolean } | null;
}

export interface AthleteDashboardPr {
  id: string;
  movement: string;
  value: number;
  unit: string;
  achieved_at: string;
}

export interface AthleteProfileData {
  id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  phone: string | null;
  birth_date: string | null;
  emergency_contact: string | null;
  profile_type: string;
}

export interface AthleteDashboardData {
  profile: AthleteProfileData;
  activeBox: AthleteBox | null;
  allBoxes: AthleteBox[];
  todayClasses: AthleteDashboardClass[];
  todayWods: AthleteDashboardWod[];
  upcomingClasses: AthleteDashboardClass[];
  recentPrs: AthleteDashboardPr[];
  cutoffHours: number;
  advanceDays: number;
  statsWodsThisMonth: number;
  statsWodsPrevMonth: number;
  statsTotalPrs: number;
}

export async function getAthleteDashboardData(): Promise<AthleteDashboardData> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, nickname, avatar_url, phone, birth_date, emergency_contact, profile_type")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding/role");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, box_id, boxes(id, name, slug, logo_url, settings)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at");

  const allBoxes: AthleteBox[] = (memberships ?? [])
    .map((m) => {
      const box = m.boxes as unknown as { id: string; name: string; slug: string; logo_url: string | null; settings?: Record<string, unknown> } | null;
      if (!box?.id) return null;
      return { id: box.id, name: box.name, slug: box.slug, logo_url: box.logo_url, role: m.role };
    })
    .filter((b): b is AthleteBox => b !== null);

  // Resolve active box: cookie preference or first membership
  const cookieStore = await cookies();
  const preferredBoxId = cookieStore.get("athlete_active_box")?.value;
  const activeBox =
    (preferredBoxId ? allBoxes.find((b) => b.id === preferredBoxId) : null) ?? allBoxes[0] ?? null;

  // Box settings for booking cutoff
  const activeBoxSettings = (memberships ?? [])
    .map((m) => {
      const box = m.boxes as unknown as { id: string; settings?: Record<string, unknown> } | null;
      return box;
    })
    .find((b) => b?.id === (activeBox?.id));
  const boxSettings = activeBoxSettings?.settings ?? {};
  const cutoffHours =
    typeof boxSettings.cancellation_window_hours === "number"
      ? boxSettings.cancellation_window_hours
      : 1;
  const advanceDays =
    typeof boxSettings.booking_advance_days === "number"
      ? boxSettings.booking_advance_days
      : 7;

  if (!activeBox) {
    return { profile, activeBox: null, allBoxes, todayClasses: [], todayWods: [], upcomingClasses: [], recentPrs: [], cutoffHours: 1, advanceDays: 7, statsWodsThisMonth: 0, statsWodsPrevMonth: 0, statsTotalPrs: 0 };
  }

  // Today's scheduled classes — use local date string to avoid UTC offset shifting the day boundary
  const localToday = new Date().toLocaleDateString("sv"); // "yyyy-MM-dd" in local time
  const localTomorrow = new Date(new Date().getTime() + 86_400_000).toLocaleDateString("sv");

  const { data: rawClasses } = await supabase
    .from("classes")
    .select("id, name, starts_at, duration_minutes, capacity, wod_ids, coach_id")
    .eq("box_id", activeBox.id)
    .eq("status", "scheduled")
    .gte("starts_at", `${localToday}T00:00:00`)
    .lt("starts_at", `${localTomorrow}T00:00:00`)
    .order("starts_at");

  const coachIds = [
    ...new Set((rawClasses ?? []).map((c) => c.coach_id).filter(Boolean) as string[]),
  ];
  const coachMap: Record<string, string> = {};
  if (coachIds.length > 0) {
    const { data: coaches } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", coachIds);
    for (const c of coaches ?? []) {
      if (c.full_name) coachMap[c.id] = c.full_name;
    }
  }

  const classIds = (rawClasses ?? []).map((c) => c.id);

  // Booking counts (SECURITY DEFINER fn bypasses RLS — returns aggregate only)
  const { data: countRows } = await supabase.rpc("get_class_booking_counts", {
    p_class_ids: classIds,
  });
  const countMap: Record<string, { confirmed: number; waitlist: number }> = {};
  for (const row of countRows ?? []) {
    countMap[row.class_id] = {
      confirmed: row.confirmed_count ?? 0,
      waitlist: row.waitlist_count ?? 0,
    };
  }

  // User's own bookings for today
  const { data: myBookings } = classIds.length > 0
    ? await supabase
        .from("bookings")
        .select("class_id, status")
        .eq("user_id", user.id)
        .in("class_id", classIds)
    : { data: [] };
  const myBookingMap: Record<string, "confirmed" | "waitlist" | "cancelled"> = {};
  for (const b of myBookings ?? []) {
    myBookingMap[b.class_id] = b.status as "confirmed" | "waitlist" | "cancelled";
  }

  const todayClasses: AthleteDashboardClass[] = (rawClasses ?? []).map((c) => ({
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
  }));

  // Attach WODs to today's confirmed classes (enables result registration in ClassCard)
  const confirmedTodayClasses = todayClasses.filter((c) => c.my_booking_status === "confirmed");
  if (confirmedTodayClasses.length > 0) {
    const wodsByClass = await fetchWodsForClasses(supabase, confirmedTodayClasses, user.id, activeBox.id);
    for (const cls of todayClasses) {
      const wods = wodsByClass.get(cls.id);
      if (wods) cls.wods = wods;
    }
  }

  // Published WODs — only for classes that are already finished AND have a confirmed booking
  const nowMs = Date.now();
  const attendedTodayIds = new Set(
    todayClasses
      .filter((c) => {
        if (c.my_booking_status !== "confirmed") return false;
        const endsAt = new Date(c.starts_at).getTime() + c.duration_minutes * 60_000;
        return nowMs >= endsAt;
      })
      .map((c) => c.id)
  );
  const allWodIds = [...new Set(
    todayClasses.filter((c) => attendedTodayIds.has(c.id)).flatMap((c) => c.wod_ids)
  )];
  let todayWods: AthleteDashboardWod[] = [];
  if (allWodIds.length > 0) {
    const { data: wods } = await supabase
      .from("wods")
      .select("id, title, type, category, score_type, description, movements, time_cap_minutes, scaling_notes, result_sets, result_reps_per_set, published_at")
      .in("id", allWodIds)
      .not("published_at", "is", null);

    // Fetch user's existing results for these WODs (today)
    const todayIso = new Date().toISOString().slice(0, 10);
    const { data: myResults } = await supabase
      .from("wod_results")
      .select("id, wod_id, score_display, rx")
      .eq("user_id", user.id)
      .eq("box_id", activeBox.id)
      .in("wod_id", allWodIds)
      .gte("recorded_at", `${todayIso}T00:00:00.000Z`)
      .lte("recorded_at", `${todayIso}T23:59:59.999Z`);
    const myResultMap: Record<string, { id: string; score_display: string; rx: boolean; is_pr: boolean }> = {};
    for (const r of myResults ?? []) {
      myResultMap[r.wod_id] = { id: r.id, score_display: r.score_display ?? "", rx: r.rx, is_pr: false };
    }

    // Check which results are PRs
    const resultIds = (myResults ?? []).map((r) => r.id);
    if (resultIds.length > 0) {
      const { data: prRows } = await supabase
        .from("prs")
        .select("wod_result_id")
        .in("wod_result_id", resultIds);
      const prResultIds = new Set((prRows ?? []).map((p) => p.wod_result_id));
      for (const r of myResults ?? []) {
        if (prResultIds.has(r.id)) myResultMap[r.wod_id].is_pr = true;
      }
    }

    todayWods = (wods ?? []).map((w) => ({
      id: w.id,
      title: w.title,
      type: w.type,
      category: w.category,
      score_type: w.score_type ?? "reps",
      description: w.description,
      movements: (w.movements as AthleteDashboardWod["movements"]) ?? [],
      time_cap_minutes: w.time_cap_minutes,
      scaling_notes: w.scaling_notes,
      result_sets: w.result_sets ?? null,
      result_reps_per_set: w.result_reps_per_set ?? null,
      my_result: myResultMap[w.id] ?? null,
    }));
  }

  // Upcoming classes — next 7 days (excluding today)
  const localIn8Days = new Date(new Date().getTime() + 8 * 86_400_000).toLocaleDateString("sv");

  const { data: rawUpcoming } = await supabase
    .from("classes")
    .select("id, name, starts_at, duration_minutes, capacity, wod_ids, coach_id")
    .eq("box_id", activeBox.id)
    .eq("status", "scheduled")
    .gte("starts_at", `${localTomorrow}T00:00:00`)
    .lt("starts_at", `${localIn8Days}T00:00:00`)
    .order("starts_at");

  const upcomingClassIds = (rawUpcoming ?? []).map((c) => c.id);
  const upcomingCoachIds = [...new Set((rawUpcoming ?? []).map((c) => c.coach_id).filter(Boolean) as string[])];
  const upcomingCoachMap: Record<string, string> = {};
  if (upcomingCoachIds.length > 0) {
    const { data: coaches } = await supabase.from("profiles").select("id, full_name").in("id", upcomingCoachIds);
    for (const c of coaches ?? []) { if (c.full_name) upcomingCoachMap[c.id] = c.full_name; }
  }
  const { data: upcomingCountRows } = upcomingClassIds.length > 0
    ? await supabase.rpc("get_class_booking_counts", { p_class_ids: upcomingClassIds })
    : { data: [] };
  const upcomingCountMap: Record<string, { confirmed: number; waitlist: number }> = {};
  for (const row of upcomingCountRows ?? []) {
    upcomingCountMap[row.class_id] = { confirmed: row.confirmed_count ?? 0, waitlist: row.waitlist_count ?? 0 };
  }
  const { data: upcomingBookings } = upcomingClassIds.length > 0
    ? await supabase.from("bookings").select("class_id, status").eq("user_id", user.id).in("class_id", upcomingClassIds)
    : { data: [] };
  const upcomingBookingMap: Record<string, "confirmed" | "waitlist" | "cancelled"> = {};
  for (const b of upcomingBookings ?? []) { upcomingBookingMap[b.class_id] = b.status as "confirmed" | "waitlist" | "cancelled"; }

  const upcomingClasses: AthleteDashboardClass[] = (rawUpcoming ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      starts_at: c.starts_at,
      duration_minutes: c.duration_minutes,
      capacity: c.capacity,
      wod_ids: (c.wod_ids as string[]) ?? [],
      coach_name: c.coach_id ? (upcomingCoachMap[c.coach_id] ?? null) : null,
      confirmed_count: upcomingCountMap[c.id]?.confirmed ?? 0,
      waitlist_count: upcomingCountMap[c.id]?.waitlist ?? 0,
      my_booking_status: upcomingBookingMap[c.id] ?? null,
    }))
    .filter((c) => c.my_booking_status === "confirmed" || c.my_booking_status === "waitlist");

  // PRs das últimas 2 semanas
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const { data: recentPrs } = await supabase
    .from("prs")
    .select("id, movement, value, unit, achieved_at")
    .eq("user_id", user.id)
    .eq("box_id", activeBox.id)
    .gte("achieved_at", twoWeeksAgo.toISOString())
    .order("achieved_at", { ascending: false });

  // Stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [{ count: wodsCount }, { count: wodsPrevCount }, { count: prsCount }] = await Promise.all([
    supabase
      .from("wod_results")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("box_id", activeBox.id)
      .gte("recorded_at", monthStart.toISOString()),
    supabase
      .from("wod_results")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("box_id", activeBox.id)
      .gte("recorded_at", prevMonthStart.toISOString())
      .lte("recorded_at", prevMonthEnd.toISOString()),
    supabase
      .from("prs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("box_id", activeBox.id),
  ]);

  return {
    profile,
    activeBox,
    allBoxes,
    todayClasses,
    todayWods,
    upcomingClasses,
    cutoffHours,
    advanceDays,
    statsWodsThisMonth: wodsCount ?? 0,
    statsWodsPrevMonth: wodsPrevCount ?? 0,
    statsTotalPrs: prsCount ?? 0,
    recentPrs: (recentPrs ?? []).map((p) => ({
      id: p.id,
      movement: p.movement,
      value: p.value,
      unit: p.unit,
      achieved_at: p.achieved_at,
    })),
  };
}

