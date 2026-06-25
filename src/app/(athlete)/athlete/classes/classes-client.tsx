"use client";

import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ClassCard } from "@/components/athlete/class-card";
import type { AthleteDashboardClass } from "@/lib/athlete/dashboard-actions";

const WEEKDAY_LABEL = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface Props {
  classes: AthleteDashboardClass[];
  attendedClasses: AthleteDashboardClass[];
  boxId: string;
  cutoffHours: number;
  advanceDays: number;
  weekStart: string; // ISO date string "yyyy-MM-dd"
  weekOffset: number;
}

export function ClassesClient({
  classes,
  attendedClasses,
  boxId,
  cutoffHours,
  advanceDays,
  weekStart,
  weekOffset,
}: Props) {
  const [modalityFilter, setModalityFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const [dayFilter, setDayFilter] = useState(""); // "0"–"6" Mon–Sun index

  const weekStartDate = new Date(`${weekStart}T12:00:00`);

  function getDayIdx(startsAt: string) {
    return String((new Date(startsAt).getDay() + 6) % 7);
  }

  // Cross-filtered options: each dropdown only shows options available given the other two filters
  const availableModalities = useMemo(() => {
    const base = classes.filter((c) => {
      if (timeFilter && c.starts_at.slice(11, 16) !== timeFilter) return false;
      if (dayFilter && getDayIdx(c.starts_at) !== dayFilter) return false;
      return true;
    });
    return Array.from(new Set(base.map((c) => c.name))).sort();
  }, [classes, timeFilter, dayFilter]);

  const availableTimes = useMemo(() => {
    const base = classes.filter((c) => {
      if (modalityFilter && c.name !== modalityFilter) return false;
      if (dayFilter && getDayIdx(c.starts_at) !== dayFilter) return false;
      return true;
    });
    return Array.from(new Set(base.map((c) => c.starts_at.slice(11, 16)))).sort();
  }, [classes, modalityFilter, dayFilter]);

  const availableDays = useMemo(() => {
    const base = classes.filter((c) => {
      if (modalityFilter && c.name !== modalityFilter) return false;
      if (timeFilter && c.starts_at.slice(11, 16) !== timeFilter) return false;
      return true;
    });
    const idxs = Array.from(new Set(base.map((c) => getDayIdx(c.starts_at))));
    return idxs.sort((a, b) => Number(a) - Number(b));
  }, [classes, modalityFilter, timeFilter]);

  const showFilters = availableModalities.length > 1 || availableTimes.length > 1 || availableDays.length > 1;

  const hasActiveFilters = modalityFilter !== "" || timeFilter !== "" || dayFilter !== "";

  function clearFilters() {
    setModalityFilter("");
    setTimeFilter("");
    setDayFilter("");
  }

  const filtered = useMemo(() => {
    return classes.filter((c) => {
      if (modalityFilter && c.name !== modalityFilter) return false;
      if (timeFilter && c.starts_at.slice(11, 16) !== timeFilter) return false;
      if (dayFilter && getDayIdx(c.starts_at) !== dayFilter) return false;
      return true;
    });
  }, [classes, modalityFilter, timeFilter, dayFilter]);

  // Group by weekday index (0=Mon … 6=Sun)
  const byDay = useMemo(() => {
    const map: Record<number, AthleteDashboardClass[]> = {};
    for (const cls of filtered) {
      const d = new Date(cls.starts_at);
      const dayIdx = (d.getDay() + 6) % 7;
      if (!map[dayIdx]) map[dayIdx] = [];
      map[dayIdx].push(cls);
    }
    return map;
  }, [filtered]);

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <>
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {availableModalities.length > 1 && (
            <div className="relative">
              <select
                value={modalityFilter}
                onChange={(e) => setModalityFilter(e.target.value)}
                className={cn(
                  "h-9 rounded-xl border pl-3 pr-8 text-sm transition-all appearance-none cursor-pointer",
                  "focus:outline-none focus:ring-2 focus:ring-accent/30",
                  modalityFilter
                    ? "border-accent bg-accent text-accent-fg font-medium"
                    : "border-border bg-bg-input text-text-secondary"
                )}
              >
                <option value="">Modalidade</option>
                {availableModalities.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-current opacity-60">
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          {availableTimes.length > 1 && (
            <div className="relative">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className={cn(
                  "h-9 rounded-xl border pl-3 pr-8 text-sm transition-all appearance-none cursor-pointer",
                  "focus:outline-none focus:ring-2 focus:ring-accent/30",
                  timeFilter
                    ? "border-accent bg-accent text-accent-fg font-medium"
                    : "border-border bg-bg-input text-text-secondary"
                )}
              >
                <option value="">Horário</option>
                {availableTimes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-current opacity-60">
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          {availableDays.length > 1 && (
            <div className="relative">
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className={cn(
                  "h-9 rounded-xl border pl-3 pr-8 text-sm transition-all appearance-none cursor-pointer",
                  "focus:outline-none focus:ring-2 focus:ring-accent/30",
                  dayFilter
                    ? "border-accent bg-accent text-accent-fg font-medium"
                    : "border-border bg-bg-input text-text-secondary"
                )}
              >
                <option value="">Dia</option>
                {availableDays.map((idx) => (
                  <option key={idx} value={idx}>{WEEKDAY_LABEL[Number(idx)]}</option>
                ))}
              </select>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-current opacity-60">
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-9 rounded-xl border border-border bg-bg-input px-3 text-sm text-text-tertiary hover:border-red-200 hover:text-red-500 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Attended classes */}
      {!hasActiveFilters && attendedClasses.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="label-caps text-text-tertiary">Já participei</p>
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
              {attendedClasses.length}
            </span>
          </div>
          <div className="space-y-2">
            {attendedClasses.map((cls) => (
              <ClassCard key={cls.id} cls={cls} cutoffHours={cutoffHours} advanceDays={advanceDays} showDate boxId={boxId} />
            ))}
          </div>
        </section>
      )}

      {/* Classes list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-text-tertiary">
            {hasActiveFilters
              ? "Nenhuma aula corresponde aos filtros."
              : weekOffset === 0
              ? "Sem mais aulas publicadas esta semana."
              : "Sem aulas publicadas nesta semana."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-xs text-accent hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from({ length: 7 }, (_, i) => i).map((dayIdx) => {
            const dayCls = byDay[dayIdx];
            if (!dayCls || dayCls.length === 0) return null;
            const dayDate = addDays(weekStartDate, dayIdx);
            const isToday = format(dayDate, "yyyy-MM-dd") === today;
            return (
              <section key={dayIdx} className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <p className={cn("text-sm font-semibold", isToday ? "text-accent" : "text-text-primary")}>
                    {WEEKDAY_LABEL[dayIdx]}
                  </p>
                  <p className="text-xs text-text-tertiary">{format(dayDate, "d MMM", { locale: pt })}</p>
                  {isToday && (
                    <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      hoje
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {dayCls.map((cls) => (
                    <ClassCard key={cls.id} cls={cls} cutoffHours={cutoffHours} advanceDays={advanceDays} boxId={boxId} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
