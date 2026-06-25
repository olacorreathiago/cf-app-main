import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_type, full_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding/role");

  // Athletes go to their own dashboard
  if (profile.profile_type === "athlete") redirect("/athlete");

  const isManager = profile.profile_type === "professional";
  const displayName = profile.full_name ?? profile.email;

  let box: { name: string; slug: string; approval_status: string } | null = null;
  if (isManager) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("boxes(name, slug, approval_status)")
      .eq("user_id", user.id)
      .in("role", ["owner", "partner", "manager"])
      .maybeSingle();

    if (membership?.boxes) {
      box = membership.boxes as unknown as { name: string; slug: string; approval_status: string };
    }
  }

  const approvalLabel: Record<string, string> = {
    pending_approval: "Em análise",
    approved: "Ativa",
    rejected: "Rejeitada",
  };

  return (
    <>
      {/* Mobile-only header */}
      <header className="flex lg:hidden items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-text-primary">{displayName}</span>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-xs text-text-tertiary underline-offset-4 hover:text-text-secondary hover:underline transition-colors duration-150">
            Sair
          </button>
        </form>
      </header>

      <main className="mx-auto w-full max-w-lg px-6 py-8">
        {isManager ? (
          box ? (
            <div className="space-y-3">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">{box.name}</p>
                <p className="text-[11px] text-text-tertiary">{approvalLabel[box.approval_status] ?? box.approval_status}</p>
              </div>
              {/* Ver meu perfil */}
              <Link
                href="/athlete"
                className="flex items-center justify-between rounded-2xl border border-border bg-bg-card px-5 py-4 transition-colors duration-150 hover:border-accent/40 hover:bg-bg-card-hover"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-input text-text-secondary shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M2.5 13c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-text-primary">Ver meu perfil</p>
                    <p className="text-xs text-text-tertiary">Aulas, PRs e resultados</p>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-tertiary">
                  <path d="M5 2l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              {/* Gerir a box */}
              <Link
                href={`/box/${box.slug}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-bg-card px-5 py-4 transition-colors duration-150 hover:border-accent/40 hover:bg-bg-card-hover"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-fg shrink-0">
                    <svg width="15" height="15" viewBox="0 0 13 13" fill="none">
                      <rect x="1.5" y="1.5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M1.5 5h10" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-text-primary">Gestão da box</p>
                    <p className="text-xs text-text-tertiary">Aulas, atletas e WODs</p>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-tertiary">
                  <path d="M5 2l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          ) : (
            <Link
              href="/dashboard/create-box"
              className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-bg-card px-5 py-4 transition-colors duration-150 hover:border-accent/40 hover:bg-bg-card-hover"
            >
              <div className="space-y-0.5">
                <p className="text-base font-semibold text-text-primary">Criar a minha box</p>
                <p className="text-sm text-text-tertiary">Configura o teu espaço na plataforma.</p>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </span>
            </Link>
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-3 pt-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M4 14h20M14 4l10 10-10 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
              </svg>
            </div>
            <div className="space-y-1">
              <h1 className="font-display text-3xl text-text-primary">Dashboard do atleta</h1>
              <p className="text-sm text-text-tertiary">Em construção — Fase 2</p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
