// Not a server action — no "use server" directive on purpose. This runs the
// step 3 purge (30 days after profiles.deleted_at) and must only ever be
// invoked by a trusted server-side job (cron/edge function), never from a
// client request. Scheduling that job is out of scope for this pass; see
// docs/DELETION_FLOW.md.

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Anonymizes a deleted profile and removes its auth.users row. wod_results,
 * prs, bookings, payments, orders, drop_ins and gamification rows are left
 * untouched — they keep pointing at this now-anonymous profile.
 */
export async function purgeAccount(userId: string): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, deleted_at")
    .eq("id", userId)
    .single();

  if (!profile?.deleted_at) {
    throw new Error("Conta não está marcada para exclusão — purga abortada.");
  }

  const { data: files } = await supabaseAdmin.storage.from("avatars").list(userId);
  if (files?.length) {
    await supabaseAdmin.storage
      .from("avatars")
      .remove(files.map((f) => `${userId}/${f.name}`));
  }

  await supabaseAdmin.from("notifications").delete().eq("user_id", userId);
  await supabaseAdmin.from("notification_preferences").delete().eq("user_id", userId);

  await supabaseAdmin
    .from("profiles")
    .update({
      full_name: "Atleta removido",
      nickname: null,
      phone: null,
      birth_date: null,
      avatar_url: null,
      tax_id: null,
      nationality: null,
      height_cm: null,
      professional_id: null,
      specialty: null,
      training_institution: null,
      emergency_contact: null,
      email: `deleted-${userId}@zekko.invalid`,
    })
    .eq("id", userId);

  // Requires the profiles.id → auth.users(id) FK to have no `on delete cascade`
  // (migration 00044) — otherwise this would cascade and wipe the row just anonymized.
  await supabaseAdmin.auth.admin.deleteUser(userId);
}
