"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { wodSchema, wodResultSchema, type WodInput, type WodResultInput } from "@/schemas/wod";
import type { BenchmarkWod, Wod } from "@/types";

async function requireWodRole(boxId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", boxId)
    .in("role", ["owner", "partner", "manager", "coach"])
    .maybeSingle();

  if (!membership) throw new Error("Sem permissão");
  return { supabase, userId: user.id };
}

// ---------------------------------------------------------------------------
// Benchmark library
// ---------------------------------------------------------------------------

export async function getBenchmarkWods(): Promise<BenchmarkWod[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("benchmark_wods")
    .select("*")
    .order("category")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as BenchmarkWod[];
}

// ---------------------------------------------------------------------------
// WOD CRUD
// ---------------------------------------------------------------------------

export async function getWods(boxId: string): Promise<Wod[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("wods")
    .select("*, profiles(full_name, nickname)")
    .eq("box_id", boxId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((w) => {
    const profile = w.profiles as { full_name: string | null; nickname: string | null } | null;
    const { profiles: _, ...wod } = w;
    return {
      ...wod,
      creator_name: profile?.nickname ?? profile?.full_name ?? null,
    } as Wod;
  });
}

export async function getWod(wodId: string): Promise<Wod | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("wods")
    .select("*")
    .eq("id", wodId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Wod | null;
}

export async function createWod(
  boxId: string,
  input: WodInput
): Promise<{ id?: string; error?: string }> {
  const parsed = wodSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const { supabase, userId } = await requireWodRole(boxId);
    const { data, error } = await supabase
      .from("wods")
      .insert({ box_id: boxId, created_by: userId, ...parsed.data })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/wods`, "page");
    return { id: data.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateWod(
  wodId: string,
  boxId: string,
  input: WodInput
): Promise<{ error?: string }> {
  const parsed = wodSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const { supabase } = await requireWodRole(boxId);
    const { error } = await supabase
      .from("wods")
      .update(parsed.data)
      .eq("id", wodId)
      .eq("box_id", boxId);
    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/wods`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function duplicateWod(
  wodId: string,
  boxId: string
): Promise<{ id?: string; error?: string }> {
  try {
    const { supabase, userId } = await requireWodRole(boxId);

    const { data: source, error: fetchError } = await supabase
      .from("wods")
      .select("*")
      .eq("id", wodId)
      .eq("box_id", boxId)
      .single();

    if (fetchError || !source) return { error: fetchError?.message ?? "WOD não encontrado" };

    const { data, error } = await supabase
      .from("wods")
      .insert({
        box_id:           boxId,
        created_by:       userId,
        title:            `${source.title} (cópia)`,
        type:             source.type,
        category:         source.category,
        benchmark_slug:   source.benchmark_slug,
        description:      source.description,
        time_cap_minutes: source.time_cap_minutes,
        movements:        source.movements,
        scaling_notes:         source.scaling_notes,
        score_type:            source.score_type,
        result_sets:           source.result_sets,
        result_reps_per_set:   source.result_reps_per_set,
        scheduled_for:         null,
        published_at:          null,   // always starts as draft
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/wods`, "page");
    return { id: data.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteWod(
  wodId: string,
  boxId: string
): Promise<{ error?: string }> {
  try {
    const { supabase } = await requireWodRole(boxId);
    const { error } = await supabase
      .from("wods")
      .delete()
      .eq("id", wodId)
      .eq("box_id", boxId);
    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/wods`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function publishWod(
  wodId: string,
  boxId: string
): Promise<{ error?: string }> {
  try {
    const { supabase } = await requireWodRole(boxId);
    const { error } = await supabase
      .from("wods")
      .update({ published_at: new Date().toISOString() })
      .eq("id", wodId)
      .eq("box_id", boxId)
      .is("published_at", null);
    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/wods`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function unpublishWod(
  wodId: string,
  boxId: string
): Promise<{ error?: string }> {
  try {
    const { supabase } = await requireWodRole(boxId);
    const { error } = await supabase
      .from("wods")
      .update({ published_at: null })
      .eq("id", wodId)
      .eq("box_id", boxId);
    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/wods`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// WOD Results
// ---------------------------------------------------------------------------

export async function recordWodResult(
  boxId: string,
  input: WodResultInput
): Promise<{ id?: string; error?: string }> {
  const parsed = wodResultSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data, error } = await supabase
      .from("wod_results")
      .insert({ ...parsed.data, user_id: user.id, box_id: boxId })
      .select("id")
      .single();
    if (error) return { error: error.message };

    revalidatePath(`/box/[slug]/wods`, "page");
    return { id: data.id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
