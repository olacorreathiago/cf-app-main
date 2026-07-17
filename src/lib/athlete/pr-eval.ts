import type { supabaseServer } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof supabaseServer>>;

export function isBetterScore(unit: string, newValue: number, existingValue: number): boolean {
  // seconds = lower is better; everything else (reps, kg, lb) = higher is better
  if (unit === "seconds") return newValue < existingValue;
  return newValue > existingValue;
}

export function prUnit(scoreType: string, dnf: boolean): string {
  // DNF on a time-based WOD → score is reps completed, not seconds
  if (dnf && scoreType === "time") return "reps";
  if (scoreType === "time") return "seconds";
  if (scoreType === "weight") return "kg";
  return "reps";
}

// ── Shared PR evaluation ───────────────────────────────────────────────────

export async function evaluatePR(
  supabase: Supabase,
  params: {
    userId: string;
    resultId: string;
    classDate: string | null; // starts_at of the class — used as achieved_at on the PR
    wodBenchmarkSlug: string | null;
    wodTitle: string;
    wodIsBenchmark: boolean;
    scoreType: string;
    scoreValue: number;
    rx: boolean;
    dnf: boolean;
    boxId: string | null; // null only for global (benchmark_slug) PRs
  }
): Promise<{ isPR: boolean }> {
  const { userId, resultId, classDate, wodBenchmarkSlug, wodTitle, wodIsBenchmark, scoreType, scoreValue, rx, dnf, boxId } = params;

  const dnfFlag = dnf ?? false;
  const supportsPR = wodIsBenchmark && ["time", "reps", "weight", "round-reps"].includes(scoreType);
  if (!supportsPR) return { isPR: false };

  const unit = prUnit(scoreType, dnfFlag);
  const isGlobal = !!wodBenchmarkSlug;
  const movement = wodBenchmarkSlug ?? wodTitle;
  if (!isGlobal && !boxId) return { isPR: false };

  const baseQuery = supabase
    .from("prs")
    .select("id, value")
    .eq("user_id", userId)
    .eq("unit", unit)
    .eq("rx", rx)
    .eq("movement", movement);

  const scopedQuery = isGlobal
    ? baseQuery.is("box_id", null).eq("benchmark_slug", wodBenchmarkSlug!)
    : baseQuery.eq("box_id", boxId!).is("benchmark_slug", null);

  const { data: existingPR } = await scopedQuery.maybeSingle();

  const achievedAt = classDate ?? new Date().toISOString();
  const prPayload = isGlobal
    ? { user_id: userId, box_id: null as null, benchmark_slug: wodBenchmarkSlug, movement, value: scoreValue, unit, rx, achieved_at: achievedAt, wod_result_id: resultId }
    : { user_id: userId, box_id: boxId, benchmark_slug: null as null, movement, value: scoreValue, unit, rx, achieved_at: achievedAt, wod_result_id: resultId };

  if (!existingPR) {
    const { error } = await supabase.from("prs").insert(prPayload);
    if (error) {
      console.error("[PR insert error]", error.message);
      return { isPR: false };
    }
    return { isPR: true };
  }

  if (isBetterScore(unit, scoreValue, existingPR.value)) {
    const { error } = await supabase.from("prs")
      .update({ value: scoreValue, achieved_at: achievedAt, wod_result_id: resultId })
      .eq("id", existingPR.id);
    if (error) {
      console.error("[PR update error]", error.message);
      return { isPR: false };
    }
    return { isPR: true };
  }

  return { isPR: false };
}
