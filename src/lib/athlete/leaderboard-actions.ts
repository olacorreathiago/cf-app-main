"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  score_display: string;
  score_value: number;
  rx: boolean;
  is_me: boolean;
  // "Tardio" — result was logged/edited on a calendar day after the class.
  // Still ranks and shows here, but must be excluded once scoring/points
  // are computed (points don't exist yet — see the TODO below).
  logged_late: boolean;
}

export interface BenchmarkLeaderboard {
  wod_id: string;
  wod_title: string;
  score_type: string;
  entries_rx: LeaderboardEntry[];
  entries_scaled: LeaderboardEntry[];
}

export interface DailyLeaderboardWod {
  wod_id: string;
  wod_title: string;
  wod_type: string;
  score_type: string;
  description: string | null;
  time_cap_minutes: number | null;
  movements: { name: string; rx_weight?: string | null; scaled_weight?: string | null }[];
  men_rx: LeaderboardEntry[];
  women_rx: LeaderboardEntry[];
  men_scaled: LeaderboardEntry[];
  women_scaled: LeaderboardEntry[];
  all_rx: LeaderboardEntry[];
  all_scaled: LeaderboardEntry[];
}

export interface LeaderboardBenchmarkItem {
  wod_id: string;
  title: string;
  slug: string | null;
  category: string;
}

export interface AthleteLeaderboardData {
  activeBoxId: string;
  myUserId: string;
  /** The athlete's own gender — default selection of the daily leaderboard filter. */
  myGender: "male" | "female" | null;
  benchmarkWods: LeaderboardBenchmarkItem[];
}

export interface BenchmarkLeaderboardData {
  leaderboard: BenchmarkLeaderboard | null;
}

export interface DailyLeaderboardData {
  date: string;
  wods: DailyLeaderboardWod[];
}

function isBetter(scoreType: string, a: number, b: number): boolean {
  return scoreType === "time" ? a < b : a > b;
}

function formatScore(value: number, unit: string): string {
  if (unit === "seconds") {
    const m = Math.floor(value / 60);
    const s = Math.round(value % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${value} ${unit}`;
}

async function resolveBoxAndUser(supabase: Awaited<ReturnType<typeof supabaseServer>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("box_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at");

  const allBoxIds = (memberships ?? []).map((m) => m.box_id);
  if (allBoxIds.length === 0) return { user, activeBoxId: null };

  const cookieStore = await cookies();
  const preferred = cookieStore.get("athlete_active_box")?.value;
  const activeBoxId = (preferred && allBoxIds.includes(preferred) ? preferred : null) ?? allBoxIds[0];
  return { user, activeBoxId };
}

export async function getAthleteLeaderboardData(): Promise<AthleteLeaderboardData> {
  const supabase = await supabaseServer();
  const { user, activeBoxId } = await resolveBoxAndUser(supabase);

  const { data: me } = await supabase.from("profiles").select("gender").eq("id", user.id).maybeSingle();
  const myGender = me?.gender === "male" || me?.gender === "female" ? me.gender : null;

  if (!activeBoxId) return { activeBoxId: "", myUserId: user.id, myGender, benchmarkWods: [] };

  const { data: wods } = await supabase
    .from("wods")
    .select("id, title, benchmark_slug, category")
    .eq("box_id", activeBoxId)
    .eq("is_benchmark", true)
    .not("published_at", "is", null)
    .order("title");

  const benchmarkWods: LeaderboardBenchmarkItem[] = (wods ?? []).map((w) => ({
    wod_id: w.id,
    title: w.title,
    slug: w.benchmark_slug,
    category: w.category ?? "original",
  }));

  return { activeBoxId, myUserId: user.id, myGender, benchmarkWods };
}

export async function getBenchmarkLeaderboard(wodId: string): Promise<BenchmarkLeaderboardData> {
  const supabase = await supabaseServer();
  const { user, activeBoxId } = await resolveBoxAndUser(supabase);
  if (!activeBoxId) return { leaderboard: null };

  const { data: wod } = await supabase
    .from("wods")
    .select("id, title, score_type")
    .eq("id", wodId)
    .single();

  if (!wod) return { leaderboard: null };

  // Best result per user (latest if tied — using recorded_at)
  const { data: allResults } = await supabase
    .from("wod_results")
    .select("id, user_id, score_value, score_display, rx, recorded_at, logged_late")
    .eq("wod_id", wodId)
    .eq("box_id", activeBoxId)
    .eq("dnf", false)
    .not("score_value", "is", null)
    .order("recorded_at", { ascending: false });

  // Only profiles with leaderboard_visible = true
  const userIds = [...new Set((allResults ?? []).map((r) => r.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, full_name, nickname, avatar_url, leaderboard_visible, gender")
        .in("id", userIds)
    : { data: [] };

  const visibleUsers = new Set(
    (profiles ?? [])
      .filter((p) => p.leaderboard_visible !== false && p.gender != null)
      .map((p) => p.id)
  );
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  type ResultRow = { id: string; user_id: string; score_value: number | null; score_display: string | null; rx: boolean; recorded_at: string; logged_late: boolean };
  // Best per user per rx flag
  const bestByUserRx: Record<string, { rx: ResultRow | null; scaled: ResultRow | null }> = {};
  for (const r of allResults ?? []) {
    if (!visibleUsers.has(r.user_id)) continue;
    if (!bestByUserRx[r.user_id]) bestByUserRx[r.user_id] = { rx: null, scaled: null };
    const key = r.rx ? "rx" : "scaled";
    const current = bestByUserRx[r.user_id][key];
    if (!current || isBetter(wod.score_type ?? "reps", r.score_value!, current.score_value!)) {
      bestByUserRx[r.user_id][key] = r;
    }
  }

  function toEntries(flag: "rx" | "scaled"): LeaderboardEntry[] {
    const rows = Object.entries(bestByUserRx)
      .map(([uid, best]) => ({ uid, result: best[flag] }))
      .filter((x): x is { uid: string; result: NonNullable<typeof x.result> } => x.result !== null);

    rows.sort((a, b) =>
      wod!.score_type === "time"
        ? a.result.score_value! - b.result.score_value!
        : b.result.score_value! - a.result.score_value!
    );

    return rows.map((x, i) => {
      const p = profileMap.get(x.uid);
      return {
        rank: i + 1,
        user_id: x.uid,
        display_name: p?.nickname ?? p?.full_name ?? "Atleta",
        avatar_url: p?.avatar_url ?? null,
        score_display: x.result.score_display ?? String(x.result.score_value),
        score_value: x.result.score_value!,
        rx: x.result.rx,
        is_me: x.uid === user.id,
        logged_late: x.result.logged_late,
      };
    });
  }

  return {
    leaderboard: {
      wod_id: wod.id,
      wod_title: wod.title,
      score_type: wod.score_type ?? "reps",
      entries_rx: toEntries("rx"),
      entries_scaled: toEntries("scaled"),
    },
  };
}

export async function getDailyLeaderboard(date: string): Promise<DailyLeaderboardData> {
  const supabase = await supabaseServer();
  const { user, activeBoxId } = await resolveBoxAndUser(supabase);
  if (!activeBoxId) return { date, wods: [] };

  const from = `${date}T00:00:00.000Z`;
  const to = `${date}T23:59:59.999Z`;

  // A result's "date" is the class it belongs to (classes.starts_at), not
  // recorded_at — recorded_at only matters for manual results (no leaderboard)
  // and for detecting "tardio" entries (logged_late, set at write time).
  const { data: dayClasses } = await supabase
    .from("classes")
    .select("id")
    .eq("box_id", activeBoxId)
    .gte("starts_at", from)
    .lte("starts_at", to);

  const classIds = (dayClasses ?? []).map((c) => c.id);
  if (classIds.length === 0) return { date, wods: [] };

  const { data: results } = await supabase
    .from("wod_results")
    .select("id, user_id, wod_id, score_value, score_display, rx, dnf, recorded_at, logged_late")
    .eq("box_id", activeBoxId)
    .in("class_id", classIds)
    .eq("dnf", false)
    .not("score_value", "is", null);

  if (!results || results.length === 0) return { date, wods: [] };

  const wodIds = [...new Set(results.map((r) => r.wod_id))];
  const { data: wods } = await supabase
    .from("wods")
    .select("id, title, type, score_type, description, time_cap_minutes, movements")
    .in("id", wodIds);

  const userIds = [...new Set(results.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, nickname, avatar_url, leaderboard_visible, gender")
    .in("id", userIds);

  const visibleUsers = new Set(
    (profiles ?? [])
      .filter((p) => p.leaderboard_visible !== false && p.gender != null)
      .map((p) => p.id)
  );
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const dailyWods: DailyLeaderboardWod[] = (wods ?? []).map((wod) => {
    const wodResults = results.filter((r) => r.wod_id === wod.id && visibleUsers.has(r.user_id));

    function buildEntries(rx: boolean, gender: string | null): LeaderboardEntry[] {
      const filtered = wodResults.filter((r) => {
        if (r.rx !== rx) return false;
        if (gender === null) return true;
        const p = profileMap.get(r.user_id);
        return (p as { gender?: string | null } | undefined)?.gender === gender;
      });

      // Best result per user (multiple sessions same day)
      // TODO(points): when leaderboard points/scoring are introduced, entries
      // with logged_late === true must be excluded from the points calculation
      // (they still display here with a "tardio" warning — see LeaderboardEntry).
      const bestByUser = new Map<string, typeof filtered[number]>();
      for (const r of filtered) {
        const current = bestByUser.get(r.user_id);
        if (!current || isBetter(wod.score_type ?? "reps", r.score_value!, current.score_value!)) {
          bestByUser.set(r.user_id, r);
        }
      }

      const rows = [...bestByUser.values()];
      rows.sort((a, b) =>
        wod.score_type === "time"
          ? a.score_value! - b.score_value!
          : b.score_value! - a.score_value!
      );
      return rows.map((r, i) => {
        const p = profileMap.get(r.user_id);
        return {
          rank: i + 1,
          user_id: r.user_id,
          display_name: p?.nickname ?? p?.full_name ?? "Atleta",
          avatar_url: p?.avatar_url ?? null,
          score_display: r.score_display ?? String(r.score_value),
          score_value: r.score_value!,
          rx: r.rx,
          is_me: r.user_id === user.id,
          logged_late: r.logged_late,
        };
      });
    }

    return {
      wod_id: wod.id,
      wod_title: wod.title,
      wod_type: wod.type,
      score_type: wod.score_type ?? "reps",
      description: wod.description ?? null,
      time_cap_minutes: wod.time_cap_minutes ?? null,
      movements: (wod.movements as { name: string; rx_weight?: string | null; scaled_weight?: string | null }[]) ?? [],
      men_rx: buildEntries(true, "male"),
      women_rx: buildEntries(true, "female"),
      men_scaled: buildEntries(false, "male"),
      women_scaled: buildEntries(false, "female"),
      all_rx: buildEntries(true, null),
      all_scaled: buildEntries(false, null),
    };
  });

  return { date, wods: dailyWods.filter((w) => w.all_rx.length + w.all_scaled.length > 0) };
}
