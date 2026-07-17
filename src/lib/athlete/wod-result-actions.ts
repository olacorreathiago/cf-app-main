"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { evaluatePR } from "./pr-eval";
import type { WodResultInput } from "@/schemas/wod-result";

export interface RecordResultResponse {
  error?: string;
  resultId?: string;
  isPR?: boolean;
  prMovement?: string;
}

// ── Check-in enforcement ───────────────────────────────────────────────────
// An athlete may only register a class result if the coach confirmed their
// presence (bookings.attended = true). Absent / unmarked athletes are blocked.

const NO_CHECKIN_ERROR = "Sem check-in confirmado nesta aula — pede ao coach para marcar a tua presença.";

async function hasConfirmedCheckin(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  userId: string,
  params: { classId: string | null; wodId: string; boxId: string }
): Promise<boolean> {
  const { classId, wodId, boxId } = params;

  // Resolve the classes this result can belong to
  let classIds: string[];
  if (classId) {
    classIds = [classId];
  } else {
    // Legacy path (no class_id): any class of the box containing this WOD
    const { data: classes } = await supabase
      .from("classes")
      .select("id")
      .eq("box_id", boxId)
      .contains("wod_ids", [wodId]);
    classIds = (classes ?? []).map((c) => c.id);
    if (classIds.length === 0) return false;
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("class_id, status, attended")
    .eq("user_id", userId)
    .in("class_id", classIds);

  return (bookings ?? []).some((b) => b.status === "confirmed" && b.attended === true);
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

  const checkedIn = await hasConfirmedCheckin(supabase, user.id, {
    classId: input.class_id ?? null,
    wodId: input.wod_id,
    boxId: input.box_id,
  });
  if (!checkedIn) return { error: NO_CHECKIN_ERROR };

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

  const checkedIn = await hasConfirmedCheckin(supabase, user.id, {
    classId: input.class_id ?? null,
    wodId: input.wod_id,
    boxId: input.box_id,
  });
  if (!checkedIn) return { error: NO_CHECKIN_ERROR };

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
