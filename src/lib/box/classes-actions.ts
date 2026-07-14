"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
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
import { notifyClassCancelled } from "@/lib/notifications/send";

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

export async function bulkCancelClasses(
  boxId: string,
  classIds: string[],
  reason: string
): Promise<{ cancelled: number; error?: string }> {
  if (!classIds.length) return { cancelled: 0 };
  if (!reason.trim()) return { cancelled: 0, error: "Indica o motivo do cancelamento" };
  try {
    const supabase = await requireStaffRole(boxId);

    // Fetch box name, class info, and confirmed user_ids before cancelling
    const [{ data: box }, { data: classes }, { data: bookings }] = await Promise.all([
      supabase.from("boxes").select("name").eq("id", boxId).single(),
      supabaseAdmin.from("classes").select("id, name, starts_at").in("id", classIds),
      supabaseAdmin
        .from("bookings")
        .select("user_id, class_id")
        .in("class_id", classIds)
        .eq("status", "confirmed"),
    ]);

    const { error } = await supabase
      .from("classes")
      .update({ status: "cancelled", cancellation_reason: reason })
      .in("id", classIds)
      .eq("box_id", boxId)
      .eq("status", "scheduled");
    if (error) return { cancelled: 0, error: error.message };

    // Fire notifications (best-effort, non-blocking)
    if (box && bookings?.length && classes?.length) {
      const userIds = [...new Set(bookings.map((b) => b.user_id))];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      const emailMap = new Map((profiles ?? []).map((p) => [p.id, p.email as string]));
      const classMap = new Map((classes ?? []).map((c) => [c.id, c]));

      await Promise.allSettled(
        bookings.map((b) => {
          const email = emailMap.get(b.user_id);
          const cls = classMap.get(b.class_id);
          if (!email || !cls) return Promise.resolve();
          return notifyClassCancelled({
            userId: b.user_id,
            email,
            boxId,
            boxName: box.name,
            className: cls.name,
            startsAt: cls.starts_at,
            reason,
          });
        })
      );
    }

    revalidatePath(`/box/[slug]/classes`, "page");
    return { cancelled: classIds.length };
  } catch (e) {
    return { cancelled: 0, error: (e as Error).message };
  }
}

export async function bulkUpdateCoach(
  boxId: string,
  classIds: string[],
  coachId: string
): Promise<{ updated: number; error?: string }> {
  if (!classIds.length) return { updated: 0 };
  if (!coachId) return { updated: 0, error: "Selecciona um coach" };
  try {
    const supabase = await requireStaffRole(boxId);
    const { error } = await supabase
      .from("classes")
      .update({ coach_id: coachId })
      .in("id", classIds)
      .eq("box_id", boxId)
      .eq("status", "scheduled");
    if (error) return { updated: 0, error: error.message };
    revalidatePath(`/box/[slug]/classes`, "page");
    revalidatePath(`/box/[slug]/today`, "page");
    return { updated: classIds.length };
  } catch (e) {
    return { updated: 0, error: (e as Error).message };
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

    // Fetch box name, class info, and confirmed user_ids before cancelling
    const [{ data: box }, { data: cls }, { data: bookings }] = await Promise.all([
      supabase.from("boxes").select("name").eq("id", boxId).single(),
      supabase.from("classes").select("name, starts_at").eq("id", classId).single(),
      supabaseAdmin
        .from("bookings")
        .select("user_id")
        .eq("class_id", classId)
        .eq("status", "confirmed"),
    ]);

    const { error } = await supabase
      .from("classes")
      .update({
        status: "cancelled",
        cancellation_reason: parsed.data.cancellation_reason,
      })
      .eq("id", classId)
      .eq("box_id", boxId);

    if (error) return { error: error.message };

    // Fire notifications (best-effort, non-blocking)
    if (box && cls && bookings?.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("id", bookings.map((b) => b.user_id));
      const emailMap = new Map((profiles ?? []).map((p) => [p.id, p.email as string]));

      await Promise.allSettled(
        bookings.map((b) => {
          const email = emailMap.get(b.user_id);
          if (!email) return Promise.resolve();
          return notifyClassCancelled({
            userId: b.user_id,
            email,
            boxId,
            boxName: box.name,
            className: cls.name,
            startsAt: cls.starts_at,
            reason: parsed.data.cancellation_reason,
          });
        })
      );
    }

    revalidatePath(`/box/[slug]/classes`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteSpecialClass(
  classId: string,
  boxId: string
): Promise<{ error?: string }> {
  try {
    const supabase = await requireStaffRole(boxId);

    // Verify it's a special class belonging to this box
    const { data: cls } = await supabase
      .from("classes")
      .select("id, is_special")
      .eq("id", classId)
      .eq("box_id", boxId)
      .eq("is_special", true)
      .maybeSingle();

    if (!cls) return { error: "Aula especial não encontrada." };

    // Delete wod_results, bookings, then the class (admin bypasses RLS for cross-user rows)
    await supabaseAdmin.from("wod_results").delete().eq("class_id", classId);
    await supabaseAdmin.from("bookings").delete().eq("class_id", classId);

    const { error } = await supabaseAdmin
      .from("classes")
      .delete()
      .eq("id", classId);

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
