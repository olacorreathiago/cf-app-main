"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { APP_CONFIG } from "@/lib/config";

export type NotificationType = "class_cancelled" | "waitlist_promoted" | "new_post" | "athlete_removed" | "class_starting" | "new_drop_in";

export interface NotificationData {
  class_id?: string;
  class_name?: string;
  starts_at?: string;
  cancellation_reason?: string;
  post_id?: string;
  post_title?: string;
}

async function getPrefs(
  userId: string,
  boxId: string,
  type: NotificationType
): Promise<{ in_app: boolean; email: boolean }> {
  const { data } = await supabaseAdmin
    .from("notification_preferences")
    .select("in_app, email")
    .eq("user_id", userId)
    .eq("box_id", boxId)
    .eq("type", type)
    .maybeSingle();
  return { in_app: data?.in_app ?? true, email: data?.email ?? true };
}

async function insertNotification({
  userId,
  boxId,
  type,
  title,
  body,
  data,
}: {
  userId: string;
  boxId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: NotificationData;
}) {
  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    box_id: boxId,
    type,
    title,
    body: body ?? null,
    data: data ?? null,
  });
}

async function sendEmailNotification({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `${APP_CONFIG.name} <noreply@cfapp.pt>`,
      to,
      subject,
      html,
    });
  } catch {
    // silent — email is best-effort
  }
}

export async function notifyClassCancelled({
  userId,
  email,
  boxId,
  boxName,
  className,
  startsAt,
  reason,
}: {
  userId: string;
  email: string;
  boxId: string;
  boxName: string;
  className: string;
  startsAt: string;
  reason: string;
}) {
  const prefs = await getPrefs(userId, boxId, "class_cancelled");

  if (prefs.in_app) {
    const dateStr = new Date(startsAt).toLocaleString("pt-PT", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });
    await insertNotification({
      userId,
      boxId,
      type: "class_cancelled",
      title: `Aula cancelada: ${className}`,
      body: `${dateStr} · ${reason}`,
      data: { class_name: className, starts_at: startsAt, cancellation_reason: reason },
    });
  }

  if (prefs.email) {
    const dateStr = new Date(startsAt).toLocaleString("pt-PT", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });
    await sendEmailNotification({
      to: email,
      subject: `[${boxName}] Aula cancelada — ${className}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin-bottom:8px">Aula cancelada</h2>
          <p style="color:#666;margin-bottom:4px"><strong>${className}</strong> — ${dateStr}</p>
          <p style="color:#666;margin-bottom:24px">Motivo: ${reason}</p>
          <a href="${APP_CONFIG.url}/athlete/classes" style="display:inline-block;background:#e63946;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver aulas disponíveis</a>
        </div>
      `,
    });
  }
}

export async function notifyWaitlistPromoted({
  userId,
  email,
  boxId,
  boxName,
  className,
  startsAt,
}: {
  userId: string;
  email: string;
  boxId: string;
  boxName: string;
  className: string;
  startsAt: string;
}) {
  const prefs = await getPrefs(userId, boxId, "waitlist_promoted");

  if (prefs.in_app) {
    const dateStr = new Date(startsAt).toLocaleString("pt-PT", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });
    await insertNotification({
      userId,
      boxId,
      type: "waitlist_promoted",
      title: `Lugar confirmado: ${className}`,
      body: dateStr,
      data: { class_name: className, starts_at: startsAt },
    });
  }

  if (prefs.email) {
    const dateStr = new Date(startsAt).toLocaleString("pt-PT", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });
    await sendEmailNotification({
      to: email,
      subject: `[${boxName}] Lugar confirmado — ${className}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin-bottom:8px">Lugar confirmado!</h2>
          <p style="color:#666;margin-bottom:4px">Saíste da lista de espera e tens lugar confirmado em <strong>${className}</strong>.</p>
          <p style="color:#666;margin-bottom:24px">${dateStr}</p>
          <a href="${APP_CONFIG.url}/athlete/classes" style="display:inline-block;background:#e63946;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver os meus treinos</a>
        </div>
      `,
    });
  }
}

export async function notifyAthleteRemoved({
  userId,
  email,
  boxId,
  boxName,
  className,
  startsAt,
}: {
  userId: string;
  email: string;
  boxId: string;
  boxName: string;
  className: string;
  startsAt: string;
}) {
  const prefs = await getPrefs(userId, boxId, "athlete_removed");

  if (prefs.in_app) {
    const dateStr = new Date(startsAt).toLocaleString("pt-PT", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });
    await insertNotification({
      userId,
      boxId,
      type: "athlete_removed",
      title: `Removido(a) da aula: ${className}`,
      body: dateStr,
      data: { class_name: className, starts_at: startsAt },
    });
  }

  if (prefs.email) {
    const dateStr = new Date(startsAt).toLocaleString("pt-PT", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });
    await sendEmailNotification({
      to: email,
      subject: `[${boxName}] Removido(a) da aula — ${className}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin-bottom:8px">Foste removido(a) de uma aula</h2>
          <p style="color:#666;margin-bottom:4px"><strong>${className}</strong> — ${dateStr}</p>
          <p style="color:#666;margin-bottom:24px">O staff da box removeu a tua inscrição nesta aula.</p>
          <a href="${APP_CONFIG.url}/athlete/classes" style="display:inline-block;background:#e63946;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver aulas disponíveis</a>
        </div>
      `,
    });
  }
}

export async function notifyNewPost({
  userId,
  boxId,
  boxName,
  postId,
  postTitle,
  postExcerpt,
}: {
  userId: string;
  boxId: string;
  boxName: string;
  postId: string;
  postTitle: string;
  postExcerpt?: string;
}) {
  const prefs = await getPrefs(userId, boxId, "new_post");

  if (prefs.in_app) {
    await insertNotification({
      userId,
      boxId,
      type: "new_post",
      title: postTitle,
      body: postExcerpt ?? undefined,
      data: { post_id: postId, post_title: postTitle },
    });
  }
  // new_post has no email channel by design
}
