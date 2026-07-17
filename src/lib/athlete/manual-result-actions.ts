"use server";

import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { evaluatePR } from "./pr-eval";

// Manual benchmark results — achieved outside a class (e.g. Karen done at home).
// Global benchmark: stored with benchmark_slug, no box/class. Box-custom
// benchmark: stored against the wod, no class.

const manualResultSchema = z
  .object({
    benchmark_slug: z.string().min(1).optional(),
    wod_id:         z.string().uuid().optional(),
    score_type:     z.enum(["time", "reps", "weight"]),
    score_value:    z.number().positive(),
    score_display:  z.string().min(1).max(60),
    rx:             z.boolean(),
    achieved_on:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes:          z.string().max(500).optional(),
  })
  .refine((d) => !!d.benchmark_slug !== !!d.wod_id, {
    message: "Indica um benchmark global ou um WOD da box (apenas um).",
  });

export type ManualResultInput = z.infer<typeof manualResultSchema>;

export interface ManualResultResponse {
  error?: string;
  resultId?: string;
  isPR?: boolean;
}

export async function recordManualBenchmarkResult(rawInput: ManualResultInput): Promise<ManualResultResponse> {
  const parsed = manualResultSchema.safeParse(rawInput);
  if (!parsed.success) return { error: "Dados inválidos. Verifica o formulário." };
  const input = parsed.data;

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // No future records
  const achievedAt = `${input.achieved_on}T12:00:00.000Z`;
  if (new Date(achievedAt).getTime() > Date.now() + 86_400_000) {
    return { error: "A data não pode ser no futuro." };
  }

  let benchmarkSlug: string | null = null;
  let wodTitle: string;
  let boxId: string | null = null;

  if (input.benchmark_slug) {
    const { data: benchmark } = await supabase
      .from("benchmark_wods")
      .select("slug, name")
      .eq("slug", input.benchmark_slug)
      .maybeSingle();
    if (!benchmark) return { error: "Benchmark não encontrado." };
    benchmarkSlug = benchmark.slug;
    wodTitle = benchmark.name;
  } else {
    const { data: wod } = await supabase
      .from("wods")
      .select("id, title, box_id, is_benchmark, benchmark_slug")
      .eq("id", input.wod_id!)
      .maybeSingle();
    if (!wod) return { error: "WOD não encontrado." };
    if (!wod.is_benchmark) return { error: "Este WOD não é um benchmark." };
    // A box WOD linked to a global benchmark records against the global scope
    benchmarkSlug = wod.benchmark_slug ?? null;
    wodTitle = wod.title;
    boxId = benchmarkSlug ? null : wod.box_id;
  }

  const { data: result, error: insertError } = await supabase
    .from("wod_results")
    .insert({
      wod_id:         input.wod_id ?? null,
      benchmark_slug: benchmarkSlug,
      user_id:        user.id,
      box_id:         boxId,
      class_id:       null,
      is_manual:      true,
      score_type:     input.score_type,
      score_value:    input.score_value,
      score_display:  input.score_display,
      rx:             input.rx,
      dnf:            false,
      notes:          input.notes ?? null,
      recorded_at:    achievedAt,
    })
    .select("id")
    .single();

  if (insertError || !result) {
    console.error("[manual result insert error]", insertError?.message);
    return { error: "Erro ao guardar o registo. Tenta novamente." };
  }

  const { isPR } = await evaluatePR(supabase, {
    userId: user.id,
    resultId: result.id,
    classDate: achievedAt,
    wodBenchmarkSlug: benchmarkSlug,
    wodTitle,
    wodIsBenchmark: true,
    scoreType: input.score_type,
    scoreValue: input.score_value,
    rx: input.rx,
    dnf: false,
    boxId,
  });

  revalidatePath("/athlete/prs");
  revalidatePath("/athlete");
  return { resultId: result.id, isPR };
}
