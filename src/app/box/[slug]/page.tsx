import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getBoxOverviewData, type OverviewClass } from "@/lib/box/overview-actions";

export const metadata: Metadata = { title: "Visão Geral" };

interface Props {
  params: Promise<{ slug: string }>;
}

const STATUS_CONFIG = {
  ongoing: { label: "Em curso", cls: "bg-accent/10 text-accent" },
  upcoming: { label: "Próxima", cls: "bg-bg-input text-text-secondary" },
  finished: { label: "Terminada", cls: "bg-bg-input text-text-tertiary" },
};

function formatTime(starts_at: string): string {
  return new Date(starts_at).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function ClassRow({ cls }: { cls: OverviewClass }) {
  const cfg = STATUS_CONFIG[cls.status];
  const fillPct = cls.capacity > 0 ? Math.round((cls.confirmed_count / cls.capacity) * 100) : 0;
  const isFull = cls.confirmed_count >= cls.capacity;

  return (
    <div className={`flex items-stretch gap-0 rounded-xl overflow-hidden border ${cls.status === "ongoing" ? "border-accent/30 bg-accent/5" : "border-border bg-bg-base"}`}>
      {/* Time stripe */}
      <div className={`flex w-14 shrink-0 flex-col items-center justify-center py-3 ${cls.status === "ongoing" ? "bg-accent/10" : "bg-bg-input/50"}`}>
        <span className="text-xs font-semibold text-text-primary tabular-nums leading-none">
          {formatTime(cls.starts_at)}
        </span>
        <span className="mt-0.5 text-[9px] text-text-tertiary">{cls.duration_minutes}′</span>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-w-0 flex-col justify-center gap-1 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary truncate">{cls.name}</span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${cfg.cls}`}>
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {cls.coach_name && (
            <span className="text-xs text-text-tertiary truncate">{cls.coach_name}</span>
          )}
          {cls.first_wod_title && (
            <span className="text-xs text-text-secondary truncate">· {cls.first_wod_title}</span>
          )}
        </div>

        {/* Capacity bar */}
        <div className="flex items-center gap-2 mt-0.5">
          <div className="h-1 flex-1 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isFull ? "bg-red-400" : cls.status === "ongoing" ? "bg-accent" : "bg-text-tertiary/40"}`}
              style={{ width: `${Math.min(fillPct, 100)}%` }}
            />
          </div>
          <span className={`text-[10px] tabular-nums shrink-0 ${isFull ? "text-red-400" : "text-text-tertiary"}`}>
            {cls.confirmed_count}/{cls.capacity}
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function BoxOverviewPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name, slug, approval_status")
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

  const isManager = ["owner", "partner", "manager"].includes(membership.role);
  const overview = await getBoxOverviewData(box.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-7">
      {box.approval_status !== "approved" && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-400">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11" r="0.9" fill="currentColor" />
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </span>
          <p className="text-sm text-amber-500 dark:text-amber-300/90">
            A box <span className="font-semibold">{box.name}</span> está em análise pela plataforma. Algumas funcionalidades estão limitadas até à aprovação.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* ── LEFT COLUMN ─────────────────────────────────── */}
        <div className="space-y-8 min-w-0">

          {/* Aulas de hoje */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="label-caps text-text-tertiary">Aulas de hoje</p>
              <Link
                href={`/box/${slug}/today`}
                className="inline-flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
              >
                Gerir dia de hoje
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6h6M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            {overview.todayClasses.length === 0 ? (
              <div className="rounded-2xl border border-border bg-bg-card px-5 py-10 text-center">
                <p className="text-sm text-text-tertiary">Sem aulas publicadas para hoje.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overview.todayClasses.map((cls) => (
                  <ClassRow key={cls.id} cls={cls} />
                ))}
              </div>
            )}
          </section>

          {/* Estatísticas */}
          <section className="space-y-3">
            <p className="label-caps text-text-tertiary">Estatísticas</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Membros ativos" value={String(overview.memberCount)} />
              <StatCard label="Aulas esta semana" value={String(overview.classesThisWeek)} />
              <StatCard label="WODs publicados" value={String(overview.totalWods)} />
            </div>
          </section>
        </div>

        {/* ── RIGHT COLUMN — Ações rápidas ────────────────── */}
        {isManager && (
          <div className="space-y-3">
            <p className="label-caps text-text-tertiary">Ações rápidas</p>
            <div className="space-y-3 rounded-2xl bg-bg-card/40 p-3">
              <QuickAction href={`/box/${slug}/classes`} label="Publicar Aulas" icon={ClassesActionIcon} />
              <QuickAction href={`/box/${slug}/wods`} label="Criar Wod" icon={WodActionIcon} />
              <QuickAction href={`/box/${slug}/members`} label="Convidar Membros" icon={MembersActionIcon} />
              <QuickAction href={`/box/${slug}/posts`} label="Publicar no Feed" icon={FeedActionIcon} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5">
      <p className="text-sm text-text-secondary leading-tight">{label}</p>
      <p className="mt-6 font-display text-4xl font-bold leading-none text-text-primary">{value}</p>
    </div>
  );
}

const ClassesActionIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1" y="6" width="2.5" height="4" rx="1" stroke="currentColor" strokeWidth="1.35" />
    <rect x="12.5" y="6" width="2.5" height="4" rx="1" stroke="currentColor" strokeWidth="1.35" />
    <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
const WodActionIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 1.5L2 4.5v4.5c0 3 2.4 5.5 6 5.5s6-2.5 6-5.5V4.5L8 1.5z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    <path d="M5.5 8.5L7 10l3.5-3.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const MembersActionIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.35" />
    <path d="M1 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    <path d="M12 7c1.38 0 2.5 1.12 2.5 2.5v3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    <path d="M10 4.5a1.75 1.75 0 100-1" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
const FeedActionIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M11 2.5l2.5 2.5L6 12.5 3 13.5l1-3L11 2.5z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
  </svg>
);

function QuickAction({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-8 rounded-xl border border-border bg-bg-card p-4 transition-colors duration-150 hover:border-accent/30 hover:bg-bg-card-hover"
    >
      <span className="text-text-tertiary transition-colors duration-150 group-hover:text-accent">{icon}</span>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-primary">
        {label}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-text-tertiary transition-transform duration-200 group-hover:translate-x-0.5">
          <path d="M2.5 6h6M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}
