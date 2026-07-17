import { supabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/app/dashboard/actions";
import { AthleteSidebar, AthleteBottomNav, BoxSwitchChip } from "./athlete-sidebar";
import { AppLogo } from "@/components/shared/app-logo";
import type { AthleteBox, AthleteProfileData } from "@/lib/athlete/dashboard-actions";
import { NotificationBell } from "@/components/shared/notification-bell";
import { getUnreadCount, listNotifications, getPreferences } from "@/lib/notifications/queries";

function getProfileCompletion(profile: AthleteProfileData): number {
  const fields = [
    profile.avatar_url,
    profile.nickname,
    profile.phone,
    profile.birth_date,
    profile.emergency_contact,
  ];
  return fields.filter(Boolean).length / fields.length;
}

// Profile completion ring — computed server-side, rendered as SVG
function ProfileCompletionAvatar({
  profile,
  completion,
}: {
  profile: AthleteProfileData;
  completion: number;
}) {
  const SIZE = 34;
  const RADIUS = 15;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~94.2
  const filled = Math.round(completion * 100);
  const displayName = profile.full_name ?? "";
  const initial = (profile.nickname ?? displayName).charAt(0).toUpperCase() || "A";

  return (
    <Link href="/athlete/profile" className="relative flex shrink-0" title={`Perfil ${filled}% completo`}>
      <div
        style={{ width: SIZE + 4, height: SIZE + 4 }}
        className="relative flex items-center justify-center"
      >
        {/* Progress ring */}
        <svg
          width={SIZE + 4}
          height={SIZE + 4}
          viewBox={`0 0 ${SIZE + 4} ${SIZE + 4}`}
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx={(SIZE + 4) / 2}
            cy={(SIZE + 4) / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth="2"
          />
          {/* Progress */}
          {completion > 0 && (
            <circle
              cx={(SIZE + 4) / 2}
              cy={(SIZE + 4) / 2}
              r={RADIUS}
              fill="none"
              stroke={completion === 1 ? "var(--accent)" : "var(--accent)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${completion * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              opacity={completion === 1 ? 1 : 0.7}
            />
          )}
        </svg>

        {/* Avatar */}
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

        {/* Incomplete indicator dot */}
        {completion < 1 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-yellow-400 ring-2 ring-bg-base">
            <span className="sr-only">Perfil incompleto</span>
          </span>
        )}
      </div>
    </Link>
  );
}

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, nickname, avatar_url, phone, birth_date, emergency_contact, profile_type"
    )
    .eq("id", user.id)
    .single();

  if (!rawProfile) redirect("/onboarding/role");

  const profile: AthleteProfileData = rawProfile;
  const completion = getProfileCompletion(profile);

  // Fetch all active boxes
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, status, box_id, boxes(id, name, slug, logo_url, approval_status)")
    .eq("user_id", user.id)
    .in("status", ["active", "suspended"])
    .order("created_at");

  const allBoxes: AthleteBox[] = (memberships ?? [])
    .filter((m) => m.status === "active")
    .map((m) => {
      const box = m.boxes as unknown as { id: string; name: string; slug: string; logo_url: string | null; approval_status: string | null } | null;
      if (!box?.id) return null;
      return { id: box.id, name: box.name, slug: box.slug, logo_url: box.logo_url, role: m.role, approval_status: box.approval_status };
    })
    .filter((b): b is AthleteBox => b !== null);


  const cookieStore = await cookies();
  const preferredBoxId = cookieStore.get("athlete_active_box")?.value;
  const activeBox =
    (preferredBoxId ? allBoxes.find((b) => b.id === preferredBoxId) : null) ?? allBoxes[0] ?? null;

  const isProfessional = profile.profile_type === "professional";

  // Notification data for the active box
  const [notifUnread, notifList, notifPrefs] = activeBox
    ? await Promise.all([
        getUnreadCount(user.id, activeBox.id),
        listNotifications(activeBox.id),
        getPreferences(user.id, activeBox.id),
      ])
    : [0, [], []];

  return (
    <div className="flex h-[100svh] bg-bg-base text-foreground">

      {/* ── Sidebar (desktop) ─────────────────────────────────── */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-bg-base">
        {/* Wordmark */}
        <div className="px-5 pb-4 pt-6">
          <Link href="/athlete" aria-label="Início">
            <AppLogo size="xl" compact />
          </Link>
        </div>

        {/* Nav */}
        <AthleteSidebar boxes={allBoxes} activeBox={activeBox} isProfessional={isProfessional} />
      </aside>

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top header */}
        <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          {/* Mobile: tappable box switcher chip */}
          <div className="lg:hidden">
            <BoxSwitchChip boxes={allBoxes} activeBox={activeBox} isProfessional={isProfessional} />
          </div>

          {/* Desktop: empty left side (sidebar handles nav) */}
          <div className="hidden lg:block" />

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            {activeBox && (
              <NotificationBell
                boxId={activeBox.id}
                userId={user.id}
                initialUnread={notifUnread}
                initialNotifications={notifList}
                initialPrefs={notifPrefs}
              />
            )}

            {/* Profile avatar with completion ring */}
            <ProfileCompletionAvatar profile={profile} completion={completion} />

            {/* Sign out (mobile) */}
            <form action={signOut} className="lg:hidden">
              <button
                type="submit"
                className="text-xs text-text-tertiary underline-offset-4 hover:text-text-secondary hover:underline"
              >
                Sair
              </button>
            </form>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 flex lg:hidden border-t border-border bg-bg-base/90 backdrop-blur-sm">
          <AthleteBottomNav boxes={allBoxes} activeBox={activeBox} isProfessional={isProfessional} />
        </nav>
      </div>
    </div>
  );
}
