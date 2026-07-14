"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { APP_CONFIG } from "@/lib/config";
import { Resend } from "resend";

async function assertStaff(boxId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
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

export async function createTrial(formData: FormData) {
  const boxId = formData.get("boxId") as string;
  const slug = formData.get("slug") as string;

  await assertStaff(boxId);

  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() || null;
  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const class_id = (formData.get("class_id") as string | null) || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!name) return { error: "Nome obrigatório." };

  // Validar email: membro ativo OU trial ativo com o mesmo email nesta box
  if (email) {
    const [{ data: existingProfile }, { data: existingTrial }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id").eq("email", email).maybeSingle(),
      supabaseAdmin
        .from("trials")
        .select("id, status, name")
        .eq("box_id", boxId)
        .eq("email", email)
        .not("status", "in", '("lost","converted")')
        .maybeSingle(),
    ]);

    if (existingTrial) {
      return {
        error: `Já existe um trial ativo com este email (${existingTrial.name}, estado: ${existingTrial.status}). Elimina-o primeiro se quiseres criar um novo.`,
      };
    }

    if (existingProfile) {
      const { data: existingMembership } = await supabaseAdmin
        .from("memberships")
        .select("status")
        .eq("user_id", existingProfile.id)
        .eq("box_id", boxId)
        .eq("status", "active")
        .maybeSingle();

      if (existingMembership) {
        return { error: "Este email já pertence a um membro ativo da box." };
      }
    }
  }

  // Buscar starts_at da aula para usar como scheduled_for
  let scheduled_for: string | null = null;
  if (class_id) {
    const { data: cls } = await supabaseAdmin
      .from("classes")
      .select("starts_at")
      .eq("id", class_id)
      .single();
    scheduled_for = cls?.starts_at ?? null;
  }

  const { data: trial, error } = await supabaseAdmin
    .from("trials")
    .insert({ box_id: boxId, name, email, phone, class_id, scheduled_for, notes, status: "scheduled" })
    .select("id, name, email, phone, scheduled_for, status, converted_at, notes, created_at, class_id")
    .single();

  if (error) return { error: error.message };

  // Email de confirmação
  if (email && process.env.RESEND_API_KEY) {
    try {
      const { data: box } = await supabaseAdmin
        .from("boxes")
        .select("name, slug")
        .eq("id", boxId)
        .single();

      const resend = new Resend(process.env.RESEND_API_KEY);
      const dateStr = scheduled_for
        ? new Date(scheduled_for).toLocaleString("pt-PT", {
            weekday: "long", day: "numeric", month: "long",
            hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
          })
        : null;

      const confirmationLink = `${APP_CONFIG.url}/box/${box?.slug ?? slug}/trial/${trial.id}`;

      await resend.emails.send({
        from: "CF App <noreply@cfapp.pt>",
        to: email,
        subject: `Aula experimental confirmada — ${box?.name ?? "CF App"}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="margin-bottom:8px">Olá, ${name}!</h2>
            <p style="color:#666;margin-bottom:${dateStr ? "16px" : "24px"}">
              A tua aula experimental em <strong>${box?.name ?? "CF App"}</strong> está confirmada.
            </p>
            ${dateStr ? `<p style="background:#f5f5f5;padding:12px 16px;border-radius:8px;font-weight:600;margin-bottom:24px">${dateStr}</p>` : ""}
            <a href="${confirmationLink}" style="display:inline-block;background:#e63946;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px">Ver detalhes da aula</a>
            <p style="color:#999;font-size:13px">Chega uns minutos antes. Qualquer dúvida, entra em contacto com a box diretamente.</p>
          </div>
        `,
      });
    } catch {
      // silent
    }
  }

  revalidatePath(`/box/${slug}/members`);
  return { data: trial };
}

export async function updateTrialStatus(
  trialId: string,
  boxId: string,
  slug: string,
  status: "scheduled" | "completed" | "converted" | "lost"
) {
  await assertStaff(boxId);

  const update: Record<string, unknown> = { status };
  if (status === "converted") update.converted_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("trials")
    .update(update)
    .eq("id", trialId)
    .eq("box_id", boxId);

  if (error) return { error: error.message };
  revalidatePath(`/box/${slug}/members`);
  return {};
}

export async function updateTrialNotes(
  trialId: string,
  boxId: string,
  slug: string,
  notes: string
) {
  await assertStaff(boxId);

  const { error } = await supabaseAdmin
    .from("trials")
    .update({ notes })
    .eq("id", trialId)
    .eq("box_id", boxId);

  if (error) return { error: error.message };
  revalidatePath(`/box/${slug}/members`);
  return {};
}

export async function checkInTrial(
  trialId: string,
  checkedIn: boolean,
  slug: string
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from("trials")
    .update({ checked_in: checkedIn })
    .eq("id", trialId);

  if (error) return { error: error.message };
  revalidatePath(`/box/${slug}/today`);
  return {};
}

export async function convertTrialToMember(
  trialId: string,
  boxId: string,
  slug: string,
  email: string
) {
  await assertStaff(boxId);

  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  let result: { addedDirectly: boolean; emailSent: boolean };

  if (existingProfile) {
    const { data: existing } = await supabaseAdmin
      .from("memberships")
      .select("id, status")
      .eq("user_id", existingProfile.id)
      .eq("box_id", boxId)
      .maybeSingle();

    if (existing?.status === "suspended") {
      return { error: "Este atleta está suspenso. Reativa-o primeiro." };
    }

    if (!existing || existing.status !== "active") {
      const { error } = await supabaseAdmin
        .from("memberships")
        .insert({ user_id: existingProfile.id, box_id: boxId, role: "athlete", status: "active" });
      if (error) return { error: error.message };
    }
    result = { addedDirectly: true, emailSent: false };
  } else {
    const { data: box } = await supabaseAdmin
      .from("boxes")
      .select("name, join_token")
      .eq("id", boxId)
      .single();

    if (!box) return { error: "Box não encontrada." };

    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    await supabaseAdmin.from("invites").insert({
      box_id: boxId,
      email: email.trim().toLowerCase(),
      role: "athlete",
      invited_by: user!.id,
    });

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const link = `${APP_CONFIG.url}/join/${box.join_token}`;
        await resend.emails.send({
          from: "CF App <noreply@cfapp.pt>",
          to: email,
          subject: `Convite para te juntares a ${box.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="margin-bottom:8px">Bem-vindo(a) a ${box.name}!</h2>
              <p style="color:#666;margin-bottom:24px">A tua aula experimental correu bem e foi criada uma conta para ti em <strong>${box.name}</strong>.</p>
              <a href="${link}" style="display:inline-block;background:#e63946;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Aceitar convite</a>
              <p style="color:#999;font-size:12px;margin-top:24px">Ou copia este link: ${link}</p>
            </div>
          `,
        });
      } catch {
        // silent
      }
    }
    result = { addedDirectly: false, emailSent: true };
  }

  await supabaseAdmin
    .from("trials")
    .update({ status: "converted", converted_at: new Date().toISOString() })
    .eq("id", trialId);

  revalidatePath(`/box/${slug}/members`);
  return { data: result };
}

export async function deleteTrial(trialId: string, boxId: string, slug: string) {
  await assertStaff(boxId);

  const { error } = await supabaseAdmin
    .from("trials")
    .delete()
    .eq("id", trialId)
    .eq("box_id", boxId);

  if (error) return { error: error.message };
  revalidatePath(`/box/${slug}/members`);
  return {};
}
