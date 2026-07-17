"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchWodsForClasses } from "./classes-actions";

export interface AthleteBox {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: string;
  approval_status: string | null;
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
  /** true = presença confirmada, false = falta, null = por marcar */
  my_attended?: boolean | null;
  my_waitlist_position?: number;
  wods?: AthleteDashboardWod[];
}

export interface AthleteDashboardWod {
  id: string;
  /** Class the WOD was resolved from (used to scope the result) */
  class_id?: string | null;
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

export interface AthleteDropIn {
  id: string;
  box_name: string;
  class_name: string;
  starts_at: string;
  status: "pending" | "confirmed" | "cancelled";
  payment_status: "pending" | "paid" | null;
  payment_amount: number | null;
  payment_instructions: string | null;
}

export interface AthleteDashboardData {
  profile: AthleteProfileData;
  activeBox: AthleteBox | null;
  allBoxes: AthleteBox[];
  todayClasses: AthleteDashboardClass[];
  todayWods: AthleteDashboardWod[];
  upcomingClasses: AthleteDashboardClass[];
  recentPrs: AthleteDashboardPr[];
  myDropIns: AthleteDropIn[];
  cutoffHours: number;
  advanceDays: number;
  maxWaitlist: number;
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
    .select("role, box_id, boxes(id, name, slug, logo_url, approval_status, settings)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at");

  const allBoxes: AthleteBox[] = (memberships ?? [])
    .map((m) => {
      const box = m.boxes as unknown as { id: string; name: string; slug: string; logo_url: string | null; approval_status: string | null; settings?: Record<string, unknown> } | null;
      if (!box?.id) return null;
      return { id: box.id, name: box.name, slug: box.slug, logo_url: box.logo_url, role: m.role, approval_status: box.approval_status };
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
  const maxWaitlist =
    typeof boxSettings.max_waitlist === "number"
      ? boxSettings.max_waitlist
      : 5;

  // Fetch upcoming drop-ins for this user (by email OR user_id) — works even without a box
  const myDropIns: AthleteDropIn[] = [];
  const userEmail = (await supabase.from("profiles").select("email").eq("id", user.id).single()).data?.email;
  {
    const todayStr = new Date().toISOString().slice(0, 10);
    // Query by user_id first, then by email as fallback (covers drop-ins created before user_id was set)
    const orFilter = userEmail
      ? `user_id.eq.${user.id},email.eq.${userEmail.toLowerCase()}`
      : `user_id.eq.${user.id}`;
    const { data: dropIns } = await supabaseAdmin
      .from("drop_ins")
      .select("id, status, class_id, box_id, date")
      .or(orFilter)
      .neq("status", "cancelled")
      .gte("date", todayStr)
      .order("date")
      .limit(5);

    if (dropIns && dropIns.length > 0) {
      const classIds = dropIns.map((d) => d.class_id).filter(Boolean) as string[];
      const boxIds = [...new Set(dropIns.map((d) => d.box_id))];
      const dropInIds = dropIns.map((d) => d.id);

      const [classResult, boxResult, paymentResult] = await Promise.all([
        classIds.length > 0
          ? supabaseAdmin.from("classes").select("id, name, starts_at").in("id", classIds)
          : { data: [] },
        supabaseAdmin.from("boxes").select("id, name, payment_instructions").in("id", boxIds),
        supabaseAdmin.from("payments").select("reference_id, status, amount").eq("kind", "drop_in").in("reference_id", dropInIds),
      ]);

      const classMap: Record<string, { name: string; starts_at: string }> = {};
      for (const c of classResult.data ?? []) classMap[c.id] = c;
      const boxMap: Record<string, { name: string; payment_instructions: string | null }> = {};
      for (const b of boxResult.data ?? []) boxMap[b.id] = b;
      const payMap: Record<string, { status: string; amount: number }> = {};
      for (const p of paymentResult.data ?? []) if (p.reference_id) payMap[p.reference_id] = p;

      for (const d of dropIns) {
        const cls = d.class_id ? classMap[d.class_id] : null;
        const box = boxMap[d.box_id];
        const pay = payMap[d.id];
        myDropIns.push({
          id: d.id,
          box_name: box?.name ?? "Box",
          class_name: cls?.name ?? "Aula",
          starts_at: cls?.starts_at ?? `${d.date}T00:00:00`,
          status: d.status as "pending" | "confirmed" | "cancelled",
          payment_status: pay ? (pay.status as "pending" | "paid") : null,
          payment_amount: pay?.amount ?? null,
          payment_instructions: box?.payment_instructions ?? null,
        });
      }
    }
  }

  if (!activeBox) {
    return { profile, activeBox: null, allBoxes, todayClasses: [], todayWods: [], upcomingClasses: [], recentPrs: [], myDropIns, cutoffHours: 1, advanceDays: 7, maxWaitlist: 5, statsWodsThisMonth: 0, statsWodsPrevMonth: 0, statsTotalPrs: 0 };
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

  // User's own bookings for today
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

  // Waitlist positions for today's classes where user is waitlisted
  const todayWaitlistedIds = classIds.filter((id) => myBookingMap[id] === "waitlist");
  const waitlistPositionMap: Record<string, number> = {};
  if (todayWaitlistedIds.length > 0) {
    const { data: posRows } = await supabase.rpc("get_waitlist_positions", {
      p_user_id: user.id,
      p_class_ids: todayWaitlistedIds,
    });
    for (const row of posRows ?? []) {
      waitlistPositionMap[row.class_id] = row.waitlist_pos;
    }
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
    my_attended: myAttendedMap[c.id] ?? null,
    my_waitlist_position: waitlistPositionMap[c.id],
  }));

  // Attach WODs to today's checked-in classes (enables result registration in ClassCard).
  // Requires confirmed check-in (attended = true) — absent athletes get no WOD access.
  const confirmedTodayClasses = todayClasses.filter(
    (c) => c.my_booking_status === "confirmed" && c.my_attended === true
  );
  if (confirmedTodayClasses.length > 0) {
    const wodsByClass = await fetchWodsForClasses(supabase, confirmedTodayClasses, user.id, activeBox.id);
    for (const cls of todayClasses) {
      const wods = wodsByClass.get(cls.id);
      if (wods) cls.wods = wods;
    }
  }

  // Published WODs — only for finished classes with confirmed check-in (attended = true)
  const nowMs = Date.now();
  const attendedTodayIds = new Set(
    todayClasses
      .filter((c) => {
        if (c.my_booking_status !== "confirmed" || c.my_attended !== true) return false;
        const endsAt = new Date(c.starts_at).getTime() + c.duration_minutes * 60_000;
        return nowMs >= endsAt;
      })
      .map((c) => c.id)
  );
  const allWodIds = [...new Set(
    todayClasses.filter((c) => attendedTodayIds.has(c.id)).flatMap((c) => c.wod_ids)
  )];
  // Map each WOD to the attended class it came from (scopes the result to the class)
  const wodClassMap: Record<string, string> = {};
  for (const c of todayClasses) {
    if (!attendedTodayIds.has(c.id)) continue;
    for (const wid of c.wod_ids) {
      if (!wodClassMap[wid]) wodClassMap[wid] = c.id;
    }
  }
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
      class_id: wodClassMap[w.id] ?? null,
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
  if (upcomingClassIds.length > 0) {
    const { data: upcomingTrialRows } = await supabaseAdmin
      .from("trials")
      .select("class_id")
      .in("class_id", upcomingClassIds)
      .not("status", "in", '("lost","converted")');
    for (const t of upcomingTrialRows ?? []) {
      if (t.class_id) {
        if (!upcomingCountMap[t.class_id]) upcomingCountMap[t.class_id] = { confirmed: 0, waitlist: 0 };
        upcomingCountMap[t.class_id].confirmed += 1;
      }
    }
  }
  const { data: upcomingBookings } = upcomingClassIds.length > 0
    ? await supabase.from("bookings").select("class_id, status").eq("user_id", user.id).in("class_id", upcomingClassIds)
    : { data: [] };
  const upcomingBookingMap: Record<string, "confirmed" | "waitlist" | "cancelled"> = {};
  for (const b of upcomingBookings ?? []) { upcomingBookingMap[b.class_id] = b.status as "confirmed" | "waitlist" | "cancelled"; }

  // Waitlist positions for upcoming classes where user is waitlisted
  const upcomingWaitlistedIds = upcomingClassIds.filter((id) => upcomingBookingMap[id] === "waitlist");
  const upcomingWaitlistPositionMap: Record<string, number> = {};
  if (upcomingWaitlistedIds.length > 0) {
    const { data: posRows } = await supabase.rpc("get_waitlist_positions", {
      p_user_id: user.id,
      p_class_ids: upcomingWaitlistedIds,
    });
    for (const row of posRows ?? []) {
      upcomingWaitlistPositionMap[row.class_id] = row.position;
    }
  }

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
      my_waitlist_position: upcomingWaitlistPositionMap[c.id],
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
    myDropIns,
    cutoffHours,
    advanceDays,
    maxWaitlist,
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

