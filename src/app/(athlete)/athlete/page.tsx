import type { Metadata } from "next";
import { getAthleteDashboardData } from "@/lib/athlete/dashboard-actions";

export const metadata: Metadata = { title: "Início" };
import { ClassCard } from "@/components/athlete/class-card";
import { WodCard } from "@/components/athlete/wod-card";
import { FeedPreview } from "@/components/athlete/feed-preview";
import { getLatestBoxPosts } from "@/lib/athlete/feed-actions";
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

export default async function AthleteDashboardPage() {
  const {
    profile, activeBox, todayClasses, todayWods,
    upcomingClasses, cutoffHours, advanceDays, maxWaitlist,
    statsWodsThisMonth,
  } = await getAthleteDashboardData();

  const latestPosts = activeBox ? await getLatestBoxPosts(activeBox.id, 3) : [];

  const nameDisplay = buildGreeting(profile.full_name, profile.nickname);
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: pt });
  const todayLabelCapitalized = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  const monthLabel = format(new Date(), "MMMM", { locale: pt });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-7">

      {/* Greeting */}
      <div className="mb-7 space-y-1">
        <h1 className="font-display text-3xl uppercase text-text-primary">Hello, {nameDisplay}</h1>
        <p className="label-caps text-text-tertiary">{todayLabelCapitalized}</p>
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
                      <ClassCard key={cls.id} cls={cls} cutoffHours={cutoffHours} advanceDays={advanceDays} maxWaitlist={maxWaitlist} boxId={activeBox.id} noFade />
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
                    <ClassCard key={cls.id} cls={cls} cutoffHours={cutoffHours} advanceDays={advanceDays} maxWaitlist={maxWaitlist} showDate boxId={activeBox.id} noFade />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────── */}
          <div className="space-y-6">

            {/* WOD hero card — WODs this month */}
            <Link
              href="/athlete/classes"
              className="group relative block overflow-hidden rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-0.5"
              style={{ minHeight: 150, background: "linear-gradient(150deg, color-mix(in srgb, var(--accent) 92%, white) 0%, var(--accent) 55%, color-mix(in srgb, var(--accent) 78%, black) 100%)" }}
            >
              {/* Soft light blobs */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-12 -left-6 h-40 w-40 rounded-full bg-black/5" />

              {/* Lightning glyph, top-right */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="absolute right-6 top-6" style={{ color: "rgba(0,0,0,0.8)" }}>
                <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>

              <p className="relative text-6xl font-display font-bold leading-none" style={{ color: "rgba(0,0,0,0.85)" }}>
                {statsWodsThisMonth}
              </p>
              <p className="relative mt-2 text-sm font-medium" style={{ color: "rgba(0,0,0,0.6)" }}>
                WOD&apos;s em {monthLabelCap}
              </p>

              <span className="relative mt-6 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "rgba(0,0,0,0.7)" }}>
                Ver Histórico
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transition-transform duration-200 group-hover:translate-x-0.5">
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>

            {/* Feed de notícias */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="label-caps text-text-tertiary">Feed de notícias</p>
                <Link href="/athlete/feed" className="text-xs text-text-tertiary hover:text-text-primary transition-colors">
                  Ver feed →
                </Link>
              </div>
              {latestPosts.length > 0 ? (
                <FeedPreview posts={latestPosts} boxName={activeBox.name} />
              ) : (
                <div className="rounded-2xl border border-border bg-bg-card px-4 py-10 text-center">
                  <p className="text-sm text-text-tertiary">Sem notícias no feed da box</p>
                </div>
              )}
            </section>

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

