"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { markAllRead, markNotificationRead, upsertPreference, listNotifications, getUnreadCount } from "./queries";
import type { NotificationType } from "./send";

export async function checkClassStartingNotifications(boxId: string, userId: string) {
  // Use the same date approach as coach-today-actions: compare as naive local strings
  const now = new Date();
  const localToday = now.toLocaleDateString("sv");   // "YYYY-MM-DD" in server local
  const localTomorrow = new Date(now.getTime() + 86_400_000).toLocaleDateString("sv");

  // All of today's classes where this user is the coach
  const { data: classes } = await supabaseAdmin
    .from("classes")
    .select("id, name, starts_at")
    .eq("box_id", boxId)
    .eq("coach_id", userId)
    .eq("status", "scheduled")
    .gte("starts_at", `${localToday}T00:00:00`)
    .lt("starts_at", `${localTomorrow}T00:00:00`);

  if (!classes?.length) return;

  // Check which ones already have a notification
  const { data: existing } = await supabaseAdmin
    .from("notifications")
    .select("data")
    .eq("user_id", userId)
    .eq("box_id", boxId)
    .eq("type", "class_starting");

  const notifiedClassIds = new Set(
    (existing ?? []).map((n) => (n.data as { class_id?: string } | null)?.class_id).filter(Boolean)
  );

  const toInsert = classes.filter((c) => !notifiedClassIds.has(c.id));
  if (!toInsert.length) return;

  await supabaseAdmin.from("notifications").insert(
    toInsert.map((c) => ({
      user_id: userId,
      box_id: boxId,
      type: "class_starting",
      title: `A aula começou: ${c.name}`,
      body: "Realiza os check-ins dos atletas.",
      data: { class_id: c.id, class_name: c.name, starts_at: c.starts_at },
    }))
  );
}

export async function fetchNotificationsAction(boxId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { notifications: [], unread: 0 };

  // Check if coach has classes starting now (inserts notification if not yet notified)
  await checkClassStartingNotifications(boxId, user.id);

  const [notifications, unread] = await Promise.all([
    listNotifications(boxId),
    getUnreadCount(user.id, boxId),
  ]);
  return { notifications, unread };
}

export async function markAllReadAction(boxId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await markAllRead(user.id, boxId);
}

export async function markReadAction(notificationId: string) {
  await markNotificationRead(notificationId);
}

export async function upsertPrefAction(
  boxId: string,
  type: NotificationType,
  channel: "in_app" | "email",
  value: boolean
) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await upsertPreference(user.id, boxId, type, channel, value);
}
