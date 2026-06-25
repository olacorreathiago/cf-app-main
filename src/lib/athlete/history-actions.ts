"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface AthleteResultEntry {
  id: string;
  wod_id: string;
  wod_title: string;
  wod_type: string;
  score_type: string;
  is_benchmark: boolean;
  score_display: string | null;
  rx: boolean;
  dnf: boolean;
  sets_data: unknown;
  notes: string | null;
  recorded_at: string;
  is_pr: boolean;
}

export interface AthletePrEntry {
  id: string;
  movement: string;
  value: number;
  unit: string;
  achieved_at: string;
}

export interface AthleteHistoryData {
  results: AthleteResultEntry[];
  prs: AthletePrEntry[];
  activeBoxId: string | null;
}

export async function getAthleteHistory(): Promise<AthleteHistoryData> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("box_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at");

  const allBoxIds = (memberships ?? []).map((m) => m.box_id);
  if (allBoxIds.length === 0) {
    return { results: [], prs: [], activeBoxId: null };
  }

  const cookieStore = await cookies();
  const preferredBoxId = cookieStore.get("athlete_active_box")?.value;
  const activeBoxId =
    (preferredBoxId && allBoxIds.includes(preferredBoxId) ? preferredBoxId : null) ?? allBoxIds[0];

  const { data: rawResults } = await supabase
    .from("wod_results")
    .select("id, wod_id, score_type, score_display, rx, dnf, sets_data, notes, recorded_at, wods(title, type, is_benchmark)")
    .eq("user_id", user.id)
    .eq("box_id", activeBoxId)
    .order("recorded_at", { ascending: false })
    .limit(100);

  const resultIds = (rawResults ?? []).map((r) => r.id);
  let prResultIds = new Set<string>();
  if (resultIds.length > 0) {
    const { data: prRows } = await supabase
      .from("prs")
      .select("wod_result_id")
      .in("wod_result_id", resultIds);
    prResultIds = new Set((prRows ?? []).map((p) => p.wod_result_id).filter(Boolean) as string[]);
  }

  const results: AthleteResultEntry[] = (rawResults ?? []).map((r) => {
    const wod = r.wods as unknown as { title: string; type: string; is_benchmark: boolean } | null;
    return {
      id: r.id,
      wod_id: r.wod_id,
      wod_title: wod?.title ?? "WOD",
      wod_type: wod?.type ?? "Custom",
      score_type: r.score_type,
      is_benchmark: wod?.is_benchmark ?? false,
      score_display: r.score_display,
      rx: r.rx,
      dnf: r.dnf,
      sets_data: r.sets_data,
      notes: r.notes,
      recorded_at: r.recorded_at,
      is_pr: prResultIds.has(r.id),
    };
  });

  const { data: rawPrs } = await supabase
    .from("prs")
    .select("id, movement, value, unit, achieved_at")
    .eq("user_id", user.id)
    .eq("box_id", activeBoxId)
    .order("movement");

  const prs: AthletePrEntry[] = (rawPrs ?? []).map((p) => ({
    id: p.id,
    movement: p.movement,
    value: p.value,
    unit: p.unit,
    achieved_at: p.achieved_at,
  }));

  return { results, prs, activeBoxId };
}
