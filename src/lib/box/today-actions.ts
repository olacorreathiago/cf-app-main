"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface AvailableMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export async function checkInAthlete(
  bookingId: string,
  attended: boolean | null,
  slug: string
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from("bookings")
    .update({
      attended,
      checked_in_at: attended !== null ? new Date().toISOString() : null,
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };
  revalidatePath(`/box/${slug}/today`);
  return {};
}

export async function getAvailableMembersForClass(
  classId: string,
  boxId: string
): Promise<AvailableMember[]> {
  const [{ data: enrolled }, { data: members }] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select("user_id")
      .eq("class_id", classId)
      .in("status", ["confirmed", "waitlist"]),
    supabaseAdmin
      .from("memberships")
      .select("user_id, profiles(full_name, avatar_url)")
      .eq("box_id", boxId)
      .eq("status", "active"),
  ]);

  const enrolledIds = new Set((enrolled ?? []).map((b) => b.user_id));

  return (members ?? [])
    .filter((m) => !enrolledIds.has(m.user_id))
    .map((m) => {
      const p = m.profiles as unknown as { full_name: string | null; avatar_url: string | null } | null;
      return {
        user_id: m.user_id,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    })
    .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "pt"));
}

export async function addAthleteTodayClass(
  classId: string,
  userId: string,
  slug: string
): Promise<{ error?: string }> {
  const { data: existing } = await supabaseAdmin
    .from("bookings")
    .select("id, status")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "confirmed" || existing.status === "waitlist") return {};
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", existing.id);
    if (error) return { error: "Erro ao adicionar atleta." };
  } else {
    const { error } = await supabaseAdmin
      .from("bookings")
      .insert({ class_id: classId, user_id: userId, status: "confirmed" });
    if (error) return { error: "Erro ao adicionar atleta." };
  }

  revalidatePath(`/box/${slug}/today`);
  return {};
}

export async function removeAthleteTodayClass(
  bookingId: string,
  slug: string
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) return { error: "Erro ao remover atleta." };
  revalidatePath(`/box/${slug}/today`);
  return {};
}
