import type { Metadata } from "next";
import { getAthleteProfile } from "@/lib/athlete/profile-actions";
import { supabaseServer } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { ProfileCompletion } from "./profile-completion";
import { AvatarUpload } from "./avatar-upload";
import { signOut } from "@/app/dashboard/actions";

export const metadata: Metadata = { title: "Perfil" };
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  partner: "Sócio",
  manager: "Gestor",
  coach: "Coach",
  athlete: "Atleta",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
  trial: "Trial",
  pending: "Pendente",
};

export default async function AthleteProfilePage() {
  const profile = await getAthleteProfile();

  const supabase = await supabaseServer();
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, status, created_at, boxes(name, slug)")
    .eq("user_id", profile.id)
    .order("created_at");

  const memberSince = format(new Date(profile.created_at), "MMMM 'de' yyyy", { locale: pt });
  const displayName = profile.nickname ?? profile.full_name ?? profile.email;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-7 space-y-8">

      {/* Avatar + nome */}
      <div className="flex flex-col items-center gap-3 text-center">
        <AvatarUpload
          userId={profile.id}
          avatarUrl={profile.avatar_url}
          displayName={displayName}
        />
        <div>
          <h1 className="font-display text-2xl uppercase text-text-primary">
            {profile.full_name ?? profile.email}
          </h1>
          {profile.nickname && (
            <p className="text-sm text-text-tertiary">"{profile.nickname}"</p>
          )}
          <p className="text-xs text-text-tertiary mt-1">Membro desde {memberSince}</p>
        </div>
      </div>

      {/* Completion — client component para reagir ao upload */}
      <ProfileCompletion profile={profile} />

      {/* Formulário */}
      <section className="space-y-3">
        <p className="label-caps text-text-tertiary">Informação pessoal</p>
        <div className="rounded-2xl border border-border bg-bg-card p-5">
          <ProfileForm profile={profile} />
        </div>
      </section>

      {/* Boxes */}
      {memberships && memberships.length > 0 && (
        <section className="space-y-3">
          <p className="label-caps text-text-tertiary">As minhas boxes</p>
          <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
            {memberships.map((m) => {
              const box = m.boxes as unknown as { name: string; slug: string } | null;
              if (!box) return null;
              const isActive = m.status === "active";
              return (
                <div key={box.slug} className="flex items-center justify-between px-5 py-3.5">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-text-primary">{box.name}</p>
                    <p className="text-xs text-text-tertiary">{ROLE_LABEL[m.role] ?? m.role}</p>
                  </div>
                  <span
                    className={[
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                      isActive
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-bg-input text-text-tertiary",
                    ].join(" ")}
                  >
                    {STATUS_LABEL[m.status] ?? m.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sessão */}
      <section className="space-y-3">
        <p className="label-caps text-text-tertiary">Sessão</p>
        <form action={signOut}>
          <button
            type="submit"
            className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-bg-card px-5 py-4 text-sm font-medium text-text-secondary transition-colors duration-150 hover:border-error/40 hover:bg-error/5 hover:text-error"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-input text-text-tertiary transition-colors duration-150 group-hover:bg-error/10 group-hover:text-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
                <path d="M10.5 11L14 8l-3.5-3M14 8H6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Terminar sessão
          </button>
        </form>
      </section>
    </div>
  );
}
