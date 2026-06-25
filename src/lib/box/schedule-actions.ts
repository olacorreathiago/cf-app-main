"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { classTemplateSchema, type ClassTemplateInput } from "@/schemas/class-template";

async function requireScheduleRole(boxId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", boxId)
    .in("role", ["owner", "partner", "manager"])
    .maybeSingle();

  if (!membership) throw new Error("Sem permissão");
  return supabase;
}

export async function createTemplate(
  boxId: string,
  input: ClassTemplateInput
): Promise<{ error?: string }> {
  const parsed = classTemplateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const supabase = await requireScheduleRole(boxId);
    const { error } = await supabase.from("class_templates").insert({
      box_id: boxId,
      ...parsed.data,
    });
    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/schedule`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// Create one template per selected weekday in a single batch insert
export async function createTemplatesForDays(
  boxId: string,
  weekdays: number[],
  input: Omit<ClassTemplateInput, "weekday">
): Promise<{ created: number; error?: string }> {
  if (!weekdays.length) return { created: 0, error: "Selecciona pelo menos um dia" };

  const rows = weekdays.map((weekday) => {
    const parsed = classTemplateSchema.safeParse({ ...input, weekday });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
    return { box_id: boxId, ...parsed.data };
  });

  try {
    const supabase = await requireScheduleRole(boxId);
    const { data, error } = await supabase
      .from("class_templates")
      .insert(rows)
      .select("id");
    if (error) return { created: 0, error: error.message };
    revalidatePath(`/box/[slug]/schedule`, "page");
    return { created: data?.length ?? 0 };
  } catch (e) {
    return { created: 0, error: (e as Error).message };
  }
}

export async function updateTemplate(
  templateId: string,
  boxId: string,
  input: ClassTemplateInput
): Promise<{ error?: string }> {
  const parsed = classTemplateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const supabase = await requireScheduleRole(boxId);
    const { error } = await supabase
      .from("class_templates")
      .update(parsed.data)
      .eq("id", templateId)
      .eq("box_id", boxId);
    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/schedule`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function toggleTemplateActive(
  templateId: string,
  boxId: string,
  active: boolean
): Promise<{ error?: string }> {
  try {
    const supabase = await requireScheduleRole(boxId);
    const { error } = await supabase
      .from("class_templates")
      .update({ active })
      .eq("id", templateId)
      .eq("box_id", boxId);
    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/schedule`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteTemplate(
  templateId: string,
  boxId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await requireScheduleRole(boxId);
    const { error } = await supabase
      .from("class_templates")
      .delete()
      .eq("id", templateId)
      .eq("box_id", boxId);
    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/schedule`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
