"use client";

import type { AthletePresencasData } from "@/lib/box/athlete-profile-actions";

interface Props {
  data: AthletePresencasData;
}

const attendanceStatus = (b: AthletePresencasData["bookings"][0]) => {
  const classDate = new Date(b.class_starts_at);
  if (classDate > new Date()) return "futuro";
  if (b.attended === true || b.checked_in_at !== null) return "presente";
  return "faltou";
};

const statusPill: Record<string, string> = {
  presente: "bg-success/10 text-success",
  faltou:   "bg-error/10 text-error",
  futuro:   "bg-accent/10 text-accent",
};

const statusLabel: Record<string, string> = {
  presente: "Presente",
  faltou:   "Faltou",
  futuro:   "Agendado",
};

export function TabPresencas({ data }: Props) {
  const { bookings, totalConfirmed, totalAttended, thisMonthAttended, lastMonthAttended } = data;

  const presenceRate =
    totalConfirmed > 0 ? Math.round((totalAttended / totalConfirmed) * 100) : 0;

  const monthDiff = thisMonthAttended - lastMonthAttended;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Presenças"
          value={String(totalAttended)}
          sub={`${totalConfirmed - totalAttended} faltas`}
          subClass={(totalConfirmed - totalAttended) > 0 ? "text-error" : "text-text-tertiary"}
        />
        <StatCard
          label="Este mês"
          value={String(thisMonthAttended)}
          sub={
            monthDiff === 0
              ? "igual ao mês anterior"
              : monthDiff > 0
              ? `+${monthDiff} vs. mês anterior`
              : `${monthDiff} vs. mês anterior`
          }
          subClass={monthDiff >= 0 ? "text-success" : "text-error"}
        />
        <StatCard
          label="Taxa de presença"
          value={`${presenceRate}%`}
          sub={presenceRate >= 80 ? "Boa regularidade" : presenceRate >= 50 ? "Regularidade média" : "Baixa regularidade"}
          subClass={presenceRate >= 80 ? "text-success" : presenceRate >= 50 ? "text-warning" : "text-error"}
        />
      </div>

      {/* List */}
      {bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="text-sm text-text-tertiary">Sem aulas registadas.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border">
          {bookings.map((b) => {
            const st = attendanceStatus(b);
            const date = new Date(b.class_starts_at);
            const dateStr = date.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
            const timeStr = date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-input text-text-tertiary">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{b.class_name}</p>
                  <p className="text-xs text-text-tertiary">{dateStr} · {timeStr}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPill[st]}`}>
                  {statusLabel[st]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  subClass = "text-text-tertiary",
}: {
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
}) {
  return (
    <div className="rounded-xl bg-bg-input px-4 py-3">
      <p className="text-xs text-text-tertiary mb-1">{label}</p>
      <p className="text-2xl font-medium text-text-primary">{value}</p>
      {sub && <p className={`text-xs mt-1 ${subClass}`}>{sub}</p>}
    </div>
  );
}
