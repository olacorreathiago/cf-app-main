"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function completeAthleteOnboarding(data: {
  fullName: string;
  nickname?: string;
  gender?: "male" | "female" | null;
  inviteToken?: string | null;
  joinToken?: string | null;
}): Promise<void> {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName.trim(),
      nickname: data.nickname?.trim() || null,
      gender: data.gender ?? null,
      profile_type: "athlete",
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  if (data.joinToken) {
    redirect(`/join/${data.joinToken}`);
  } else if (data.inviteToken) {
    redirect(`/invite?token=${data.inviteToken}`);
  }

  // Auto-accept pending invites for this email
  const { data: pendingInvites } = await supabaseAdmin
    .from("invites")
    .select("id, box_id, role")
    .eq("email", user.email!)
    .eq("status", "pending")
    .gte("expires_at", new Date().toISOString());

  if (pendingInvites && pendingInvites.length > 0) {
    for (const invite of pendingInvites) {
      await supabaseAdmin
        .from("memberships")
        .upsert(
          { user_id: user.id, box_id: invite.box_id, role: invite.role, status: "active" },
          { onConflict: "user_id,box_id" }
        );

      await supabaseAdmin
        .from("invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invite.id);
    }

    // Redirect to athlete dashboard (they now have a box)
    redirect("/athlete");
  }

  redirect("/athlete");
}

export async function completeProfessionalOnboarding(data: {
  fullName: string;
  professionalId: string;
  phone: string;
  gender?: "male" | "female" | null;
  inviteToken?: string | null;
}): Promise<void> {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName.trim(),
      profile_type: "professional",
      professional_id: data.professionalId.trim(),
      phone: data.phone.trim(),
      gender: data.gender ?? null,
      approval_status: "pending_approval",
      onboarding_completed: true,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  redirect("/waiting-approval");
}
