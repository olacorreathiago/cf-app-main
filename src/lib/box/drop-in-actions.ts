"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { APP_CONFIG } from "@/lib/config";
import { Resend } from "resend";

async function assertStaff(boxId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", boxId)
    .in("role", ["owner", "partner", "manager", "coach"])
    .maybeSingle();

  if (!data) throw new Error("Sem permissão.");
  return user;
}

export type DropInStatus = "pending" | "confirmed" | "cancelled";

export interface DropIn {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  nickname: string | null;
  class_id: string | null;
  date: string;
  status: DropInStatus;
  notes: string | null;
  checked_in: boolean;
  amount_paid: number | null;
  created_at: string;
}

/** Staff cria drop-in manualmente */
export async function createDropIn(formData: FormData) {
  const boxId = formData.get("boxId") as string;
  const slug = formData.get("slug") as string;

  await assertStaff(boxId);

  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() || null;
  const nickname = (formData.get("nickname") as string | null)?.trim() || null;
  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const class_id = (formData.get("class_id") as string | null) || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!name) return { error: "Nome obrigatório." };

  // Determine date from class or today
  let date = new Date().toISOString().slice(0, 10);
  if (class_id) {
    const { data: cls } = await supabaseAdmin
      .from("classes")
      .select("starts_at")
      .eq("id", class_id)
      .single();
    if (cls) date = cls.starts_at.slice(0, 10);
  }

  // Check for duplicate active drop-in with same email on same class
  if (email && class_id) {
    const { data: existing } = await supabaseAdmin
      .from("drop_ins")
      .select("id")
      .eq("box_id", boxId)
      .eq("email", email)
      .eq("class_id", class_id)
      .neq("status", "cancelled")
      .maybeSingle();

    if (existing) return { error: "Já existe um drop-in ativo com este email nesta aula." };
  }

  const { data: dropIn, error } = await supabaseAdmin
    .from("drop_ins")
    .insert({
      box_id: boxId,
      name,
      email,
      nickname,
      class_id,
      date,
      notes,
      status: "confirmed", // staff creates as confirmed
      amount_paid: null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Confirmation email to athlete
  if (email && class_id && process.env.RESEND_API_KEY) {
    try {
      const [{ data: box }, { data: cls }] = await Promise.all([
        supabaseAdmin.from("boxes").select("name").eq("id", boxId).single(),
        supabaseAdmin.from("classes").select("name, starts_at").eq("id", class_id).single(),
      ]);

      if (box && cls) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const dateStr = new Date(cls.starts_at).toLocaleString("pt-PT", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "UTC",
        });
        await resend.emails.send({
          from: `${APP_CONFIG.name} <noreply@cfapp.pt>`,
          to: email,
          subject: `Drop-in confirmado — ${box.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="margin-bottom:8px">Olá, ${name}!</h2>
              <p style="color:#666;margin-bottom:16px">O teu drop-in em <strong>${box.name}</strong> está confirmado.</p>
              <p style="background:#f5f5f5;padding:12px 16px;border-radius:8px;font-weight:600;margin-bottom:24px">${cls.name} — ${dateStr}</p>
              <p style="color:#999;font-size:13px">Chega uns minutos antes. Qualquer dúvida, entra em contacto com a box diretamente.</p>
            </div>
          `,
        });
      }
    } catch {
      // silent
    }
  }

  revalidatePath(`/box/${slug}/members`);
  return { data: dropIn as DropIn };
}

/** Atleta regista-se via link/QR público — cria como pending, notifica staff */
export async function createDropInPublic(payload: {
  boxId: string;
  slug: string;
  name: string;
  email: string;
  nickname?: string;
  classId: string;
}) {
  const { boxId, slug, name, email, nickname, classId } = payload;

  // Fetch class info
  const { data: cls } = await supabaseAdmin
    .from("classes")
    .select("starts_at, name, capacity")
    .eq("id", classId)
    .single();

  if (!cls) return { error: "Aula não encontrada." };

  const date = cls.starts_at.slice(0, 10);

  // Duplicate check
  const { data: existing } = await supabaseAdmin
    .from("drop_ins")
    .select("id")
    .eq("box_id", boxId)
    .eq("email", email.toLowerCase())
    .eq("class_id", classId)
    .neq("status", "cancelled")
    .maybeSingle();

  if (existing) return { error: "Já existe um registo com este email nesta aula." };

  // Capacity check: confirmed bookings + confirmed drop-ins
  const [{ count: bookingCount }, { count: dropInCount }] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("status", "confirmed"),
    supabaseAdmin
      .from("drop_ins")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("status", "confirmed"),
  ]);

  const used = (bookingCount ?? 0) + (dropInCount ?? 0);
  if (used >= cls.capacity) return { error: "Esta aula já não tem vagas disponíveis." };

  const { data: dropIn, error } = await supabaseAdmin
    .from("drop_ins")
    .insert({
      box_id: boxId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      nickname: nickname?.trim() || null,
      class_id: classId,
      date,
      status: "pending",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Notify staff
  const { data: box } = await supabaseAdmin.from("boxes").select("name").eq("id", boxId).single();
  const { data: managers } = await supabaseAdmin
    .from("memberships")
    .select("user_id")
    .eq("box_id", boxId)
    .in("role", ["owner", "partner", "manager"])
    .eq("status", "active");

  if (managers && box) {
    const dateStr = new Date(cls.starts_at).toLocaleString("pt-PT", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
    await Promise.all(
      managers.map((m) =>
        supabaseAdmin.from("notifications").insert({
          user_id: m.user_id,
          box_id: boxId,
          type: "new_drop_in",
          title: `Novo drop-in: ${name}`,
          body: `${cls.name} — ${dateStr}`,
          data: { class_id: classId, class_name: cls.name },
        })
      )
    );

    // Email to managers
    if (process.env.RESEND_API_KEY) {
      const { data: managerProfiles } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .in("id", managers.map((m) => m.user_id));

      if (managerProfiles && managerProfiles.length > 0) {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const managerEmails = managerProfiles
            .map((p) => (p as { email: string }).email)
            .filter(Boolean);
          const confirmUrl = `${APP_CONFIG.url}/box/${slug}/members`;
          await resend.emails.send({
            from: `${APP_CONFIG.name} <noreply@cfapp.pt>`,
            to: managerEmails,
            subject: `[${box.name}] Novo drop-in — ${name}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                <h2 style="margin-bottom:8px">Novo drop-in registado</h2>
                <p style="color:#666;margin-bottom:4px"><strong>${name}</strong> (${email}) quer fazer drop-in em:</p>
                <p style="background:#f5f5f5;padding:12px 16px;border-radius:8px;font-weight:600;margin-bottom:24px">${cls.name} — ${dateStr}</p>
                <a href="${confirmUrl}" style="display:inline-block;background:#e63946;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver drop-ins</a>
              </div>
            `,
          });
        } catch {
          // silent
        }
      }
    }
  }

  // Confirmation email to athlete
  if (process.env.RESEND_API_KEY && box) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const dateStr = new Date(cls.starts_at).toLocaleString("pt-PT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      });
      await resend.emails.send({
        from: `${APP_CONFIG.name} <noreply@cfapp.pt>`,
        to: email,
        subject: `Pedido de drop-in recebido — ${box.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="margin-bottom:8px">Pedido recebido!</h2>
            <p style="color:#666;margin-bottom:16px">O teu pedido de drop-in em <strong>${box.name}</strong> foi recebido e aguarda confirmação.</p>
            <p style="background:#f5f5f5;padding:12px 16px;border-radius:8px;font-weight:600;margin-bottom:24px">${cls.name} — ${dateStr}</p>
            <p style="color:#999;font-size:13px">Receberás um email assim que for confirmado.</p>
          </div>
        `,
      });
    } catch {
      // silent
    }
  }

  revalidatePath(`/box/${slug}/members`);
  return { data: dropIn as DropIn };
}

/** Confirma um drop-in pendente e envia email ao atleta */
export async function confirmDropIn(dropInId: string, boxId: string, slug: string) {
  await assertStaff(boxId);

  const { data: dropIn } = await supabaseAdmin
    .from("drop_ins")
    .select("name, email, class_id")
    .eq("id", dropInId)
    .eq("box_id", boxId)
    .single();

  const { error } = await supabaseAdmin
    .from("drop_ins")
    .update({ status: "confirmed" })
    .eq("id", dropInId)
    .eq("box_id", boxId);

  if (error) return { error: error.message };

  // Email to athlete
  if (dropIn?.email && dropIn.class_id && process.env.RESEND_API_KEY) {
    try {
      const [{ data: box }, { data: cls }] = await Promise.all([
        supabaseAdmin.from("boxes").select("name").eq("id", boxId).single(),
        supabaseAdmin.from("classes").select("name, starts_at").eq("id", dropIn.class_id).single(),
      ]);

      if (box && cls) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const dateStr = new Date(cls.starts_at).toLocaleString("pt-PT", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "UTC",
        });
        await resend.emails.send({
          from: `${APP_CONFIG.name} <noreply@cfapp.pt>`,
          to: dropIn.email,
          subject: `Drop-in confirmado — ${box.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="margin-bottom:8px">Drop-in confirmado!</h2>
              <p style="color:#666;margin-bottom:16px">O teu drop-in em <strong>${box.name}</strong> foi confirmado.</p>
              <p style="background:#f5f5f5;padding:12px 16px;border-radius:8px;font-weight:600;margin-bottom:24px">${cls.name} — ${dateStr}</p>
              <p style="color:#999;font-size:13px">Chega uns minutos antes. Até já!</p>
            </div>
          `,
        });
      }
    } catch {
      // silent
    }
  }

  revalidatePath(`/box/${slug}/members`);
  return {};
}

export async function cancelDropIn(dropInId: string, boxId: string, slug: string) {
  await assertStaff(boxId);

  const { error } = await supabaseAdmin
    .from("drop_ins")
    .update({ status: "cancelled" })
    .eq("id", dropInId)
    .eq("box_id", boxId);

  if (error) return { error: error.message };
  revalidatePath(`/box/${slug}/members`);
  return {};
}

export async function checkInDropIn(
  dropInId: string,
  checkedIn: boolean,
  slug: string
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from("drop_ins")
    .update({ checked_in: checkedIn })
    .eq("id", dropInId);

  if (error) return { error: error.message };
  revalidatePath(`/box/${slug}/today`);
  return {};
}

export async function updateDropInNotes(
  dropInId: string,
  boxId: string,
  slug: string,
  notes: string
) {
  await assertStaff(boxId);

  const { error } = await supabaseAdmin
    .from("drop_ins")
    .update({ notes })
    .eq("id", dropInId)
    .eq("box_id", boxId);

  if (error) return { error: error.message };
  revalidatePath(`/box/${slug}/members`);
  return {};
}

export async function deleteDropIn(dropInId: string, boxId: string, slug: string) {
  await assertStaff(boxId);

  const { error } = await supabaseAdmin
    .from("drop_ins")
    .delete()
    .eq("id", dropInId)
    .eq("box_id", boxId);

  if (error) return { error: error.message };
  revalidatePath(`/box/${slug}/members`);
  return {};
}
