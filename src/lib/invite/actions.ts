"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { APP_CONFIG } from "@/lib/config";
import { Resend } from "resend";

export async function joinBoxByToken(joinToken: string): Promise<void> {
  const supabase = await supabaseServer();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: box, error: boxError } = await supabase
    .from("boxes")
    .select("id, approval_status")
    .eq("join_token", joinToken)
    .single();

  if (boxError || !box) throw new Error("Link inválido.");
  if (box.approval_status !== "approved") throw new Error("Esta box ainda não está ativa.");

  const { error: memberError } = await supabaseAdmin
    .from("memberships")
    .upsert(
      { user_id: user.id, box_id: box.id, role: "athlete", status: "active" },
      { onConflict: "user_id,box_id" }
    );

  if (memberError) throw new Error(memberError.message);

  redirect("/dashboard");
}

export async function createEmailInvite(data: {
  email: string;
  boxId: string;
}): Promise<{ link: string; emailSent: boolean; addedDirectly: boolean }> {
  const supabase = await supabaseServer();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const email = data.email.trim().toLowerCase();

  const [{ data: box }, { data: inviterProfile }] = await Promise.all([
    supabase.from("boxes").select("name, join_token").eq("id", data.boxId).single(),
    supabase.from("profiles").select("full_name, nickname").eq("id", user.id).single(),
  ]);

  if (!box) throw new Error("Box não encontrada.");

  const inviterName = inviterProfile?.nickname ?? inviterProfile?.full_name ?? "O teu coach";

  // Check if this email already has an account
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    // Check if already a member (active or suspended)
    const { data: existingMembership } = await supabaseAdmin
      .from("memberships")
      .select("id, status")
      .eq("user_id", existingProfile.id)
      .eq("box_id", data.boxId)
      .maybeSingle();

    if (existingMembership?.status === "suspended") {
      throw new Error("Este atleta está suspenso da box. Reativa-o na lista de membros.");
    }

    if (existingMembership?.status === "active") {
      throw new Error("Este atleta já é membro ativo da box.");
    }

    // Already has an account — add directly as member
    const { error: memberError } = await supabaseAdmin
      .from("memberships")
      .insert({ user_id: existingProfile.id, box_id: data.boxId, role: "athlete", status: "active" });

    if (memberError) throw new Error(memberError.message);

    // Send a notification email (no action needed — they're already in)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const dashboardLink = `${APP_CONFIG.url}/athlete`;
        await resend.emails.send({
          from: "CF App <noreply@cfapp.pt>",
          to: email,
          subject: `Foste adicionado(a) a ${box.name}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="margin-bottom:8px">Bem-vindo(a) a ${box.name}</h2>
              <p style="color:#666;margin-bottom:24px">${inviterName} adicionou-te a <strong>${box.name}</strong> no CF App. Já tens acesso à box.</p>
              <a href="${dashboardLink}" style="display:inline-block;background:#e63946;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Ver a minha box</a>
            </div>
          `,
        });
      } catch {
        // silent
      }
    }

    return { link: `${APP_CONFIG.url}/athlete`, emailSent: true, addedDirectly: true };
  }

  // No account yet — create invite + send join link as before
  await supabase
    .from("invites")
    .insert({
      box_id: data.boxId,
      email,
      role: "athlete",
      invited_by: user.id,
    });

  const link = `${APP_CONFIG.url}/join/${box.join_token}`;

  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "CF App <noreply@cfapp.pt>",
        to: email,
        subject: `Foste convidado(a) para ${box.name}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="margin-bottom:8px">Convite para ${box.name}</h2>
            <p style="color:#666;margin-bottom:24px">${inviterName} convidou-te para te juntares a <strong>${box.name}</strong> no CF App.</p>
            <a href="${link}" style="display:inline-block;background:#e63946;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Aceitar convite</a>
            <p style="color:#999;font-size:12px;margin-top:24px">Ou copia este link: ${link}</p>
          </div>
        `,
      });
      emailSent = true;
    } catch {
      // log silently — convite fica registado mesmo se o email falhar
    }
  }

  return { link, emailSent, addedDirectly: false };
}

export async function acceptInvite(token: string): Promise<void> {
  const supabase = await supabaseServer();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: invite, error: inviteError } = await supabase
    .from("invites")
    .select("id, box_id, email, role, status, expires_at")
    .eq("token", token)
    .single();

  if (inviteError || !invite) throw new Error("Convite inválido ou expirado.");
  if (invite.status !== "pending") throw new Error("Este convite já foi utilizado.");
  if (new Date(invite.expires_at) < new Date()) throw new Error("Este convite expirou.");

  const { error: memberError } = await supabaseAdmin
    .from("memberships")
    .upsert(
      { user_id: user.id, box_id: invite.box_id, role: invite.role, status: "active" },
      { onConflict: "user_id,box_id" }
    );

  if (memberError) throw new Error(memberError.message);

  await supabaseAdmin
    .from("invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  redirect("/dashboard");
}
