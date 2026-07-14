"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { notifyWaitlistPromoted, notifyAthleteRemoved } from "@/lib/notifications/send";

export interface RosterAttendee {
  booking_id: string;
  user_id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  status: "confirmed" | "waitlist";
  attended: boolean | null;
  checked_in_at: string | null;
}

export interface BoxMemberOption {
  user_id: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

export interface TrialRosterEntry {
  id: string;
  name: string;
}

export interface ClassRoster {
  attendees: RosterAttendee[];
  availableMembers: BoxMemberOption[];
  trials: TrialRosterEntry[];
}

export async function getClassRoster(classId: string, boxId: string): Promise<ClassRoster> {
  const supabase = await supabaseServer();

  // Current bookings (confirmed + waitlist)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, user_id, status, attended, checked_in_at, profiles(full_name, nickname, avatar_url)")
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
      attended: (b as unknown as { attended: boolean | null }).attended ?? null,
      checked_in_at: (b as unknown as { checked_in_at: string | null }).checked_in_at ?? null,
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

  // Trials associados a esta aula
  const { data: trialsData } = await supabaseAdmin
    .from("trials")
    .select("id, name")
    .eq("class_id", classId);

  const trials: TrialRosterEntry[] = (trialsData ?? []).map((t) => ({ id: t.id, name: t.name }));

  return { attendees, availableMembers, trials };
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

  // Fetch current status + removed athlete info before cancelling
  const { data: booking } = await supabase
    .from("bookings")
    .select("status, user_id, classes(name, starts_at, box_id, boxes(name))")
    .eq("id", bookingId)
    .maybeSingle();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) return { error: "Erro ao remover atleta." };

  // Notify the removed athlete
  if (booking?.user_id) {
    const cls = booking.classes as unknown as { name: string; starts_at: string; box_id: string; boxes: { name: string } | null } | null;
    if (cls) {
      const { data: removedProfile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", booking.user_id)
        .maybeSingle();
      if (removedProfile?.email) {
        await notifyAthleteRemoved({
          userId: booking.user_id,
          email: removedProfile.email,
          boxId,
          boxName: cls.boxes?.name ?? "",
          className: cls.name,
          startsAt: cls.starts_at,
        });
      }
    }
  }

  // Promote first waitlisted athlete when a confirmed spot is freed
  if (booking?.status === "confirmed" && opts?.classId) {
    const { data: next } = await supabase
      .from("bookings")
      .select("id, user_id, classes(name, starts_at, box_id, boxes(name))")
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

      // Notify the promoted athlete
      const cls = next.classes as unknown as { name: string; starts_at: string; box_id: string; boxes: { name: string } | null } | null;
      if (cls) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", next.user_id)
          .maybeSingle();
        if (profile?.email) {
          await notifyWaitlistPromoted({
            userId: next.user_id,
            email: profile.email,
            boxId: cls.box_id,
            boxName: cls.boxes?.name ?? "",
            className: cls.name,
            startsAt: cls.starts_at,
          });
        }
      }
    }
  }

  revalidatePath(`/box/${slug}/classes`);
  return {};
}
