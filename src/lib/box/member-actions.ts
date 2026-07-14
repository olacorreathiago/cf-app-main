"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function assertStaffRole(boxId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", boxId)
    .in("role", ["owner", "partner", "manager"])
    .maybeSingle();

  if (!data) throw new Error("Sem permissão.");
  return { user, role: data.role };
}

async function assertNotOwner(membershipId: string) {
  const { data } = await supabaseAdmin
    .from("memberships")
    .select("role")
    .eq("id", membershipId)
    .single();
  if (data?.role === "owner") throw new Error("Não é possível atuar sobre o owner da box.");
}

export async function suspendMember(membershipId: string, boxId: string, slug: string) {
  await assertStaffRole(boxId);
  await assertNotOwner(membershipId);

  const { error } = await supabaseAdmin
    .from("memberships")
    .update({ status: "suspended" })
    .eq("id", membershipId)
    .eq("box_id", boxId);

  if (error) throw new Error(error.message);
  revalidatePath(`/box/${slug}/members`);
}

export async function reactivateMember(membershipId: string, boxId: string, slug: string) {
  await assertStaffRole(boxId);

  const { error } = await supabaseAdmin
    .from("memberships")
    .update({ status: "active" })
    .eq("id", membershipId)
    .eq("box_id", boxId);

  if (error) throw new Error(error.message);
  revalidatePath(`/box/${slug}/members`);
}

const ROLE_LEVEL: Record<string, number> = { owner: 4, partner: 3, manager: 2, coach: 1, athlete: 0 };

export async function changeRole(
  membershipId: string,
  boxId: string,
  slug: string,
  newRole: string
) {
  const { user, role: viewerRole } = await assertStaffRole(boxId);
  await assertNotOwner(membershipId);

  const viewerLevel = ROLE_LEVEL[viewerRole] ?? 0;
  const newRoleLevel = ROLE_LEVEL[newRole] ?? 0;

  // manager can only assign coach or athlete
  if (viewerRole === "manager" && newRoleLevel >= ROLE_LEVEL["manager"]) {
    throw new Error("Não tens permissão para atribuir este role.");
  }

  // cannot assign a role equal to or above own level (except owner/partner who are level 3-4 and can assign up to partner=3)
  if (viewerRole !== "owner" && viewerRole !== "partner" && newRoleLevel >= viewerLevel) {
    throw new Error("Não tens permissão para atribuir este role.");
  }

  // verify target is not the viewer themselves
  const { data: target } = await supabaseAdmin
    .from("memberships")
    .select("user_id, role")
    .eq("id", membershipId)
    .single();

  if (target?.user_id === user.id) throw new Error("Não podes alterar o teu próprio role.");
  if (target?.role === newRole) return; // no-op

  const { error } = await supabaseAdmin
    .from("memberships")
    .update({ role: newRole })
    .eq("id", membershipId)
    .eq("box_id", boxId);

  if (error) throw new Error(error.message);
  revalidatePath(`/box/${slug}/members`);
}

export async function removeMember(membershipId: string, boxId: string, slug: string) {
  await assertStaffRole(boxId);
  await assertNotOwner(membershipId);

  const { error } = await supabaseAdmin
    .from("memberships")
    .delete()
    .eq("id", membershipId)
    .eq("box_id", boxId);

  if (error) throw new Error(error.message);
  revalidatePath(`/box/${slug}/members`);
}

export async function updateMemberNotes(membershipId: string, boxId: string, slug: string, notes: string) {
  await assertStaffRole(boxId);

  const { error } = await supabaseAdmin
    .from("memberships")
    .update({ notes: notes.trim() || null })
    .eq("id", membershipId)
    .eq("box_id", boxId);

  if (error) throw new Error(error.message);
  revalidatePath(`/box/${slug}/members/${membershipId}`);
}

export async function revokeInvite(inviteId: string, boxId: string, slug: string) {
  await assertStaffRole(boxId);

  const { error } = await supabaseAdmin
    .from("invites")
    .update({ status: "declined" })
    .eq("id", inviteId)
    .eq("box_id", boxId);

  if (error) throw new Error(error.message);
  revalidatePath(`/box/${slug}/members`);
}

export async function resendInvite(inviteId: string, boxId: string, slug: string) {
  await assertStaffRole(boxId);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await supabaseAdmin
    .from("invites")
    .update({
      status: "pending",
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", inviteId)
    .eq("box_id", boxId);

  if (error) throw new Error(error.message);
  revalidatePath(`/box/${slug}/members`);
}
