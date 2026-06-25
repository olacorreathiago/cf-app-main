"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type BookingStatus = "confirmed" | "waitlist" | "cancelled" | null;

export async function bookClass(
  classId: string
): Promise<{ status?: BookingStatus; error?: string }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // Fetch class + box settings
  const { data: cls } = await supabase
    .from("classes")
    .select("id, capacity, box_id, status, starts_at, boxes(settings)")
    .eq("id", classId)
    .single();

  if (!cls) return { error: "Aula não encontrada." };
  if (cls.status !== "scheduled") return { error: "Esta aula não está disponível para reservas." };

  // Enforce booking deadline
  const boxSettings = (cls.boxes as unknown as { settings?: Record<string, unknown> } | null)?.settings ?? {};
  const cutoffHours = typeof boxSettings.cancellation_window_hours === "number"
    ? boxSettings.cancellation_window_hours
    : 1;
  const advanceDays = typeof boxSettings.booking_advance_days === "number"
    ? boxSettings.booking_advance_days
    : 7;
  const maxWaitlist = typeof boxSettings.max_waitlist === "number"
    ? boxSettings.max_waitlist
    : 5;

  const now = new Date();
  const startsAt = new Date(cls.starts_at);
  const hoursUntilClass = (startsAt.getTime() - now.getTime()) / 3_600_000;
  const daysUntilClass = hoursUntilClass / 24;

  if (hoursUntilClass <= cutoffHours) {
    return { error: `Inscrições fechadas — prazo de ${cutoffHours}h antes da aula.` };
  }
  if (daysUntilClass > advanceDays) {
    return { error: `Só podes reservar com ${advanceDays} dias de antecedência.` };
  }

  const counts = await supabase.rpc("get_class_booking_counts", {
    p_class_ids: [classId],
  });
  const count = counts.data?.[0];
  const confirmedCount = count?.confirmed_count ?? 0;
  const waitlistCount = count?.waitlist_count ?? 0;
  const isFull = confirmedCount >= cls.capacity;

  if (isFull) {
    if (maxWaitlist === 0) {
      return { error: "Aula lotada e lista de espera desativada." };
    }
    if (waitlistCount >= maxWaitlist) {
      return { error: "Lista de espera cheia." };
    }
  }

  const bookingStatus: BookingStatus = isFull ? "waitlist" : "confirmed";

  // Upsert: if already exists (cancelled), reactivate; otherwise insert
  const { data: existing } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "confirmed" || existing.status === "waitlist") {
      return { status: existing.status };
    }
    // Reactivate cancelled booking — reset created_at so waitlist queue order reflects
    // when the person actually rejoined, not when they first ever booked this class
    const { error } = await supabase
      .from("bookings")
      .update({ status: bookingStatus, created_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { error: "Erro ao reservar. Tenta novamente." };
  } else {
    const { error } = await supabase
      .from("bookings")
      .insert({ class_id: classId, user_id: user.id, status: bookingStatus });
    if (error) return { error: "Erro ao reservar. Tenta novamente." };
  }

  revalidatePath("/athlete");
  revalidatePath("/athlete/classes");
  return { status: bookingStatus };
}

export async function cancelBooking(
  classId: string
): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // Fetch current booking to know if it was confirmed (triggers waitlist promotion)
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("class_id", classId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!booking) return { error: "Reserva não encontrada." };

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", booking.id);

  if (error) return { error: "Erro ao cancelar. Tenta novamente." };

  // Promote first waitlisted athlete when a confirmed spot is freed
  // Uses admin client to bypass RLS (the promotion targets another user's booking)
  if (booking.status === "confirmed") {
    const { data: next } = await supabase
      .from("bookings")
      .select("id")
      .eq("class_id", classId)
      .eq("status", "waitlist")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (next) {
      await supabaseAdmin
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", next.id);
    }
  }

  revalidatePath("/athlete");
  revalidatePath("/athlete/classes");
  return {};
}
