import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getBoxOverviewData, type OverviewClass } from "@/lib/box/overview-actions";

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

  if (!box) redirect("/dashboard");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .in("role", ["owner", "partner", "manager", "coach"])
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const isManager = ["owner", "partner", "manager"].includes(membership.role);
  const overview = await getBoxOverviewData(box.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-5">
      {box.approval_status !== "approved" && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            A box está em análise pela plataforma. Algumas funcionalidades estão limitadas até à aprovação.
          </p>
        </div>
      )}

      {/* Hoje */}
      <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="label-caps text-text-tertiary">Hoje</p>
          <Link
            href={`/box/${slug}/classes`}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Ver todas →
          </Link>
        </div>

        {overview.todayClasses.length === 0 ? (
          <div className="px-5 pb-5">
            <p className="text-sm text-text-tertiary">Sem aulas publicadas para hoje.</p>
          </div>
        ) : (
          <div className="px-5 pb-4 space-y-2">
            {overview.todayClasses.map((cls) => (
              <ClassRow key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Membros ativos" value={String(overview.memberCount)} />
        <StatCard label="Aulas esta semana" value={String(overview.classesThisWeek)} />
        <StatCard label="WODs publicados" value={String(overview.totalWods)} />
      </section>

      {/* Ações rápidas — só para manager+ */}
      {isManager && (
        <section className="rounded-2xl border border-border bg-bg-card p-5 space-y-3">
          <p className="label-caps text-text-tertiary">Ações rápidas</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickAction href={`/box/${slug}/classes`} label="Publicar aula" />
            <QuickAction href={`/box/${slug}/wods`} label="Criar WOD" />
            <QuickAction href={`/box/${slug}/members`} label="Convidar membro" />
            <QuickAction href={`/box/${slug}/posts`} label="Criar post" />
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4 space-y-1">
      <p className="text-xs text-text-tertiary leading-tight">{label}</p>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center rounded-xl border border-border bg-bg-base px-3 py-3 text-xs font-medium text-text-secondary hover:bg-bg-input hover:text-text-primary transition-colors text-center leading-tight"
    >
      {label}
    </Link>
  );
}
