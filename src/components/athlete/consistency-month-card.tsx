import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { localDayIso } from "@/lib/time";
import type { AthleteConsistency } from "@/lib/athlete/consistency-actions";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function monthLabel(year: number, month: number): string {
  return capitalize(format(new Date(Date.UTC(year, month - 1, 1)), "MMMM", { locale: pt }));
}

function daysRemainingInMonth(): number {
  const [y, m, d] = localDayIso().split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return lastDay - d;
}

export function ConsistencyMonthCard({
  month,
  boxName,
}: {
  month: AthleteConsistency["month"];
  boxName: string;
}) {
  const { sessions, record, isNewRecord } = month;

  if (isNewRecord) {
    const daysLeft = daysRemainingInMonth();
    return (
      <div
        className="rounded-2xl border p-5"
        style={{
          borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
          background: "linear-gradient(180deg, color-mix(in srgb, var(--accent) 6%, transparent), transparent)",
        }}
      >
        <div className="mb-2.5 flex items-baseline justify-between gap-2">
          <p className="label-caps text-text-tertiary">Recorde do mês</p>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
            Novo recorde
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-[34px] leading-none text-accent">
            {sessions} <span className="font-sans text-[13px] font-normal text-text-secondary">treinos</span>
          </p>
          {record && (
            <span className="shrink-0 text-[11.5px] text-text-tertiary">
              anterior <b className="font-semibold text-text-secondary">{record.sessions}</b>
            </span>
          )}
        </div>
        <div className="relative my-3.5 h-1.5 overflow-hidden rounded-full bg-bg-input">
          <div className="h-full rounded-full bg-accent" style={{ width: "100%" }} />
        </div>
        <p className="text-[11.5px] text-text-tertiary">
          O teu melhor mês de sempre na {boxName}.
          {daysLeft > 0 && ` Faltam ${daysLeft} dia${daysLeft === 1 ? "" : "s"}.`}
        </p>
      </div>
    );
  }

  const remaining = record ? Math.max(0, record.sessions - sessions) : null;
  const barPct = record ? Math.min(100, (sessions / record.sessions) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <p className="label-caps text-text-tertiary">Recorde do mês</p>
        <span className="shrink-0 text-[11.5px] text-text-tertiary">{monthLabel(month.year, month.month)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-[34px] leading-none text-text-primary">
          {sessions} <span className="font-sans text-[13px] font-normal text-text-secondary">treinos</span>
        </p>
        {record && (
          <span className="shrink-0 text-[11.5px] text-text-tertiary">
            <b className="font-semibold text-text-secondary">{record.sessions}</b> · {monthLabel(record.year, record.month)}
          </span>
        )}
      </div>
      {record ? (
        <>
          <div className="relative my-3.5 h-1.5 overflow-hidden rounded-full bg-bg-input">
            <div className="h-full rounded-full bg-accent" style={{ width: `${barPct}%` }} />
            <div className="absolute -top-[3px] h-3 w-0.5 rounded-sm bg-border-strong" style={{ left: "calc(100% - 2px)" }} />
          </div>
          <p className="text-[11.5px] text-text-tertiary">
            {remaining === 0 ? (
              "Estás a igualar o teu recorde."
            ) : (
              <>
                Faltam <b className="font-semibold text-text-secondary">{remaining}</b> para bateres o teu recorde.
              </>
            )}
          </p>
        </>
      ) : (
        <p className="mt-3.5 text-[11.5px] text-text-tertiary">Ainda sem recorde — este é o teu primeiro mês.</p>
      )}
    </div>
  );
}
