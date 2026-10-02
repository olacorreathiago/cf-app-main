"use client";

import { useState } from "react";
import { WeekDots } from "./consistency-week-dots";
import { WeeklyGoalDrawer } from "./weekly-goal-drawer";
import type { AthleteConsistency } from "@/lib/athlete/consistency-actions";

export function ConsistencyHero({ boxId, consistency }: { boxId: string; consistency: AthleteConsistency }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { week, lastWeek } = consistency;

  // Monday, before the first training of the new week: showing "0 / N" would
  // be the worst possible card to greet someone with, so show last week's
  // close instead — the gold hero comes back the moment they train today.
  if (lastWeek && week.sessions === 0) {
    return <LastWeekCard lastWeek={lastWeek} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="group relative block w-full overflow-hidden rounded-2xl p-6 text-left transition-transform duration-200 hover:-translate-y-0.5"
        style={{
          minHeight: 150,
          background:
            "linear-gradient(150deg, color-mix(in srgb, var(--accent) 92%, white) 0%, var(--accent) 55%, color-mix(in srgb, var(--accent) 78%, black) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 -left-6 h-40 w-40 rounded-full bg-black/5" />

        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="absolute right-6 top-6" style={{ color: "rgba(0,0,0,0.8)" }}>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
        </svg>

        <p className="font-display relative text-6xl leading-none" style={{ color: "rgba(0,0,0,0.85)" }}>
          {week.sessions}
          {week.target != null && <span className="text-[26px]"> / {week.target}</span>}
        </p>
        <p className="relative mt-2 text-sm font-medium" style={{ color: "rgba(0,0,0,0.6)" }}>
          Treinos esta semana
        </p>

        <div className="relative">
          <WeekDots days={week.days} variant="gold" />
        </div>

        <PacePill week={week} />
      </button>

      <WeeklyGoalDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        boxId={boxId}
        currentTarget={week.target}
        systemTarget={week.systemTarget}
        isCustomTarget={week.isCustomTarget}
      />
    </>
  );
}

function PacePill({ week }: { week: AthleteConsistency["week"] }) {
  if (week.target == null) {
    return (
      <span className="relative mt-[18px] inline-flex items-center gap-1.5 rounded-full bg-black/[0.14] px-2.5 py-1 text-[11.5px] font-semibold text-black/70">
        A conhecer o teu ritmo · meta daqui a 2 semanas
      </span>
    );
  }

  if (week.pace == null) return null;

  const label =
    week.pace === "ahead" ? "Acima do ritmo" : week.pace === "on" ? "No ritmo" : `Faltam ${week.missingForTarget} para a meta`;

  return (
    <span className="relative mt-[18px] inline-flex items-center gap-1.5 rounded-full bg-black/[0.14] px-2.5 py-1 text-[11.5px] font-semibold text-black/70">
      {week.pace === "ahead" && (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M6 10V2M3 5l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {label}
    </span>
  );
}

function LastWeekCard({ lastWeek }: { lastWeek: NonNullable<AthleteConsistency["lastWeek"]> }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-6">
      <p className="label-caps text-text-tertiary">Semana passada</p>
      <p className="font-display mt-3.5 text-[52px] leading-none text-text-primary">
        {lastWeek.sessions}
        {lastWeek.target != null && <span className="text-2xl text-text-tertiary"> / {lastWeek.target}</span>}
      </p>
      <WeekDots days={lastWeek.days} variant="dark" />
      {lastWeek.target != null && (
        <p className="mt-[18px] text-[11.5px] text-text-tertiary">
          Nova semana começa hoje. Meta: <b className="font-semibold text-text-secondary">{lastWeek.target}</b>.
        </p>
      )}
    </div>
  );
}
