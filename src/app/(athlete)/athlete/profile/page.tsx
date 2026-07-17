import type { Metadata } from "next";
import { getAthleteProfile } from "@/lib/athlete/profile-actions";
import { supabaseServer } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { ProfileCompletion } from "./profile-completion";
import { AvatarUpload } from "./avatar-upload";
import { signOut } from "@/app/dashboard/actions";
import { getMyPayments } from "@/lib/payments/actions";

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
    .select("role, status, plan_id, created_at, boxes(name, slug), plans:plan_id(name, price, billing_interval)")
    .eq("user_id", profile.id)
    .order("created_at");

  const payments = await getMyPayments().catch(() => []);

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

      {/* O meu plano */}
      {memberships && (() => {
        const athleteBoxes = memberships.filter(
          (m) => m.role === "athlete" && (m as unknown as { plan_id: string | null }).plan_id
        );
        if (athleteBoxes.length === 0) return null;

        return (
          <section className="space-y-3">
            <p className="label-caps text-text-tertiary">O meu plano</p>
            <div className="space-y-3">
              {athleteBoxes.map((m) => {
                const box = m.boxes as unknown as { name: string; slug: string } | null;
                const plan = (m as unknown as { plans: { name: string; price: number; billing_interval: string } | null }).plans;
                if (!box || !plan) return null;

                const memberPayments = (payments ?? [])
                  .filter((p: { kind: string; box_id: string | null; status: string }) =>
                    p.kind === "membership" &&
                    p.box_id === (m as unknown as { boxes: { slug: string } }).boxes?.slug // not accurate, use box matching
                  );

                const recentPayments = (payments ?? [])
                  .filter((p: { kind: string; status: string; period_start: string | null; boxes?: { slug: string } | null }) => {
                    const pBoxes = (p as unknown as { boxes: { slug: string } | null }).boxes;
                    return p.kind === "membership" && pBoxes?.slug === box.slug;
                  })
                  .slice(0, 6);

                return (
                  <div key={box.slug} className="rounded-2xl border border-border bg-bg-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-text-tertiary">{box.name}</p>
                        <p className="text-base font-semibold text-text-primary">{plan.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-text-primary tabular-nums">{plan.price.toFixed(2)} €</p>
                        <p className="text-xs text-text-tertiary">/{plan.billing_interval === "monthly" ? "mês" : "ano"}</p>
                      </div>
                    </div>

                    {recentPayments.length > 0 && (
                      <div className="border-t border-border/50 pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60 mb-2">Últimos pagamentos</p>
                        <div className="space-y-1">
                          {recentPayments.map((p: { id: string; period_start: string | null; status: string; paid_at: string | null }) => (
                            <div key={p.id} className="flex items-center justify-between text-xs">
                              <span className="text-text-secondary">
                                {p.period_start
                                  ? format(new Date(p.period_start), "MMMM yyyy", { locale: pt })
                                  : format(new Date(p.paid_at ?? ""), "dd/MM/yyyy", { locale: pt })}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  p.status === "paid"
                                    ? "bg-success/10 text-success"
                                    : "bg-warning/10 text-warning"
                                }`}
                              >
                                {p.status === "paid" ? "Pago" : "Pendente"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

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
