import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url, profile_type")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding/role");

  const displayName = profile.full_name ?? profile.email;

  return (
    <div className="flex min-h-[100svh] flex-col bg-bg-base">
      {/* Header — desktop only; mobile pages manage their own top bar */}
      <header className="sticky top-0 z-10 hidden lg:flex items-center justify-between border-b border-border bg-bg-base/80 px-6 py-4 backdrop-blur-sm">
        <Link href="/dashboard" className="flex items-center gap-3">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-text-primary">{displayName}</span>
        </Link>

        <form action={signOut}>
          <button
            type="submit"
            className="text-xs text-text-tertiary underline-offset-4 hover:text-text-secondary hover:underline transition-colors duration-150"
          >
            Sair
          </button>
        </form>
      </header>

      {/* Page content */}
      {children}
    </div>
  );
}
