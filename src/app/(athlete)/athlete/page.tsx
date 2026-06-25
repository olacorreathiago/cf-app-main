import { getAthleteDashboardData } from "@/lib/athlete/dashboard-actions";
import type { AthleteDashboardPr } from "@/lib/athlete/dashboard-actions";
import { ClassCard } from "@/components/athlete/class-card";
import { WodCard } from "@/components/athlete/wod-card";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import Link from "next/link";

function buildGreeting(fullName: string | null, nickname: string | null): string {
  if (!fullName && !nickname) return "atleta";
  if (!fullName) return `"${nickname}"`;
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0];
  const rest = parts.slice(1).join(" ");
  if (nickname) return rest ? `${first} "${nickname}" ${rest}` : `${first} "${nickname}"`;
  return fullName;
}

// ── Mock data for community section (replace with real data when available) ──
const MOCK_ANNOUNCEMENTS = [
  {
    id: "1",
    type: "event" as const,
    title: "Competition Day",
    body: "Sábado, 28 Jun — Inscrições abertas até sexta. Equipas de 2.",
    cta: "Inscrever",
  },
  {
    id: "2",
    type: "news" as const,
    title: "Novo horário de verão",
    body: "A partir de 1 Jul, as aulas das 12h passam para as 12h30.",
    cta: null,
  },
  {
    id: "3",
    type: "note" as const,
    title: "Limpeza de equipamento",
    body: "Por favor limpem as barras e kettlebells após o treino. Obrigado!",
    cta: null,
  },
];

export default async function AthleteDashboardPage() {
  const {
    profile, activeBox, todayClasses, todayWods,
    upcomingClasses, recentPrs, cutoffHours, advanceDays,
    statsWodsThisMonth, statsWodsPrevMonth, statsTotalPrs,
  } = await getAthleteDashboardData();

  const nameDisplay = buildGreeting(profile.full_name, profile.nickname);
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: pt });
  const todayLabelCapitalized = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  const monthLabel = format(new Date(), "MMMM", { locale: pt });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-7">

      {/* Greeting */}
      <div className="mb-7 space-y-0.5">
        <p className="text-xs text-text-tertiary">{todayLabelCapitalized}</p>
        <h1 className="font-display text-2xl text-text-primary">Olá, {nameDisplay}</h1>
      </div>

      {/* No box */}
      {!activeBox && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-card border border-border">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-text-tertiary">
              <rect x="2" y="2" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 8h18" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Ainda não pertences a nenhuma box</p>
            <p className="text-xs text-text-tertiary mt-1">Pede um convite ao teu coach para começar.</p>
          </div>
        </div>
      )}

      {activeBox && (
        /* Two-column layout on desktop */
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">

          {/* ── LEFT COLUMN ─────────────────────────────────── */}
          <div className="space-y-8 min-w-0">

            {/* Aulas de hoje */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="label-caps text-text-tertiary">Aulas de hoje</p>
                <Link href="/athlete/classes" className="text-xs text-text-tertiary hover:text-text-primary transition-colors">
                  Ver agenda →
                </Link>
              </div>
              {todayClasses.filter((c) => c.my_booking_status === "confirmed").length === 0 ? (
                <EmptyCard text="Sem aulas reservadas hoje" />
              ) : (
                <div className="space-y-2">
                  {todayClasses
                    .filter((c) => c.my_booking_status === "confirmed")
                    .map((cls) => (
                      <ClassCard key={cls.id} cls={cls} cutoffHours={cutoffHours} advanceDays={advanceDays} boxId={activeBox.id} noFade />
                    ))}
                </div>
              )}
            </section>

            {/* WOD do dia — só WODs de aulas em que o atleta está inscrito */}
            {todayWods.length > 0 && (
              <section className="space-y-3">
                <p className="label-caps text-text-tertiary">WOD do dia</p>
                <div className="space-y-3">
                  {todayWods.map((wod) => (
                    <WodCard key={wod.id} wod={wod} boxId={activeBox.id} />
                  ))}
                </div>
              </section>
            )}

            {/* Próximas aulas onde está inscrito */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="label-caps text-text-tertiary">Próximas aulas</p>
                <Link href="/athlete/classes" className="text-xs text-text-tertiary hover:text-text-primary transition-colors">
                  Ver todas →
                </Link>
              </div>
              {upcomingClasses.length === 0 ? (
                <EmptyCard text="Sem aulas reservadas nos próximos dias" />
              ) : (
                <div className="space-y-2">
                  {upcomingClasses.map((cls) => (
                    <ClassCard key={cls.id} cls={cls} cutoffHours={cutoffHours} advanceDays={advanceDays} showDate boxId={activeBox.id} noFade />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────── */}
          <div className="space-y-4">

            {/* Hero stat — WODs este mês */}
            {(() => {
              const diff = statsWodsThisMonth - statsWodsPrevMonth;
              const pct = statsWodsPrevMonth === 0
                ? null
                : Math.round((diff / statsWodsPrevMonth) * 100);
              const positive = diff >= 0;
              return (
                <div
                  className="relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between"
                  style={{ minHeight: 160, background: "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, black) 100%)" }}
                >
                  {/* BG decoration */}
                  <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-10 bg-black" />
                  <div className="pointer-events-none absolute -bottom-8 -left-4 h-40 w-40 rounded-full opacity-5 bg-black" />

                  <div className="relative">
                    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" className="mb-3 opacity-50" style={{ color: "rgba(0,0,0,0.7)" }}>
                      <path d="M14 4v6M14 18v6M4 14h6M18 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <p className="text-5xl font-display font-bold leading-none" style={{ color: "rgba(0,0,0,0.85)" }}>{statsWodsThisMonth}</p>
                    <p className="mt-1.5 text-sm" style={{ color: "rgba(0,0,0,0.55)" }}>WODs em {monthLabelCap}</p>
                  </div>

                  <div className="relative mt-4 flex items-center justify-between">
                    <Link
                      href="/athlete/classes"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{ color: "rgba(0,0,0,0.6)" }}
                    >
                      Ver histórico
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                    {pct !== null && (
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.7)" }}>
                        {positive ? "+" : ""}{pct}% vs {format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), "MMM", { locale: pt })}
                      </span>
                    )}
                    {pct === null && statsWodsPrevMonth === 0 && statsWodsThisMonth > 0 && (
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.7)" }}>
                        Primeiro mês 🎉
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Two medium cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* PRs totais */}
              <div className="rounded-2xl border border-border bg-bg-card p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-amber-500/10 p-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-amber-500">
                      <path d="M7 1l1.5 3.5L12 5l-2.5 2.5.5 3.5L7 9.5 4 11l.5-3.5L2 5l3.5-.5L7 1z" fill="currentColor" />
                    </svg>
                  </span>
                </div>
                <p className="text-3xl font-display font-bold text-text-primary leading-none">{statsTotalPrs}</p>
                <p className="text-xs text-text-tertiary">Records pessoais</p>
              </div>

              {/* PRs esta semana (últimas 2 semanas) */}
              <div className="rounded-2xl border border-border bg-bg-card p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-green-500/10 p-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-green-500">
                      <path d="M2 10l3.5-4 2.5 2.5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
                <p className="text-3xl font-display font-bold text-text-primary leading-none">{recentPrs.length}</p>
                <p className="text-xs text-text-tertiary">PRs últimas 2 semanas</p>
              </div>
            </div>

            {/* PRs recentes */}
            {recentPrs.length > 0 && (
              <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <p className="label-caps text-text-tertiary">PRs recentes</p>
                </div>
                <div className="divide-y divide-border">
                  {recentPrs.slice(0, 5).map((pr) => (
                    <PrRow key={pr.id} pr={pr} />
                  ))}
                </div>
              </div>
            )}

            {/* Community / Box announcements */}
            <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <p className="label-caps text-text-tertiary">Recados da box</p>
                <span className="rounded-full bg-bg-input px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
                  {activeBox.name}
                </span>
              </div>
              <div className="divide-y divide-border">
                {MOCK_ANNOUNCEMENTS.map((a) => (
                  <AnnouncementRow key={a.id} item={a} />
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5 text-center">
      <p className="text-sm text-text-tertiary">{text}</p>
    </div>
  );
}

function PrRow({ pr }: { pr: AthleteDashboardPr }) {
  const unitLabel: Record<string, string> = { kg: "kg", lb: "lb", seconds: "seg", reps: "reps" };

  const valueDisplay = pr.unit === "seconds"
    ? `${Math.floor(pr.value / 60)}:${String(Math.round(pr.value % 60)).padStart(2, "0")}`
    : `${pr.value} ${unitLabel[pr.unit] ?? pr.unit}`;

  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-primary truncate">{pr.movement}</p>
        <p className="text-[11px] text-text-tertiary">
          {format(new Date(pr.achieved_at), "d MMM", { locale: pt })}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-500 uppercase">PR</span>
        <p className="text-sm font-semibold text-accent">{valueDisplay}</p>
      </div>
    </div>
  );
}

const ANNOUNCEMENT_ICONS = {
  event: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="text-accent">
      <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.35" />
      <path d="M5 1v3M9 1v3M1.5 6h11" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  ),
  news: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="text-blue-500">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.35" />
      <path d="M7 6.5V10" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <circle cx="7" cy="4.5" r="0.75" fill="currentColor" />
    </svg>
  ),
  note: (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="text-text-tertiary">
      <path d="M2.5 3.5h9M2.5 7h9M2.5 10.5h5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  ),
} as const;

function AnnouncementRow({ item }: { item: typeof MOCK_ANNOUNCEMENTS[number] }) {
  return (
    <div className="px-4 py-3 space-y-1">
      <div className="flex items-center gap-1.5">
        {ANNOUNCEMENT_ICONS[item.type]}
        <p className="text-xs font-semibold text-text-primary">{item.title}</p>
      </div>
      <p className="text-[11px] text-text-tertiary leading-relaxed">{item.body}</p>
      {item.cta && (
        <button className="mt-1 text-[11px] font-semibold text-accent hover:underline">
          {item.cta} →
        </button>
      )}
    </div>
  );
}
