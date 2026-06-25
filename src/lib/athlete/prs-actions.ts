"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface PrEntry {
  id: string;
  value: number;
  unit: string;
  achieved_at: string;
  score_display: string;
}

export interface BenchmarkWithPr {
  // Identification
  wod_id: string | null;
  slug: string;              // benchmark_slug for global, wod.id for box-custom
  name: string;
  category: string;
  wod_type: string;
  score_type: string | null;
  description: string | null;
  is_global: boolean;        // true = travels with athlete; false = box-scoped
  // PRs
  pr_rx: PrEntry | null;
  pr_scaled: PrEntry | null;
}

export interface ResultHistoryEntry {
  id: string;
  score_display: string | null;
  score_value: number | null;
  rx: boolean;
  dnf: boolean;
  notes: string | null;
  recorded_at: string;
  class_date: string | null; // starts_at of the class — preferred display date
  box_name: string | null;
  is_pr: boolean;
}

export interface AthletePrsData {
  activeBoxId: string;
  benchmarks: BenchmarkWithPr[];
}

function formatPrDisplay(value: number, unit: string): string {
  if (unit === "seconds") {
    const m = Math.floor(value / 60);
    const s = Math.round(value % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (unit === "kg" || unit === "lb") return `${value} ${unit}`;
  return `${value} reps`;
}

async function resolveActiveBoxId(supabase: Awaited<ReturnType<typeof supabaseServer>>, userId: string) {
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

export async function getAthletePrsData(): Promise<AthletePrsData> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeBoxId = await resolveActiveBoxId(supabase, user.id);

  // Suspended/no-box athlete: show global benchmarks only (personal PRs still visible)
  if (!activeBoxId) {
    const { data: allBenchmarkWods } = await supabase
      .from("benchmark_wods")
      .select("slug, name, category, type, description")
      .order("name");
    const globalSlugs = (allBenchmarkWods ?? []).map((b) => b.slug);
    const { data: globalPrs } = globalSlugs.length > 0
      ? await supabase
          .from("prs")
          .select("id, benchmark_slug, value, unit, rx, achieved_at")
          .eq("user_id", user.id)
          .is("box_id", null)
          .in("benchmark_slug", globalSlugs)
      : { data: [] };
    type RxMap = { rx: PrEntry | null; scaled: PrEntry | null };
    const globalPrMap: Record<string, RxMap> = {};
    for (const pr of globalPrs ?? []) {
      const key = pr.benchmark_slug!;
      if (!globalPrMap[key]) globalPrMap[key] = { rx: null, scaled: null };
      const entry: PrEntry = { id: pr.id, value: pr.value, unit: pr.unit, achieved_at: pr.achieved_at, score_display: formatPrDisplay(pr.value, pr.unit) };
      if (pr.rx) globalPrMap[key].rx = entry; else globalPrMap[key].scaled = entry;
    }
    const benchmarks: BenchmarkWithPr[] = (allBenchmarkWods ?? []).map((b) => {
      const prData = globalPrMap[b.slug] ?? { rx: null, scaled: null };
      return { wod_id: null, slug: b.slug, name: b.name, category: b.category ?? "original", wod_type: b.type, score_type: null, description: b.description, is_global: true, pr_rx: prData.rx, pr_scaled: prData.scaled };
    });
    return { activeBoxId: "", benchmarks };
  }

  // ── 1. All global benchmarks (always visible, regardless of box WODs) ──
  const { data: allBenchmarkWods } = await supabase
    .from("benchmark_wods")
    .select("slug, name, category, type, description")
    .order("name");

  // ── 2. Box WODs that are custom benchmarks (no benchmark_slug, is_benchmark=true, published) ──
  const { data: customWods } = await supabase
    .from("wods")
    .select("id, title, type, score_type, description, category")
    .eq("box_id", activeBoxId)
    .eq("is_benchmark", true)
    .is("benchmark_slug", null)
    .not("published_at", "is", null)
    .order("title");

  // ── 3. Fetch athlete's PRs ──
  const globalSlugs = (allBenchmarkWods ?? []).map((b) => b.slug);

  const { data: globalPrs } = globalSlugs.length > 0
    ? await supabase
        .from("prs")
        .select("id, benchmark_slug, value, unit, rx, achieved_at")
        .eq("user_id", user.id)
        .is("box_id", null)
        .in("benchmark_slug", globalSlugs)
    : { data: [] };

  const { data: boxPrs } = await supabase
    .from("prs")
    .select("id, movement, value, unit, rx, achieved_at")
    .eq("user_id", user.id)
    .eq("box_id", activeBoxId)
    .is("benchmark_slug", null);

  // ── 4. Build PR lookup maps ──
  type RxMap = { rx: PrEntry | null; scaled: PrEntry | null };

  const globalPrMap: Record<string, RxMap> = {};
  for (const pr of globalPrs ?? []) {
    const key = pr.benchmark_slug!;
    if (!globalPrMap[key]) globalPrMap[key] = { rx: null, scaled: null };
    const entry: PrEntry = { id: pr.id, value: pr.value, unit: pr.unit, achieved_at: pr.achieved_at, score_display: formatPrDisplay(pr.value, pr.unit) };
    if (pr.rx) globalPrMap[key].rx = entry;
    else globalPrMap[key].scaled = entry;
  }

  const boxPrMap: Record<string, RxMap> = {};
  for (const pr of boxPrs ?? []) {
    const key = pr.movement;
    if (!boxPrMap[key]) boxPrMap[key] = { rx: null, scaled: null };
    const entry: PrEntry = { id: pr.id, value: pr.value, unit: pr.unit, achieved_at: pr.achieved_at, score_display: formatPrDisplay(pr.value, pr.unit) };
    if (pr.rx) boxPrMap[key].rx = entry;
    else boxPrMap[key].scaled = entry;
  }

  // ── 5. Assemble benchmark list ──
  // Find box WODs that link to each benchmark_slug — needed for history lookup and score_type.
  const { data: globalWods } = globalSlugs.length > 0
    ? await supabase
        .from("wods")
        .select("id, benchmark_slug, score_type")
        .eq("box_id", activeBoxId)
        .in("benchmark_slug", globalSlugs)
    : { data: [] };

  const slugToWod = new Map((globalWods ?? []).map((w) => [w.benchmark_slug!, w]));

  const globalBenchmarks: BenchmarkWithPr[] = (allBenchmarkWods ?? []).map((b) => {
    const prData = globalPrMap[b.slug] ?? { rx: null, scaled: null };
    const linkedWod = slugToWod.get(b.slug);
    return {
      wod_id: linkedWod?.id ?? null,
      slug: b.slug,
      name: b.name,
      category: b.category ?? "original",
      wod_type: b.type,
      score_type: linkedWod?.score_type ?? null,
      description: b.description,
      is_global: true,
      pr_rx: prData.rx,
      pr_scaled: prData.scaled,
    };
  });

  const customBenchmarks: BenchmarkWithPr[] = (customWods ?? []).map((w) => {
    const prData = boxPrMap[w.title] ?? { rx: null, scaled: null };
    return {
      wod_id: w.id,
      slug: w.id,
      name: w.title,
      category: w.category ?? "original",
      wod_type: w.type,
      score_type: w.score_type,
      description: w.description,
      is_global: false,
      pr_rx: prData.rx,
      pr_scaled: prData.scaled,
    };
  });

  return { activeBoxId, benchmarks: [...globalBenchmarks, ...customBenchmarks] };
}

export async function getBenchmarkHistory(params: { benchmarkSlug: string } | { wodId: string }): Promise<ResultHistoryEntry[]> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let results;

  const selectFields = "id, class_id, score_display, score_value, rx, dnf, notes, recorded_at, box_id";

  if ("benchmarkSlug" in params) {
    const { data: wods } = await supabase
      .from("wods")
      .select("id")
      .eq("benchmark_slug", params.benchmarkSlug);
    const wodIds = (wods ?? []).map((w) => w.id);
    if (wodIds.length === 0) return [];

    ({ data: results } = await supabase
      .from("wod_results")
      .select(selectFields)
      .eq("user_id", user.id)
      .in("wod_id", wodIds)
      .order("recorded_at", { ascending: false }));
  } else {
    ({ data: results } = await supabase
      .from("wod_results")
      .select(selectFields)
      .eq("user_id", user.id)
      .eq("wod_id", params.wodId)
      .order("recorded_at", { ascending: false }));
  }

  if (!results || results.length === 0) return [];

  // Box names
  const boxIds = [...new Set(results.map((r) => r.box_id).filter(Boolean) as string[])];
  const { data: boxes } = boxIds.length > 0
    ? await supabase.from("boxes").select("id, name").in("id", boxIds)
    : { data: [] };
  const boxNameMap = new Map((boxes ?? []).map((b) => [b.id, b.name]));

  // Class dates — use starts_at as the display date instead of recorded_at
  const classIds = [...new Set(results.map((r) => r.class_id).filter(Boolean) as string[])];
  const { data: classes } = classIds.length > 0
    ? await supabase.from("classes").select("id, starts_at").in("id", classIds)
    : { data: [] };
  const classDateMap = new Map((classes ?? []).map((c) => [c.id, c.starts_at]));

  // Which results are PRs
  const resultIds = results.map((r) => r.id);
  const { data: prRows } = await supabase.from("prs").select("wod_result_id").in("wod_result_id", resultIds);
  const prSet = new Set((prRows ?? []).map((p) => p.wod_result_id).filter(Boolean) as string[]);

  return results.map((r) => ({
    id: r.id,
    score_display: r.score_display,
    score_value: r.score_value,
    rx: r.rx,
    dnf: r.dnf,
    notes: r.notes,
    recorded_at: r.recorded_at,
    class_date: r.class_id ? (classDateMap.get(r.class_id) ?? null) : null,
    box_name: r.box_id ? (boxNameMap.get(r.box_id) ?? null) : null,
    is_pr: prSet.has(r.id),
  }));
}
