import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BoxSidebar, BoxNav, BoxSwitchChip, type StaffBox } from "./box-nav";
import { BoxCard } from "./box-card";
import { AppLogo } from "@/components/shared/app-logo";
import { NotificationBell } from "@/components/shared/notification-bell";
import { getUnreadCount, listNotifications, getPreferences } from "@/lib/notifications/queries";
import { checkClassStartingNotifications } from "@/lib/notifications/actions";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

interface ProfileData {
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  phone: string | null;
  birth_date: string | null;
  emergency_contact: string | null;
}

function getProfileCompletion(profile: ProfileData): number {
  const fields = [
    profile.avatar_url,
    profile.nickname,
    profile.phone,
    profile.birth_date,
    profile.emergency_contact,
  ];
  return fields.filter(Boolean).length / fields.length;
}

function ProfileAvatar({ profile, completion }: { profile: ProfileData; completion: number }) {
  const SIZE = 34;
  const RADIUS = 15;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const displayName = profile.full_name ?? "";
  const initial = (profile.nickname ?? displayName).charAt(0).toUpperCase() || "P";

  return (
    <Link href="/athlete/profile" className="relative flex shrink-0" title={`Perfil ${Math.round(completion * 100)}% completo`}>
      <div style={{ width: SIZE + 4, height: SIZE + 4 }} className="relative flex items-center justify-center">
        <svg
          width={SIZE + 4}
          height={SIZE + 4}
          viewBox={`0 0 ${SIZE + 4} ${SIZE + 4}`}
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          <circle cx={(SIZE + 4) / 2} cy={(SIZE + 4) / 2} r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="2" />
          {completion > 0 && (
            <circle
              cx={(SIZE + 4) / 2}
              cy={(SIZE + 4) / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${completion * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              opacity={completion === 1 ? 1 : 0.7}
            />
          )}
        </svg>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="rounded-full object-cover"
            style={{ width: SIZE - 4, height: SIZE - 4 }}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent"
            style={{ width: SIZE - 4, height: SIZE - 4 }}
          >
            {initial}
          </div>
        )}
        {completion < 1 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 rounded-full bg-yellow-400 ring-2 ring-bg-base">
            <span className="sr-only">Perfil incompleto</span>
          </span>
        )}
      </div>
    </Link>
  );
}

export default async function BoxLayout({ children, params }: Props) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name, slug, logo_url, approval_status, city, created_at")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/athlete");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .in("role", ["owner", "partner", "manager", "coach"])
    .maybeSingle();

  if (!membership) redirect("/athlete");

  // All boxes this user manages — for the mobile box switcher.
  const { data: staffMemberships } = await supabase
    .from("memberships")
    .select("role, boxes(id, name, slug, logo_url, approval_status)")
    .eq("user_id", user.id)
    .in("role", ["owner", "partner", "manager", "coach"])
    .order("created_at");

  const managedBoxes: StaffBox[] = (staffMemberships ?? [])
    .map((m) => {
      const b = m.boxes as unknown as { id: string; name: string; slug: string; logo_url: string | null; approval_status: string | null } | null;
      if (!b?.id) return null;
      return { id: b.id, name: b.name, slug: b.slug, logo_url: b.logo_url, approval_status: b.approval_status };
    })
    .filter((b): b is StaffBox => b !== null);

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("full_name, nickname, avatar_url, phone, birth_date, emergency_contact")
    .eq("id", user.id)
    .single();

  const profile: ProfileData = rawProfile ?? {
    full_name: null, nickname: null, avatar_url: null,
    phone: null, birth_date: null, emergency_contact: null,
  };
  const completion = getProfileCompletion(profile);

  const boxYear = box.created_at ? new Date(box.created_at).getFullYear() : null;
  const boxSubtitle = [box.city, boxYear ? `desde ${boxYear}` : null]
    .filter(Boolean)
    .join(" • ");

  // Create class_starting notifications before fetching (coach may have classes today)
  await checkClassStartingNotifications(box.id, user.id);

  const [notifUnread, notifList, notifPrefs] = await Promise.all([
    getUnreadCount(user.id, box.id),
    listNotifications(box.id),
    getPreferences(user.id, box.id),
  ]);

  return (
    <div className="flex h-[100svh] bg-bg-base text-foreground">

      {/* ── Sidebar (desktop) ────────────────────────────── */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-bg-base">
        {/* Wordmark */}
        <div className="px-5 pb-4 pt-6">
          <Link href={`/box/${slug}`} aria-label="Visão Geral">
            <AppLogo size="xl" compact />
          </Link>
        </div>

        {/* Nav */}
        <BoxSidebar slug={slug} role={membership.role} />

        {/* Box identity card */}
        <BoxCard
          slug={slug}
          name={box.name}
          logoUrl={box.logo_url}
          subtitle={boxSubtitle}
          canManageSettings={["owner", "partner"].includes(membership.role)}
        />
      </aside>

      {/* ── Main area ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top header */}
        <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          {/* Mobile: tappable box switcher chip */}
          <div className="lg:hidden">
            <BoxSwitchChip
              current={{ id: box.id, name: box.name, slug: box.slug, logo_url: box.logo_url, approval_status: box.approval_status }}
              managedBoxes={managedBoxes}
            />
          </div>

          <div className="hidden lg:block" />

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <NotificationBell
              boxId={box.id}
              slug={slug}
              userId={user.id}
              initialUnread={notifUnread}
              initialNotifications={notifList}
              initialPrefs={notifPrefs}
            />

            {/* Profile avatar with completion ring */}
            <ProfileAvatar profile={profile} completion={completion} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 flex lg:hidden border-t border-border bg-bg-base/90 backdrop-blur-sm">
          <BoxNav slug={slug} role={membership.role} managedBoxes={managedBoxes} />
        </nav>
      </div>
    </div>
  );
}
