"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { boxInfoSchema, boxOperationalSchema, type BoxInfoInput, type BoxOperationalInput } from "@/schemas/box-settings";
import type { BoxSettings } from "@/types";

async function requireManagerRole(boxId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", boxId)
    .in("role", ["owner", "partner"])
    .maybeSingle();

  if (!membership) throw new Error("Sem permissão");
  return supabase;
}

export async function updateBoxInfo(boxId: string, input: BoxInfoInput): Promise<{ error?: string }> {
  const parsed = boxInfoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const supabase = await requireManagerRole(boxId);
    const { error } = await supabase
      .from("boxes")
      .update({
        name: parsed.data.name,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        website: parsed.data.website || null,
        description: parsed.data.description || null,
        logo_url: parsed.data.logo_url || null,
      })
      .eq("id", boxId);

    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/settings`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateBoxOperational(boxId: string, input: BoxOperationalInput): Promise<{ error?: string }> {
  const parsed = boxOperationalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const supabase = await requireManagerRole(boxId);

    // Preserve existing settings keys (e.g. modalities) while updating operational ones
    const { data: current } = await supabase
      .from("boxes")
      .select("settings")
      .eq("id", boxId)
      .single();

    const existing = (current?.settings as BoxSettings) ?? {};
    const settings: BoxSettings = {
      ...existing,
      cancellation_window_hours: parsed.data.cancellation_window_hours,
      booking_advance_days: parsed.data.booking_advance_days,
      default_capacity: parsed.data.default_capacity,
    };

    const { error } = await supabase
      .from("boxes")
      .update({
        drop_in_enabled: parsed.data.drop_in_enabled,
        drop_in_price: parsed.data.drop_in_price ?? null,
        settings,
      })
      .eq("id", boxId);

    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/settings`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateBoxModalities(
  boxId: string,
  modalities: string[]
): Promise<{ error?: string }> {
  if (modalities.length > 30) return { error: "Máximo de 30 modalidades" };

  try {
    const supabase = await requireManagerRole(boxId);

    const { data: current } = await supabase
      .from("boxes")
      .select("settings")
      .eq("id", boxId)
      .single();

    const existing = (current?.settings as BoxSettings) ?? {};
    const { error } = await supabase
      .from("boxes")
      .update({ settings: { ...existing, modalities } })
      .eq("id", boxId);

    if (error) return { error: error.message };
    revalidatePath(`/box/[slug]/settings`, "page");
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}
