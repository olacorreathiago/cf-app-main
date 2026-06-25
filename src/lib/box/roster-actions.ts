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
): Promise<{ error?: string; status?: "confirmed" | "waitlist" }> {
  const supabase = await supabaseServer();

  // Check current capacity
  const { data: cls } = await supabase
    .from("classes")
    .select("capacity, boxes(settings)")
    .eq("id", classId)
    .single();

  if (!cls) return { error: "Aula não encontrada." };

  const { data: countRows } = await supabase.rpc("get_class_booking_counts", {
    p_class_ids: [classId],
  });
  const counts = countRows?.[0];
  const confirmedCount = counts?.confirmed_count ?? 0;
  const waitlistCount = counts?.waitlist_count ?? 0;
  const isFull = confirmedCount >= cls.capacity;

  const boxSettings = (cls.boxes as unknown as { settings?: Record<string, unknown> } | null)?.settings ?? {};
  const maxWaitlist = typeof boxSettings.max_waitlist === "number" ? boxSettings.max_waitlist : 5;

  let targetStatus: "confirmed" | "waitlist" = "confirmed";
  if (isFull) {
    if (maxWaitlist === 0 || waitlistCount >= maxWaitlist) {
      return { error: "Aula e lista de espera estão cheias." };
    }
    targetStatus = "waitlist";
  }

  // Upsert: if cancelled booking exists, reactivate; otherwise insert
  const { data: existing } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("class_id", classId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "confirmed" || existing.status === "waitlist") {
      return { status: existing.status }; // already in
    }
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ status: targetStatus, created_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { error: "Erro ao adicionar atleta." };
  } else {
    const { error } = await supabaseAdmin
      .from("bookings")
      .insert({ class_id: classId, user_id: userId, status: targetStatus });
    if (error) return { error: "Erro ao adicionar atleta." };
  }

  revalidatePath(`/box/${slug}/classes`);
  return { status: targetStatus };
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

  // Fetch current status before cancelling to decide on waitlist promotion
  const { data: booking } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .maybeSingle();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) return { error: "Erro ao remover atleta." };

  // Promote first waitlisted athlete when a confirmed spot is freed
  if (booking?.status === "confirmed" && opts?.classId) {
    const { data: next } = await supabase
      .from("bookings")
      .select("id")
      .eq("class_id", opts.classId)
      .eq("status", "waitlist")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (next) {
      await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", next.id);
    }
  }

  revalidatePath(`/box/${slug}/classes`);
  return {};
}
