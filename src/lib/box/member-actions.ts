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
    .eq("status", "active")
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
  const { user } = await assertStaffRole(boxId);
  await assertNotOwner(membershipId);

  // Soft removal — the row (and the athlete's tenure/notes/billing history)
  // survives. removed_at/removed_by drive the membership_periods trigger,
  // which closes the open period so past payments stay in the billing
  // history but the gap between now and any future re-invite doesn't.
  const { error } = await supabaseAdmin
    .from("memberships")
    .update({ status: "inactive", removed_at: new Date().toISOString(), removed_by: user.id })
    .eq("id", membershipId)
    .eq("box_id", boxId);

  if (error) throw new Error(error.message);
  revalidatePath(`/box/${slug}/members`);
}

export interface MemberNote {
  id: string;
  body: string;
  created_at: string;
  author_id: string | null;
  author_name: string | null;
}

// Notes are visible to (and writable by) coaches too, unlike the other member
// actions, which are manager-and-up.
async function assertNotesAccess(boxId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", boxId)
    .eq("status", "active")
    .in("role", ["owner", "partner", "manager", "coach"])
    .maybeSingle();

  if (!data) throw new Error("Sem permissão.");
  return { user };
}

export async function getMemberNotes(membershipId: string, boxId: string): Promise<MemberNote[]> {
  await assertNotesAccess(boxId);

  const { data, error } = await supabaseAdmin
    .from("member_notes")
    .select("id, body, created_at, author_id, profiles:author_id(full_name)")
    .eq("membership_id", membershipId)
    .eq("box_id", boxId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((n) => {
    const author = n.profiles as unknown as { full_name: string | null } | null;
    return {
      id: n.id,
      body: n.body,
      created_at: n.created_at,
      author_id: n.author_id,
      author_name: author?.full_name ?? null,
    };
  });
}

export async function addMemberNote(
  membershipId: string,
  boxId: string,
  slug: string,
  body: string
): Promise<MemberNote> {
  const { user } = await assertNotesAccess(boxId);
  const text = body.trim();
  if (!text) throw new Error("A nota está vazia.");

  const { data, error } = await supabaseAdmin
    .from("member_notes")
    .insert({ membership_id: membershipId, box_id: boxId, author_id: user.id, body: text })
    .select("id, body, created_at, author_id, profiles:author_id(full_name)")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/box/${slug}/members/${membershipId}`);

  const author = data.profiles as unknown as { full_name: string | null } | null;
  return {
    id: data.id,
    body: data.body,
    created_at: data.created_at,
    author_id: data.author_id,
    author_name: author?.full_name ?? null,
  };
}

export async function deleteMemberNote(noteId: string, boxId: string, slug: string) {
  const { user } = await assertNotesAccess(boxId);

  // Only the author can delete — notes without an author (migrated from the
  // old single-text field) are permanent.
  const { data: deleted, error } = await supabaseAdmin
    .from("member_notes")
    .delete()
    .eq("id", noteId)
    .eq("box_id", boxId)
    .eq("author_id", user.id)
    .select("membership_id");

  if (error) throw new Error(error.message);
  if (!deleted?.length) throw new Error("Só podes apagar as notas que escreveste.");
  revalidatePath(`/box/${slug}/members/${deleted[0].membership_id}`);
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
