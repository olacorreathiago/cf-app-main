"use client";

import { useState } from "react";
import { WodResultDrawer } from "./wod-result-drawer";
import type { AthleteDashboardWod } from "@/lib/athlete/dashboard-actions";

const WOD_TYPE_COLOR: Record<string, string> = {
  AMRAP: "bg-blue-500/10 text-blue-500",
  "For Time": "bg-orange-500/10 text-orange-500",
  "For Load": "bg-purple-500/10 text-purple-500",
  EMOM: "bg-teal-500/10 text-teal-500",
  Tabata: "bg-pink-500/10 text-pink-500",
  Custom: "bg-bg-card text-text-tertiary",
};

interface Props {
  wod: AthleteDashboardWod;
  boxId: string;
}

export function WodCard({ wod, boxId }: Props) {
  const colorClass = WOD_TYPE_COLOR[wod.type] ?? WOD_TYPE_COLOR.Custom;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [result, setResult] = useState(wod.my_result);

  function handleSaved(display: string, rx: boolean, isPR: boolean) {
    setResult({ id: "local", score_display: display, rx, is_pr: isPR });
  }

  return (
    <>
      <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-text-primary">{wod.title}</h3>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${colorClass}`}>
            {wod.type}
            {wod.time_cap_minutes ? ` · ${wod.time_cap_minutes}min` : ""}
          </span>
        </div>

        {wod.description && (
          <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">
            {wod.description}
          </p>
        )}

        {wod.movements.length > 0 && (
          <ul className="space-y-1">
            {wod.movements.map((m, i) => (
              <li key={i} className="flex items-baseline gap-2 text-sm">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span className="text-text-secondary">
                  {m.name}
                  {m.rx_weight && (
                    <span className="text-text-tertiary"> · {m.rx_weight}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {wod.scaling_notes && (
          <div className="rounded-xl bg-bg-input px-4 py-3">
            <p className="mb-1 text-xs font-medium text-text-tertiary">Escalas</p>
            <p className="text-xs text-text-secondary">{wod.scaling_notes}</p>
          </div>
        )}

        {/* Result / action */}
        <div className="pt-1 border-t border-border flex items-center justify-between gap-3">
          {result ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-accent">{result.score_display}</span>
              <span className={[
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                result.rx
                  ? "bg-accent/10 text-accent"
                  : "bg-bg-input text-text-tertiary",
              ].join(" ")}>
                {result.rx ? "RX" : "Scaled"}
              </span>
              {result.is_pr && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                  PR
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-text-tertiary">Sem resultado registado</span>
          )}

          <button
            onClick={() => setDrawerOpen(true)}
            className={[
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              result
                ? "border border-border text-text-secondary hover:border-accent/30 hover:text-accent"
                : "bg-accent text-accent-fg hover:bg-accent-hover",
            ].join(" ")}
          >
            {result ? "Editar resultado" : "Registar resultado"}
          </button>
        </div>
      </div>

      <WodResultDrawer
        wod={wod}
        boxId={boxId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
