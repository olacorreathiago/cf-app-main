import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { MemberActionsMenu } from "./member-actions-menu";
import { MembersWithTabs } from "./members-with-tabs";

export const metadata: Metadata = { title: "Membros" };

interface Props {
  params: Promise<{ slug: string }>;
}

const roleLabel: Record<string, string> = {
  owner: "Owner", partner: "Sócio", manager: "Gestor", coach: "Coach", athlete: "Atleta",
};

const ROLE_ORDER: Record<string, number> = {
  owner: 0, partner: 1, manager: 2, coach: 3, athlete: 4,
};

export default async function MembersPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name, approval_status, join_token, drop_in_enabled, drop_in_price")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/athlete");

  const { data: viewerMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .maybeSingle();

  const viewerRole = viewerMembership?.role ?? "athlete";
  const canInvite =
    box.approval_status === "approved" &&
    ["owner", "partner", "manager"].includes(viewerRole);

  const now = new Date();
  const in30days = new Date(now.getTime() + 30 * 86_400_000).toISOString();

  const [{ data: memberships }, { data: invites }, { data: trials }, { data: dropIns }, { data: upcomingClasses }] = await Promise.all([
    supabaseAdmin
      .from("memberships")
      .select("id, role, status, profiles(full_name, email, avatar_url)")
      .eq("box_id", box.id)
      .in("status", ["active", "suspended"]),
    supabase
      .from("invites")
      .select("id, email, role, created_at, expires_at")
      .eq("box_id", box.id)
      .in("status", ["pending", "expired"])
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("trials")
      .select("id, name, email, phone, scheduled_for, status, converted_at, notes, created_at, class_id")
      .eq("box_id", box.id)
      .order("scheduled_for", { ascending: true, nullsFirst: false }),
    supabaseAdmin
      .from("drop_ins")
      .select("id, user_id, name, email, nickname, class_id, date, status, notes, checked_in, amount_paid, created_at")
      .eq("box_id", box.id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("classes")
      .select("id, name, starts_at, capacity")
      .eq("box_id", box.id)
      .eq("status", "scheduled")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", in30days)
      .not("name", "ilike", "%open gym%")
      .not("name", "ilike", "%open box%")
      .order("starts_at"),
  ]);

  type Member = {
    id: string; role: string; status: string;
    profiles: { full_name: string | null; email: string; avatar_url: string | null };
  };
  type Invite = { id: string; email: string; role: string; created_at: string; expires_at: string };

  const allMembers = (memberships ?? []) as unknown as Member[];

  const activeMembers = allMembers
    .filter((m) => m.status === "active" && m.profiles)
    .sort((a, b) => {
      const roleA = ROLE_ORDER[a.role] ?? 99;
      const roleB = ROLE_ORDER[b.role] ?? 99;
      if (roleA !== roleB) return roleA - roleB;
      const nameA = (a.profiles.full_name ?? a.profiles.email ?? "").toLowerCase();
      const nameB = (b.profiles.full_name ?? b.profiles.email ?? "").toLowerCase();
      return nameA.localeCompare(nameB, "pt");
    });

  const suspended = allMembers.filter((m) => m.status === "suspended" && m.profiles);
  const pendingInvites = (invites ?? []) as unknown as Invite[];

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-7 space-y-8">
      <MembersWithTabs
        slug={slug}
        boxId={box.id}
        boxName={box.name}
        viewerRole={viewerRole}
        canInvite={canInvite}
        joinToken={box.join_token ?? ""}
        activeMembers={activeMembers}
        pendingInvites={pendingInvites}
        trials={trials ?? []}
        dropIns={dropIns ?? []}
        dropInEnabled={(box as unknown as { drop_in_enabled: boolean }).drop_in_enabled ?? false}
        dropInPrice={(box as unknown as { drop_in_price: number | null }).drop_in_price ?? null}
        upcomingClasses={upcomingClasses ?? []}
      />

      {suspended.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Suspensos <span className="ml-1 font-normal text-text-tertiary">({suspended.length})</span>
          </h2>
          <ul className="space-y-2">
            {suspended.map((m) => {
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              if (!profile) return null;
              const name = profile.full_name ?? profile.email;
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-error/20 bg-error/5 px-4 py-3">
                  <Avatar name={name} url={profile.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                    <p className="text-xs text-text-tertiary truncate">{profile.email}</p>
                  </div>
                  <span className="text-xs text-text-tertiary shrink-0">{roleLabel[m.role] ?? m.role}</span>
                  <MemberActionsMenu
                    membershipId={m.id}
                    boxId={box.id}
                    slug={slug}
                    status={m.status}
                    isSelf={false}
                    targetRole={m.role}
                    viewerRole={viewerRole}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="h-9 w-9 rounded-full object-cover shrink-0" />;
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
