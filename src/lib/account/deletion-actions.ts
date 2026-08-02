"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyWaitlistPromoted } from "@/lib/notifications/send";
import { z } from "zod";

export interface AccountDeletionBlockedBox {
  name: string;
  slug: string;
}

const requestSchema = z.object({
  confirmEmail: z.string().email(),
});

// Cancels this user's future confirmed/waitlist bookings across every box,
// freeing the spot and promoting the next waitlisted athlete — same logic
// as the single-booking cancelBooking() in athlete/booking-actions.ts, run
// in batch for account deletion.
async function cancelFutureBookingsForUser(userId: string): Promise<void> {
  const nowIso = new Date().toISOString();

  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("id, class_id, status, classes!inner(starts_at)")
    .eq("user_id", userId)
    .in("status", ["confirmed", "waitlist"])
    .gte("classes.starts_at", nowIso);

  if (!bookings?.length) return;

  const confirmedClassIds = bookings
    .filter((b) => b.status === "confirmed")
    .map((b) => b.class_id);

  await supabaseAdmin
    .from("bookings")
    .update({ status: "cancelled" })
    .in(
      "id",
      bookings.map((b) => b.id)
    );

  for (const classId of confirmedClassIds) {
    const { data: next } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, classes(name, starts_at, box_id, boxes(name))")
      .eq("class_id", classId)
      .eq("status", "waitlist")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!next) continue;

    await supabaseAdmin.from("bookings").update({ status: "confirmed" }).eq("id", next.id);

    const cls = next.classes as unknown as {
      name: string;
      starts_at: string;
      box_id: string;
      boxes: { name: string } | null;
    } | null;
    if (!cls) continue;

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

export async function requestAccountDeletion(input: {
  confirmEmail: string;
}): Promise<{ error?: string; blockedBoxes?: AccountDeletionBlockedBox[] }> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { error: "Email inválido." };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  if (parsed.data.confirmEmail.trim().toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return { error: "O email não corresponde à tua conta." };
  }

  // Blocked while owner of any box that isn't itself closed
  const { data: ownedMemberships } = await supabase
    .from("memberships")
    .select("boxes(name, slug, deleted_at)")
    .eq("user_id", user.id)
    .eq("role", "owner");

  const blockedBoxes: AccountDeletionBlockedBox[] = (ownedMemberships ?? [])
    .map(
      (m) =>
        m.boxes as unknown as { name: string; slug: string; deleted_at: string | null } | null
    )
    .filter((b): b is { name: string; slug: string; deleted_at: string | null } => !!b && !b.deleted_at)
    .map((b) => ({ name: b.name, slug: b.slug }));

  if (blockedBoxes.length > 0) {
    return {
      error: "És owner de boxes ainda ativas. Transfere a propriedade ou encerra a box primeiro.",
      blockedBoxes,
    };
  }

  // Memberships → inactive, preserving prior status (own rows — RLS allows this directly)
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, status")
    .eq("user_id", user.id);

  if (memberships?.length) {
    await Promise.all(
      memberships
        .filter((m) => m.status !== "inactive")
        .map((m) =>
          supabase
            .from("memberships")
            .update({
              status: "inactive",
              status_before: m.status,
              status_before_source: "account_deletion",
            })
            .eq("id", m.id)
        )
    );
  }

  await cancelFutureBookingsForUser(user.id);

  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();

  return {};
}

export async function cancelAccountDeletion(): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("deleted_at")
    .eq("id", user.id)
    .single();
  if (!profile?.deleted_at) return { error: "A tua conta não está agendada para exclusão." };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, status, status_before")
    .eq("user_id", user.id)
    .eq("status_before_source", "account_deletion");

  if (memberships?.length) {
    await Promise.all(
      memberships
        .filter((m) => m.status === "inactive")
        .map((m) =>
          supabase
            .from("memberships")
            .update({
              status: m.status_before ?? "active",
              status_before: null,
              status_before_source: null,
            })
            .eq("id", m.id)
        )
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: null })
    .eq("id", user.id);
  if (error) return { error: error.message };

  return {};
}
