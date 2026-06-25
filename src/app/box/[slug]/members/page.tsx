import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { MemberActionsMenu } from "./member-actions-menu";
import { MembersList } from "./members-list";
import { revokeInvite, resendInvite } from "@/lib/box/member-actions";

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
    .select("id, name, approval_status, join_token")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/dashboard");

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

  const { data: memberships } = await supabaseAdmin
    .from("memberships")
    .select("id, role, status, profiles(full_name, email, avatar_url)")
    .eq("box_id", box.id)
    .in("status", ["active", "suspended"]);

  const { data: invites } = await supabase
    .from("invites")
    .select("id, email, role, created_at, expires_at")
    .eq("box_id", box.id)
    .in("status", ["pending", "expired"])
    .order("created_at", { ascending: false });

  type Member = {
    id: string; role: string; status: string;
    profiles: { full_name: string | null; email: string; avatar_url: string | null };
  };
  type Invite = { id: string; email: string; role: string; created_at: string; expires_at: string };

  const allMembers = (memberships ?? []) as unknown as Member[];

  // Owner first, then alphabetically by name
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
    <main className="mx-auto w-full max-w-2xl px-6 py-8 space-y-8">

      {/* Active members */}
      <section className="space-y-3">
        <MembersList
          members={activeMembers}
          boxId={box.id}
          boxName={box.name}
          slug={slug}
          viewerRole={viewerRole}
          canInvite={canInvite}
          joinToken={box.join_token ?? ""}
        />
      </section>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Convites <span className="ml-1 font-normal text-text-tertiary">({pendingInvites.length})</span>
          </h2>
          <ul className="space-y-2">
            {pendingInvites.map((inv) => {
              const expired = new Date(inv.expires_at) < new Date();
              return (
                <li key={inv.id} className={`flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3 bg-bg-card ${expired ? "border-error/30" : "border-border"}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${expired ? "bg-error/10 text-error" : "bg-bg-input text-text-tertiary"}`}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h8A1.5 1.5 0 0 1 13 3.5v8a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 11.5v-8Z" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M2 5l5.5 4L13 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{inv.email}</p>
                    <p className={`text-xs ${expired ? "text-error" : "text-text-tertiary"}`}>
                      {expired ? "Expirado" : `Expira ${new Date(inv.expires_at).toLocaleDateString("pt-PT")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {expired ? (
                      <form action={async () => {
                        "use server";
                        await resendInvite(inv.id, box.id, slug);
                      }}>
                        <button type="submit" className="text-xs font-medium text-accent hover:underline underline-offset-4 transition-colors">
                          Reenviar
                        </button>
                      </form>
                    ) : (
                      <form action={async () => {
                        "use server";
                        await revokeInvite(inv.id, box.id, slug);
                      }}>
                        <button type="submit" className="text-xs text-error hover:underline underline-offset-4 transition-colors">
                          Revogar
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Suspended */}
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
