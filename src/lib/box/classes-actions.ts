"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  specialClassSchema,
  publishClassSchema,
  cancelClassSchema,
  type SpecialClassInput,
  type PublishClassInput,
  type CancelClassInput,
} from "@/schemas/class-instance";
import { addDays, format } from "date-fns";
import type { ClassInstance, ClassTemplate } from "@/types";

async function requireStaffRole(boxId: string) {
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
  return supabase;
}

/**
 * Ensures a class instance exists for a given template + date.
 * Returns the instance id. Creates it (as draft) if it doesn't exist yet.
 */
export async function ensureInstance(
  boxId: string,
  template: Pick<ClassTemplate, "id" | "name" | "duration_minutes" | "capacity">,
  startsAt: string // ISO timestamp
): Promise<{ instanceId: string; error?: string }> {
  try {
    const supabase = await requireStaffRole(boxId);

    // Check if already exists
    const { data: existing } = await supabase
      .from("classes")
      .select("id")
      .eq("template_id", template.id)
      .eq("starts_at", startsAt)
      .maybeSingle();

    if (existing) return { instanceId: existing.id };

    const { data, error } = await supabase
      .from("classes")
      .insert({
        box_id: boxId,
        template_id: template.id,
        name: template.name,
        starts_at: startsAt,
        duration_minutes: template.duration_minutes,
        capacity: template.capacity,
        status: "draft",
        is_special: false,
      })
      .select("id")
      .single();

    if (error) return { instanceId: "", error: error.message };
    return { instanceId: data.id };
  } catch (e) {
    return { instanceId: "", error: (e as Error).message };
  }
}

/**
 * Assigns WODs to all class instances of a given modality on a given date.
 * Replaces the full wod_ids array — caller is responsible for the final list.
 * Creates missing instances (draft) before assigning.
 */
export async function assignModalityWod(
  boxId: string,
  date: string, // yyyy-MM-dd
  modalityName: string,
  wodIds: string[],
  templates: Pick<ClassTemplate, "id" | "name" | "start_time" | "duration_minutes" | "capacity">[]
): Promise<{ error?: string }> {
  try {
    const supabase = await requireStaffRole(boxId);

    // Ensure all template instances exist for this date
    for (const tpl of templates) {
      const startsAt = `${date}T${tpl.start_time}`;
      const { data: existing } = await supabase
        .from("classes")
        .select("id")
        .eq("template_id", tpl.id)
        .eq("starts_at", startsAt)
        .maybeSingle();

      if (!existing) {
        await supabase.from("classes").insert({
          box_id: boxId,
          template_id: tpl.id,
          name: tpl.name,
          starts_at: startsAt,
          duration_minutes: tpl.duration_minutes,
          capacity: tpl.capacity,
          status: "draft",
          is_special: false,
        });
      }
    }

    // Replace wod_ids array on all instances of this modality on this date
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;
    const { error } = await supabase
      .from("classes")
      .update({ wod_ids: wodIds })
      .eq("box_id", boxId)
      .eq("name", modalityName)
      .eq("is_special", false)
      .gte("starts_at", dayStart)
      .lte("starts_at", dayEnd);

    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/classes`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Assigns WODs to a single special class by ID.
 */
export async function assignSpecialClassWod(
  classId: string,
  boxId: string,
  wodIds: string[]
): Promise<{ error?: string }> {
  try {
    const supabase = await requireStaffRole(boxId);
    const { error } = await supabase
      .from("classes")
      .update({ wod_ids: wodIds })
      .eq("id", classId)
      .eq("box_id", boxId)
      .eq("is_special", true);
    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/classes`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function publishClass(
  classId: string,
  boxId: string,
  input: PublishClassInput
): Promise<{ error?: string }> {
  const parsed = publishClassSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const supabase = await requireStaffRole(boxId);
    const { error } = await supabase
      .from("classes")
      .update({
        status: "scheduled",
        coach_id: parsed.data.coach_id,
        capacity: parsed.data.capacity,
      })
      .eq("id", classId)
      .eq("box_id", boxId);

    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/classes`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateClass(
  classId: string,
  boxId: string,
  input: { coach_id: string; capacity: number }
): Promise<{ error?: string }> {
  if (!input.coach_id) return { error: "Selecciona um coach." };
  if (!input.capacity || input.capacity < 1) return { error: "Capacidade inválida." };

  try {
    const supabase = await requireStaffRole(boxId);
    const { error } = await supabase
      .from("classes")
      .update({ coach_id: input.coach_id, capacity: input.capacity })
      .eq("id", classId)
      .eq("box_id", boxId);

    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/classes`, "page");
    revalidatePath(`/box/[slug]/today`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface BulkSlot {
  templateId: string;
  startsAt: string;
  templateData: Pick<ClassTemplate, "id" | "name" | "duration_minutes" | "capacity">;
  instanceId: string | null;
}

export async function bulkPublishClasses(
  boxId: string,
  slots: BulkSlot[],
  coachId: string
): Promise<{ published: number; error?: string }> {
  if (!slots.length) return { published: 0 };

  try {
    const supabase = await requireStaffRole(boxId);
    let published = 0;

    for (const slot of slots) {
      let instanceId = slot.instanceId;

      // Create instance if it doesn't exist yet
      if (!instanceId) {
        const { data: existing } = await supabase
          .from("classes")
          .select("id")
          .eq("template_id", slot.templateId)
          .eq("starts_at", slot.startsAt)
          .maybeSingle();

        if (existing) {
          instanceId = existing.id as string;
        } else {
          // Inherit wod_ids from a sibling class (same name, same day) if one exists
          const dayStart = slot.startsAt.slice(0, 10) + "T00:00:00";
          const dayEnd   = slot.startsAt.slice(0, 10) + "T23:59:59";
          const { data: sibling } = await supabase
            .from("classes")
            .select("wod_ids")
            .eq("box_id", boxId)
            .eq("name", slot.templateData.name)
            .eq("is_special", false)
            .gte("starts_at", dayStart)
            .lte("starts_at", dayEnd)
            .not("wod_ids", "is", null)
            .limit(1)
            .maybeSingle();

          const { data: created, error: insertError } = await supabase
            .from("classes")
            .insert({
              box_id:           boxId,
              template_id:      slot.templateId,
              name:             slot.templateData.name,
              starts_at:        slot.startsAt,
              duration_minutes: slot.templateData.duration_minutes,
              capacity:         slot.templateData.capacity,
              status:           "draft",
              is_special:       false,
              wod_ids:          sibling?.wod_ids ?? [],
            })
            .select("id")
            .single();

          if (insertError || !created) continue;
          instanceId = created.id as string;
        }
      }

      const { error } = await supabase
        .from("classes")
        .update({ status: "scheduled", coach_id: coachId, capacity: slot.templateData.capacity })
        .eq("id", instanceId)
        .eq("box_id", boxId)
        .eq("status", "draft");

      if (!error) published++;
    }

    revalidatePath(`/box/[slug]/classes`, "page");
    return { published };
  } catch (e) {
    return { published: 0, error: (e as Error).message };
  }
}

export async function cancelClass(
  classId: string,
  boxId: string,
  input: CancelClassInput
): Promise<{ error?: string }> {
  const parsed = cancelClassSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const supabase = await requireStaffRole(boxId);
    const { error } = await supabase
      .from("classes")
      .update({
        status: "cancelled",
        cancellation_reason: parsed.data.cancellation_reason,
      })
      .eq("id", classId)
      .eq("box_id", boxId);

    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/classes`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function createSpecialClass(
  boxId: string,
  input: SpecialClassInput
): Promise<{ error?: string }> {
  const parsed = specialClassSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const supabase = await requireStaffRole(boxId);
    const { error } = await supabase.from("classes").insert({
      box_id: boxId,
      template_id: null,
      is_special: true,
      name: parsed.data.name,
      starts_at: `${parsed.data.date}T${parsed.data.start_time}:00`,
      duration_minutes: parsed.data.duration_minutes,
      capacity: parsed.data.capacity,
      coach_id: parsed.data.coach_id ?? null,
      notes: parsed.data.notes ?? null,
      status: "draft",
    });

    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/classes`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
