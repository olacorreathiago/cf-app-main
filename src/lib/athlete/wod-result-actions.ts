"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { WodResultInput } from "@/schemas/wod-result";

export interface RecordResultResponse {
  error?: string;
  resultId?: string;
  isPR?: boolean;
  prMovement?: string;
}

function isBetterScore(unit: string, newValue: number, existingValue: number): boolean {
  // seconds = lower is better; everything else (reps, kg, lb) = higher is better
  if (unit === "seconds") return newValue < existingValue;
  return newValue > existingValue;
}

function prUnit(scoreType: string, dnf: boolean): string {
  // DNF on a time-based WOD → score is reps completed, not seconds
  if (dnf && scoreType === "time") return "reps";
  if (scoreType === "time") return "seconds";
  if (scoreType === "weight") return "kg";
  return "reps";
}

// ── Shared PR evaluation ───────────────────────────────────────────────────

async function evaluatePR(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
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
    boxId: string;
  }
): Promise<{ isPR: boolean }> {
  const { userId, resultId, classDate, wodBenchmarkSlug, wodTitle, wodIsBenchmark, scoreType, scoreValue, rx, dnf, boxId } = params;

  const dnfFlag = dnf ?? false;
  const supportsPR = wodIsBenchmark && ["time", "reps", "weight", "round-reps"].includes(scoreType);
  if (!supportsPR) return { isPR: false };

  const unit = prUnit(scoreType, dnfFlag);
  const isGlobal = !!wodBenchmarkSlug;
  const movement = wodBenchmarkSlug ?? wodTitle;

  const baseQuery = supabase
    .from("prs")
    .select("id, value")
    .eq("user_id", userId)
    .eq("unit", unit)
    .eq("rx", rx)
    .eq("movement", movement);

  const scopedQuery = isGlobal
    ? baseQuery.is("box_id", null).eq("benchmark_slug", wodBenchmarkSlug!)
    : baseQuery.eq("box_id", boxId).is("benchmark_slug", null);

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

// ── Record new result ──────────────────────────────────────────────────────

export async function recordWodResult(input: WodResultInput): Promise<RecordResultResponse> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: wod } = await supabase
    .from("wods")
    .select("title, benchmark_slug, is_benchmark")
    .eq("id", input.wod_id)
    .single();

  if (!wod) return { error: "WOD não encontrado." };

  const { data: result, error: insertError } = await supabase
    .from("wod_results")
    .insert({
      wod_id:        input.wod_id,
      user_id:       user.id,
      box_id:        input.box_id,
      class_id:      input.class_id ?? null,
      score_type:    input.score_type,
      score_value:   input.score_value,
      score_display: input.score_display,
      rx:            input.rx,
      dnf:           input.dnf ?? false,
      notes:         input.notes ?? null,
      sets_data:     input.sets_data ? JSON.stringify(input.sets_data) : null,
    })
    .select("id")
    .single();

  if (insertError || !result) return { error: "Erro ao guardar resultado. Tenta novamente." };

  // Resolve class date for PR achieved_at
  let classDate: string | null = null;
  if (input.class_id) {
    const { data: cls } = await supabase.from("classes").select("starts_at").eq("id", input.class_id).single();
    classDate = cls?.starts_at ?? null;
  }

  const { isPR } = await evaluatePR(supabase, {
    userId: user.id,
    resultId: result.id,
    classDate,
    wodBenchmarkSlug: wod.benchmark_slug,
    wodTitle: wod.title,
    wodIsBenchmark: wod.is_benchmark,
    scoreType: input.score_type,
    scoreValue: input.score_value ?? 0,
    rx: input.rx ?? true,
    dnf: input.dnf ?? false,
    boxId: input.box_id,
  });

  revalidatePath("/athlete");
  return { resultId: result.id, isPR, prMovement: isPR ? (wod.benchmark_slug ?? wod.title) : undefined };
}

// ── Update existing result ─────────────────────────────────────────────────

export interface UpdateResultInput extends WodResultInput {
  result_id: string;
}

export async function updateWodResult(input: UpdateResultInput): Promise<RecordResultResponse> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // Verify ownership
  const { data: existing } = await supabase
    .from("wod_results")
    .select("id, wod_id")
    .eq("id", input.result_id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return { error: "Resultado não encontrado." };

  const { data: wod } = await supabase
    .from("wods")
    .select("title, benchmark_slug, is_benchmark")
    .eq("id", input.wod_id)
    .single();

  if (!wod) return { error: "WOD não encontrado." };

  const { error: updateError } = await supabase
    .from("wod_results")
    .update({
      score_type:    input.score_type,
      score_value:   input.score_value,
      score_display: input.score_display,
      rx:            input.rx,
      dnf:           input.dnf ?? false,
      notes:         input.notes ?? null,
      sets_data:     input.sets_data ? JSON.stringify(input.sets_data) : null,
    })
    .eq("id", input.result_id);

  if (updateError) return { error: "Erro ao atualizar resultado. Tenta novamente." };

  let classDate: string | null = null;
  if (input.class_id) {
    const { data: cls } = await supabase.from("classes").select("starts_at").eq("id", input.class_id).single();
    classDate = cls?.starts_at ?? null;
  }

  const { isPR } = await evaluatePR(supabase, {
    userId: user.id,
    resultId: input.result_id,
    classDate,
    wodBenchmarkSlug: wod.benchmark_slug,
    wodTitle: wod.title,
    wodIsBenchmark: wod.is_benchmark,
    scoreType: input.score_type,
    scoreValue: input.score_value ?? 0,
    rx: input.rx ?? true,
    dnf: input.dnf ?? false,
    boxId: input.box_id,
  });

  revalidatePath("/athlete");
  return { resultId: input.result_id, isPR, prMovement: isPR ? (wod.benchmark_slug ?? wod.title) : undefined };
}
