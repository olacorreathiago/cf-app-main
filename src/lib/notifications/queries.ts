"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { NotificationType } from "./send";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, string> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreference {
  type: NotificationType;
  in_app: boolean;
  email: boolean;
}

const ALL_TYPES: NotificationType[] = ["class_cancelled", "waitlist_promoted", "new_post", "athlete_removed"];

export async function getUnreadCount(userId: string, boxId: string): Promise<number> {
  const supabase = await supabaseServer();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("box_id", boxId)
    .is("read_at", null);
  return count ?? 0;
}

export async function listNotifications(boxId: string): Promise<Notification[]> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, data, read_at, created_at")
    .eq("box_id", boxId)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []) as Notification[];
}

export async function markAllRead(userId: string, boxId: string): Promise<void> {
  await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("box_id", boxId)
    .is("read_at", null);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabaseAdmin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);
}

export async function getPreferences(
  userId: string,
  boxId: string
): Promise<NotificationPreference[]> {
  const { data } = await supabaseAdmin
    .from("notification_preferences")
    .select("type, in_app, email")
    .eq("user_id", userId)
    .eq("box_id", boxId);

  const saved = new Map((data ?? []).map((r) => [r.type, r]));

  return ALL_TYPES.map((type) => ({
    type,
    in_app: saved.get(type)?.in_app ?? true,
    email: saved.get(type)?.email ?? true,
  }));
}

export async function upsertPreference(
  userId: string,
  boxId: string,
  type: NotificationType,
  channel: "in_app" | "email",
  value: boolean
): Promise<void> {
  await supabaseAdmin
    .from("notification_preferences")
    .upsert(
      { user_id: userId, box_id: boxId, type, [channel]: value },
      { onConflict: "user_id,box_id,type" }
    );
}
