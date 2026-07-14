import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BoxSidebar, BoxNav } from "./box-nav";
import { NotificationBell } from "@/components/shared/notification-bell";
import { getUnreadCount, listNotifications, getPreferences } from "@/lib/notifications/queries";

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
    .select("id, name, slug, logo_url, approval_status")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/dashboard");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .in("role", ["owner", "partner", "manager", "coach"])
    .maybeSingle();

  if (!membership) redirect("/dashboard");

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

  const [notifUnread, notifList, notifPrefs] = await Promise.all([
    getUnreadCount(user.id, box.id),
    listNotifications(box.id),
    getPreferences(user.id, box.id),
  ]);

  return (
    <div className="flex h-[100svh] bg-bg-base text-foreground">

      {/* ── Sidebar (desktop) ────────────────────────────── */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border bg-bg-base">
        {/* Box identity */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg">
            {box.logo_url ? (
              <img src={box.logo_url} alt={box.name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{box.name}</p>
            <p className="text-[10px] text-text-tertiary capitalize">{membership.role}</p>
          </div>
        </div>

        {/* Nav */}
        <BoxSidebar slug={slug} role={membership.role} />
      </aside>

      {/* ── Main area ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top header */}
        <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          {/* Mobile: box name */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-fg shrink-0">
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-text-primary truncate max-w-[160px]">{box.name}</span>
          </div>

          <div className="hidden lg:block" />

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <NotificationBell
              boxId={box.id}
              slug={slug}
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
          <BoxNav slug={slug} role={membership.role} />
        </nav>
      </div>
    </div>
  );
}
