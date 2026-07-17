import type { Metadata } from "next";
import { getAthleteWeekClasses } from "@/lib/athlete/classes-actions";
import { ClassesClient } from "./classes-client";
import { format, startOfWeek, addWeeks, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import Link from "next/link";

export const metadata: Metadata = { title: "Aulas" };

interface Props {
  searchParams: Promise<{ week?: string }>;
}

export default async function AthleteClassesPage({ searchParams }: Props) {
  const { week } = await searchParams;
  const weekOffset = parseInt(week ?? "0", 10) || 0;

  const { classes, attendedClasses, boxName, boxId, settings } = await getAthleteWeekClasses(weekOffset);

  const baseDate = addWeeks(new Date(), weekOffset);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });

  const prevWeek = weekOffset - 1;
  const nextWeek = weekOffset + 1;
  const weekLabel = `${format(weekStart, "d MMM", { locale: pt })} – ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: pt })}`;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-7 space-y-6">

      {/* Header */}
      <div>
        <p className="label-caps text-text-tertiary">Aulas</p>
        <h1 className="font-display text-2xl uppercase text-text-primary">{boxName || "A minha box"}</h1>
        {settings.cancellation_window_hours > 0 && (
          <p className="text-xs text-text-tertiary mt-0.5">
            Inscrições fecham {settings.cancellation_window_hours}h antes de cada aula
          </p>
        )}
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-bg-card px-4 py-3">
        <Link
          href={`/athlete/classes?week=${prevWeek}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-input hover:text-text-primary"
          aria-label="Semana anterior"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary capitalize">{weekLabel}</p>
          {weekOffset === 0 && <p className="text-[10px] text-text-tertiary">Esta semana</p>}
          {weekOffset === -1 && <p className="text-[10px] text-text-tertiary">Semana passada</p>}
          {weekOffset < -1 && <p className="text-[10px] text-text-tertiary">{Math.abs(weekOffset)} semanas atrás</p>}
        </div>
        <Link
          href={`/athlete/classes?week=${nextWeek}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-input hover:text-text-primary"
          aria-label="Próxima semana"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <ClassesClient
        classes={classes}
        attendedClasses={attendedClasses}
        boxId={boxId}
        cutoffHours={settings.cancellation_window_hours}
        advanceDays={settings.booking_advance_days}
        maxWaitlist={settings.max_waitlist}
        weekStart={format(weekStart, "yyyy-MM-dd")}
        weekOffset={weekOffset}
      />

      {classes.length === 0 && weekOffset === 0 && (
        <div className="text-center">
          <Link href="/athlete/classes?week=1" className="text-xs text-accent hover:underline">
            Ver próxima semana →
          </Link>
        </div>
      )}
    </div>
  );
}
