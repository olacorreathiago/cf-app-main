"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface RosterAttendee {
  booking_id: string;
  user_id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  status: "confirmed" | "waitlist";
}

export interface BoxMemberOption {
  user_id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

export interface ClassRoster {
  attendees: RosterAttendee[];
  availableMembers: BoxMemberOption[];
}

export async function getClassRoster(classId: string, boxId: string): Promise<ClassRoster> {
  const supabase = await supabaseServer();

  // Current bookings (confirmed + waitlist)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, user_id, status, profiles(full_name, nickname, avatar_url)")
    .eq("class_id", classId)
    .in("status", ["confirmed", "waitlist"])
    .order("created_at");

  const attendees: RosterAttendee[] = (bookings ?? []).map((b) => {
    const p = b.profiles as unknown as { full_name: string | null; nickname: string | null; avatar_url: string | null } | null;
    return {
      booking_id: b.id,
      user_id: b.user_id,
      full_name: p?.full_name ?? null,
      nickname: p?.nickname ?? null,
      avatar_url: p?.avatar_url ?? null,
      status: b.status as "confirmed" | "waitlist",
    };
  });

  const enrolledIds = new Set(attendees.map((a) => a.user_id));

  // All active members of the box not yet in the class — use admin to bypass RLS
  const { data: memberships } = await supabaseAdmin
    .from("memberships")
    .select("user_id, profiles(full_name, nickname, avatar_url)")
    .eq("box_id", boxId)
    .eq("status", "active")
    .order("user_id");

  const availableMembers: BoxMemberOption[] = (memberships ?? [])
    .filter((m) => !enrolledIds.has(m.user_id))
    .map((m) => {
      const p = m.profiles as unknown as { full_name: string | null; nickname: string | null; avatar_url: string | null } | null;
      return {
        user_id: m.user_id,
        full_name: p?.full_name ?? null,
        nickname: p?.nickname ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });

  return { attendees, availableMembers };
}

export async function addAthleteToClass(
  classId: string,
  userId: string,
  boxId: string,
  slug: string
): Promise<{ error?: string }> {
  const supabase = await supabaseServer();

  // Upsert: if cancelled booking exists, reactivate; otherwise insert
  const { data: existing } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "confirmed" || existing.status === "waitlist") {
      return {}; // already in
    }
    const { error } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", existing.id);
    if (error) return { error: "Erro ao adicionar atleta." };
  } else {
    const { error } = await supabase
      .from("bookings")
      .insert({ class_id: classId, user_id: userId, status: "confirmed" });
    if (error) return { error: "Erro ao adicionar atleta." };
  }

  revalidatePath(`/box/${slug}/classes`);
  return {};
}

export async function getAthleteClassResultCount(
  classId: string,
  userId: string,
  boxId: string
): Promise<{ count: number }> {
  const supabase = await supabaseServer();
  const { count } = await supabase
    .from("wod_results")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("user_id", userId)
    .eq("box_id", boxId);
  return { count: count ?? 0 };
}

export async function removeAthleteFromClass(
  bookingId: string,
  boxId: string,
  slug: string,
  opts?: { classId?: string; userId?: string; deleteResults?: boolean }
): Promise<{ error?: string }> {
  const supabase = await supabaseServer();

  if (opts?.deleteResults && opts.classId && opts.userId) {
    await supabaseAdmin
      .from("wod_results")
      .delete()
      .eq("class_id", opts.classId)
      .eq("user_id", opts.userId)
      .eq("box_id", boxId);
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) return { error: "Erro ao remover atleta." };

  revalidatePath(`/box/${slug}/classes`);
  return {};
}
