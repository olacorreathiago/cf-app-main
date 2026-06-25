"use client";

import { useState, useRef, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameMonth } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getAthleteResultsCalendar, getAthleteResultsForDay } from "@/lib/athlete/results-actions";
import type { ResultDay, ResultClass } from "@/lib/athlete/results-actions";
import { WodResultDrawer } from "@/components/athlete/wod-result-drawer";
import type { AthleteDashboardWod } from "@/lib/athlete/dashboard-actions";

const WOD_TYPE_COLOR: Record<string, string> = {
  AMRAP: "bg-blue-500/10 text-blue-500",
  "For Time": "bg-orange-500/10 text-orange-500",
  "For Load": "bg-purple-500/10 text-purple-500",
  EMOM: "bg-teal-500/10 text-teal-500",
  Tabata: "bg-pink-500/10 text-pink-500",
  Custom: "bg-bg-input text-text-tertiary",
};

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface Props {
  initialYear: number;
  initialMonth: number;
  daysWithResults: ResultDay[];
  activeBoxId: string;
}

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function MonthYearPicker({ currentDate, onSelect, onClose }: { currentDate: Date; onSelect: (d: Date) => void; onClose: () => void }) {
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const ref = useRef<HTMLDivElement>(null);
  const now = new Date();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-10 left-1/2 -translate-x-1/2 z-50 w-72 rounded-2xl border border-border bg-bg-base shadow-xl p-4 space-y-3"
    >
      {/* Year navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPickerYear((y) => y - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-input text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <p className="text-sm font-semibold text-text-primary">{pickerYear}</p>
        <button
          onClick={() => setPickerYear((y) => y + 1)}
          disabled={pickerYear >= now.getFullYear()}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-input text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {MONTHS_PT.map((name, i) => {
          const isFuture = pickerYear > now.getFullYear() || (pickerYear === now.getFullYear() && i > now.getMonth());
          const isSelected = pickerYear === currentDate.getFullYear() && i === currentDate.getMonth();
          return (
            <button
              key={i}
              onClick={() => { onSelect(new Date(pickerYear, i, 1)); onClose(); }}
              disabled={isFuture}
              className={cn(
                "rounded-xl py-1.5 text-xs font-medium transition-colors",
                isSelected && "bg-accent text-accent-fg",
                !isSelected && !isFuture && "bg-bg-input text-text-secondary hover:bg-bg-card hover:text-text-primary",
                isFuture && "opacity-25 cursor-not-allowed bg-bg-input text-text-tertiary",
              )}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ResultsCalendar({ initialYear, initialMonth, daysWithResults: initial, activeBoxId }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date(initialYear, initialMonth - 1, 1));
  const [daysWithResults, setDaysWithResults] = useState(initial);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayClasses, setDayClasses] = useState<ResultClass[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [drawerWod, setDrawerWod] = useState<AthleteDashboardWod | null>(null);
  const [drawerClassId, setDrawerClassId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const resultDates = new Set(daysWithResults.map((d) => d.date));

  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  // Monday-first grid offset (0=Mon … 6=Sun)
  const firstDayOfWeek = (getDay(days[0]) + 6) % 7;

  async function goToMonth(next: Date) {
    setCurrentDate(next);
    setSelectedDate(null);
    setDayClasses([]);
    setLoadingMonth(true);
    try {
      const data = await getAthleteResultsCalendar(next.getFullYear(), next.getMonth() + 1);
      setDaysWithResults(data.daysWithResults);
    } finally {
      setLoadingMonth(false);
    }
  }

  function navigateMonth(delta: number) {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    goToMonth(next);
  }

  async function selectDay(date: Date) {
    const key = format(date, "yyyy-MM-dd");
    if (selectedDate === key) {
      setSelectedDate(null);
      setDayClasses([]);
      return;
    }
    setSelectedDate(key);
    setLoadingDay(true);
    try {
      const data = await getAthleteResultsForDay(key);
      setDayClasses(data.classes);
    } finally {
      setLoadingDay(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="relative flex items-center justify-between">
        <button
          onClick={() => navigateMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-card border border-border text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={() => setPickerOpen((p) => !p)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-bg-input transition-colors"
        >
          <span className="font-semibold text-text-primary capitalize">
            {format(currentDate, "MMMM yyyy", { locale: pt })}
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={cn("text-text-tertiary transition-transform", pickerOpen && "rotate-180")}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {pickerOpen && (
          <MonthYearPicker
            currentDate={currentDate}
            onSelect={(d) => { goToMonth(d); }}
            onClose={() => setPickerOpen(false)}
          />
        )}

        <button
          onClick={() => navigateMonth(1)}
          disabled={isSameMonth(currentDate, new Date())}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-card border border-border text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className={cn("rounded-2xl border border-border bg-bg-card overflow-hidden transition-opacity", loadingMonth && "opacity-50 pointer-events-none")}>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-text-tertiary">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const hasResult = resultDates.has(key);
            const isSelected = selectedDate === key;
            const isFuture = day > new Date();

            return (
              <button
                key={key}
                onClick={() => !isFuture && selectDay(day)}
                disabled={isFuture}
                className={cn(
                  "relative flex flex-col items-center justify-center aspect-square text-sm transition-colors duration-150",
                  isFuture && "opacity-25 cursor-not-allowed",
                  !isFuture && "hover:bg-bg-input cursor-pointer",
                  isSelected && "bg-accent/10 hover:bg-accent/15",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    isToday(day) && !isSelected && "ring-1 ring-accent text-accent",
                    isSelected && "bg-accent text-accent-fg font-semibold",
                    !isSelected && !isToday(day) && "text-text-primary",
                  )}
                >
                  {format(day, "d")}
                </span>
                {hasResult && !isSelected && (
                  <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-text-tertiary">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" />
          Dia com resultado
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-accent text-accent text-[10px] font-semibold">
            {format(new Date(), "d")}
          </span>
          Hoje
        </div>
      </div>

      {/* Day detail */}
      {selectedDate && (
        <div className="space-y-4">
          <p className="label-caps text-text-tertiary capitalize">
            {format(new Date(selectedDate + "T12:00:00"), "EEEE, d MMMM", { locale: pt })}
          </p>

          {loadingDay ? (
            <div className="rounded-2xl border border-border bg-bg-card p-8 text-center">
              <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
            </div>
          ) : dayClasses.length === 0 ? (
            <div className="rounded-2xl border border-border bg-bg-card px-5 py-8 text-center space-y-1">
              <p className="text-sm font-medium text-text-primary">Sem resultados registados</p>
              <p className="text-xs text-text-tertiary">Não há resultados para este dia.</p>
            </div>
          ) : (
            dayClasses.map((cls) => (
              <div key={cls.class_id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="text-text-tertiary shrink-0">
                    <rect x="1" y="1.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M4 1v1.5M10 1v1.5M1 5.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <p className="text-xs font-semibold text-text-secondary">{cls.class_name} · {cls.starts_at.slice(11, 16)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
                  {cls.wods.map((wod) => {
                    const typeColor = WOD_TYPE_COLOR[wod.wod_type] ?? WOD_TYPE_COLOR.Custom;
                    return (
                      <div key={wod.wod_id} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-text-primary">{wod.wod_title}</p>
                              {wod.my_result?.is_pr && (
                                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">PR</span>
                              )}
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${typeColor}`}>
                            {wod.wod_type}
                          </span>
                        </div>

                        {wod.my_result ? (
                          <div className="mt-2 flex items-center gap-2">
                            {wod.my_result.dnf ? (
                              <span className="text-sm text-red-500 font-medium">DNF</span>
                            ) : (
                              <span className="text-sm font-semibold text-text-primary">{wod.my_result.score_display}</span>
                            )}
                            {wod.my_result.rx && (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400">RX</span>
                            )}
                            <button
                              onClick={() => {
                                const dashWod: AthleteDashboardWod = {
                                  id: wod.wod_id,
                                  title: wod.wod_title,
                                  type: wod.wod_type,
                                  category: "original",
                                  score_type: wod.score_type,
                                  description: wod.description,
                                  movements: wod.movements,
                                  time_cap_minutes: wod.time_cap_minutes,
                                  scaling_notes: null,
                                  result_sets: wod.result_sets,
                                  result_reps_per_set: wod.result_reps_per_set,
                                  my_result: {
                                    id: wod.my_result!.id,
                                    score_display: wod.my_result!.score_display ?? "",
                                    rx: wod.my_result!.rx,
                                    is_pr: wod.my_result!.is_pr,
                                  },
                                };
                                setDrawerWod(dashWod);
                                setDrawerClassId(cls.class_id);
                              }}
                              className="ml-auto text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                            >
                              Ver
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              const dashWod: AthleteDashboardWod = {
                                id: wod.wod_id,
                                title: wod.wod_title,
                                type: wod.wod_type,
                                category: "original",
                                score_type: wod.score_type,
                                description: wod.description,
                                movements: wod.movements,
                                time_cap_minutes: wod.time_cap_minutes,
                                scaling_notes: null,
                                result_sets: wod.result_sets,
                                result_reps_per_set: wod.result_reps_per_set,
                                my_result: null,
                              };
                              setDrawerWod(dashWod);
                              setDrawerClassId(cls.class_id);
                            }}
                            className="mt-2 text-xs text-accent hover:underline"
                          >
                            + Registar resultado
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* WodResultDrawer */}
      {drawerWod && (
        <WodResultDrawer
          wod={drawerWod}
          boxId={activeBoxId}
          classId={drawerClassId}
          open={!!drawerWod}
          onClose={() => setDrawerWod(null)}
          onSaved={(display, rx, isPR) => {
            // Refresh the day after saving
            if (selectedDate) {
              setLoadingDay(true);
              getAthleteResultsForDay(selectedDate).then((d) => {
                setDayClasses(d.classes);
                setLoadingDay(false);
              });
              // Mark this day as having a result
              setDaysWithResults((prev) => {
                if (prev.find((d) => d.date === selectedDate)) return prev;
                return [...prev, { date: selectedDate, count: 1 }];
              });
            }
            setDrawerWod(null);
          }}
        />
      )}
    </div>
  );
}
