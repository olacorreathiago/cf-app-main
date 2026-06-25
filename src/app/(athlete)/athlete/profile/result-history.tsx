"use client";

import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { AthleteResultEntry, AthletePrEntry } from "@/lib/athlete/history-actions";

const WOD_TYPE_COLOR: Record<string, string> = {
  AMRAP: "bg-blue-500/10 text-blue-500",
  "For Time": "bg-orange-500/10 text-orange-500",
  "For Load": "bg-purple-500/10 text-purple-500",
  EMOM: "bg-teal-500/10 text-teal-500",
  Tabata: "bg-pink-500/10 text-pink-500",
  Custom: "bg-bg-input text-text-tertiary",
};

function formatPrValue(value: number, unit: string): string {
  if (unit === "seconds") {
    const m = Math.floor(value / 60);
    const s = Math.round(value % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (unit === "kg" || unit === "lb") return `${value} ${unit}`;
  return `${value} reps`;
}

interface SetsData {
  set?: number;
  round?: number;
  reps?: number;
  weight?: number;
  time?: number;
}

function SetsDetail({ setsData, scoreType }: { setsData: unknown; scoreType: string }) {
  const sets = setsData as SetsData[] | null;
  if (!sets || !Array.isArray(sets) || sets.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {sets.map((s, i) => {
        const label = s.set != null ? `Set ${s.set}` : s.round != null ? `Ronda ${s.round}` : `#${i + 1}`;
        let value = "";
        if (scoreType === "weight" && s.weight != null) value = `${s.reps ?? "—"} reps × ${s.weight} kg`;
        else if ((scoreType === "round-best" || scoreType === "round-worst" || scoreType === "round-total") && s.time != null) {
          const m = Math.floor(s.time / 60);
          const sec = Math.round(s.time % 60);
          value = `${m}:${String(sec).padStart(2, "0")}`;
        } else if (s.reps != null) value = `${s.reps} reps`;
        return (
          <div key={i} className="flex items-center justify-between text-xs text-text-tertiary">
            <span>{label}</span>
            <span>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function ResultCard({ result }: { result: AthleteResultEntry }) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = WOD_TYPE_COLOR[result.wod_type] ?? WOD_TYPE_COLOR.Custom;
  const hasSets = Array.isArray(result.sets_data) && (result.sets_data as unknown[]).length > 0;

  return (
    <div className="px-5 py-3.5 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-text-primary truncate">{result.wod_title}</p>
            {result.is_pr && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                PR
              </span>
            )}
            {result.is_benchmark && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-bg-input text-text-tertiary shrink-0">
                Benchmark
              </span>
            )}
          </div>
          <p className="text-xs text-text-tertiary mt-0.5">
            {format(new Date(result.recorded_at), "d MMM yyyy", { locale: pt })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${typeColor}`}>
            {result.wod_type}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {result.dnf ? (
            <span className="text-sm text-red-500 font-medium">DNF</span>
          ) : result.score_display ? (
            <span className="text-sm font-semibold text-text-primary">{result.score_display}</span>
          ) : null}
          {result.rx && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400">
              RX
            </span>
          )}
          {result.notes && (
            <span className="text-xs text-text-tertiary italic truncate max-w-[140px]">
              {result.notes}
            </span>
          )}
        </div>
        {hasSets && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {expanded ? "Ocultar" : "Detalhe"}
          </button>
        )}
      </div>

      {expanded && hasSets && (
        <SetsDetail setsData={result.sets_data} scoreType={result.score_type} />
      )}
    </div>
  );
}

export function ResultHistory({ results }: { results: AthleteResultEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? results : results.slice(0, 10);

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card px-5 py-8 text-center">
        <p className="text-sm text-text-tertiary">Ainda não registaste nenhum resultado.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
      {visible.map((r) => (
        <ResultCard key={r.id} result={r} />
      ))}
      {results.length > 10 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full px-5 py-3 text-xs text-text-tertiary hover:text-text-secondary transition-colors text-center"
        >
          Ver mais {results.length - 10} resultados
        </button>
      )}
    </div>
  );
}

export function PrsByMovement({ prs }: { prs: AthletePrEntry[] }) {
  if (prs.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card px-5 py-8 text-center">
        <p className="text-sm text-text-tertiary">Ainda não tens Personal Records registados.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
      {prs.map((pr) => (
        <div key={pr.id} className="flex items-center justify-between px-5 py-3.5">
          <div>
            <p className="text-sm font-medium text-text-primary capitalize">{pr.movement}</p>
            <p className="text-xs text-text-tertiary mt-0.5">
              {format(new Date(pr.achieved_at), "d MMM yyyy", { locale: pt })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {formatPrValue(pr.value, pr.unit)}
            </span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
              PR
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
