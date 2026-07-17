"use client";

import { useTransition, useState, useEffect } from "react";
import { format, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { bookClass, cancelBooking } from "@/lib/athlete/booking-actions";
import { ClassDetailDrawer } from "./class-detail-drawer";
import { WodResultDrawer } from "./wod-result-drawer";
import type { AthleteDashboardClass, AthleteDashboardWod } from "@/lib/athlete/dashboard-actions";

interface Props {
  cls: AthleteDashboardClass;
  cutoffHours?: number;
  advanceDays?: number;
  maxWaitlist?: number;
  /** Show weekday + date in the time column (used in "Já participei" section) */
  showDate?: boolean;
  boxId?: string;
  /** Suppress opacity-40 on past/closed classes (e.g. dashboard view) */
  noFade?: boolean;
}

function formatTimeUntil(startsAt: Date, cutoffHours: number): {
  label: string;
  isClosed: boolean;
  isActive: boolean;
  isPast: boolean;
} {
  const now = new Date();
  const minutesUntil = differenceInMinutes(startsAt, now);

  if (minutesUntil < 0) return { label: "Terminada", isClosed: true, isActive: false, isPast: true };
  if (minutesUntil === 0) return { label: "A começar", isClosed: true, isActive: true, isPast: false };

  const hoursUntil = differenceInHours(startsAt, now);
  const daysUntil = differenceInDays(startsAt, now);
  const isClosed = hoursUntil < cutoffHours;

  let label: string;
  if (daysUntil >= 2) {
    label = format(startsAt, "EEE, d MMM", { locale: pt });
    label = label.charAt(0).toUpperCase() + label.slice(1);
  } else if (daysUntil === 1) {
    label = `Amanhã às ${format(startsAt, "HH:mm")}`;
  } else if (hoursUntil >= 1) {
    const remainingMins = minutesUntil - hoursUntil * 60;
    label = remainingMins > 0 ? `Em ${hoursUntil}h ${remainingMins}min` : `Em ${hoursUntil}h`;
  } else {
    label = `Em ${minutesUntil}min`;
  }

  return { label, isClosed, isActive: false, isPast: false };
}

/** Strips round-by-round detail from legacy score_display strings, keeping only the summary value. */
function shortScore(display: string): string {
  // "Melhor: 01:42 · 01:42 / 01:50 / ..."  → "01:42"
  // "Pior: 01:50 · ..."                     → "01:50"
  // "Total: 08:29 · ..."                    → "08:29"
  const prefixMatch = display.match(/^(?:Melhor|Pior|Total):\s*(\S+)/);
  if (prefixMatch) return prefixMatch[1];
  // "170 reps (20/15/10/...)"               → "170 reps"
  const parenMatch = display.match(/^(.+?)\s*\(/);
  if (parenMatch) return parenMatch[1].trim();
  // "5 rondas · ..."                        → "5 rondas"
  const dotMatch = display.match(/^(.+?)\s*·/);
  if (dotMatch) return dotMatch[1].trim();
  return display;
}

/** Parse class start time as "naive" local — strips Z so stored UTC is treated as local input */
function parseClassTime(isoStr: string): Date {
  return new Date(isoStr.replace("Z", "").replace(/\+\d{2}:\d{2}$/, ""));
}

export function ClassCard({ cls, cutoffHours = 1, advanceDays = 7, maxWaitlist = 5, showDate = false, boxId, noFade = false }: Props) {
  const startsAt = parseClassTime(cls.starts_at);
  const endsAt = new Date(startsAt.getTime() + cls.duration_minutes * 60_000);
  const now = new Date();
  const isRunning = now >= startsAt && now <= endsAt;

  // Booking window opens at: startsAt minus advanceDays
  const bookingOpensAt = new Date(startsAt.getTime() - advanceDays * 24 * 3_600_000);
  const isTooEarly = now < bookingOpensAt;
  const msUntilOpen = bookingOpensAt.getTime() - now.getTime();
  const daysUntilOpen = Math.floor(msUntilOpen / (24 * 3_600_000));
  const hoursUntilOpen = Math.floor((msUntilOpen % (24 * 3_600_000)) / 3_600_000);
  const bookingOpensLabel = daysUntilOpen > 0
    ? `${daysUntilOpen}d e ${hoursUntilOpen}h`
    : `${hoursUntilOpen}h`;

  const [mounted, setMounted] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  useEffect(() => {
    setMounted(true);
    const startMs = startsAt.getTime();
    const durationMs = cls.duration_minutes * 60_000;
    function update() {
      const elapsed = Date.now() - startMs;
      setProgressPct(Math.min(100, Math.max(0, (elapsed / durationMs) * 100)));
    }
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { label: timeLabel, isClosed, isPast } = formatTimeUntil(startsAt, cutoffHours);

  const [bookingStatus, setBookingStatus] = useState(cls.my_booking_status);
  const [confirmedCount, setConfirmedCount] = useState(cls.confirmed_count);
  const [waitlistPosition] = useState(cls.my_waitlist_position);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [resultWod, setResultWod] = useState<AthleteDashboardWod | null>(null);
  const [localWods, setLocalWods] = useState<AthleteDashboardWod[]>(cls.wods ?? []);

  const spotsLeft = Math.max(0, cls.capacity - confirmedCount);
  const isFull = spotsLeft === 0;
  const isBooked = bookingStatus === "confirmed";
  const isWaitlisted = bookingStatus === "waitlist";
  const canBook = !isClosed && !isPast && !isTooEarly;
  const canCancel = (isBooked || isWaitlisted) && !isPast;

  // Show result section: class ended (past but not still running), athlete was
  // confirmed AND checked-in (attended = true). Without check-in there is no
  // access to the WOD nor result registration.
  const isCheckedIn = cls.my_attended === true;
  const isAbsent = cls.my_attended === false;
  const showResultSection = isPast && !isRunning && bookingStatus === "confirmed" && !!boxId && isCheckedIn;
  const showNoCheckinNotice = isPast && !isRunning && bookingStatus === "confirmed" && !!boxId && !isCheckedIn;

  function handleBook() {
    setError(null);
    startTransition(async () => {
      const res = await bookClass(cls.id);
      if (res.error) { setError(res.error); return; }
      if (res.status === "confirmed") { setBookingStatus("confirmed"); setConfirmedCount((n) => n + 1); }
      else if (res.status === "waitlist") { setBookingStatus("waitlist"); }
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const res = await cancelBooking(cls.id);
      if (res.error) { setError(res.error); return; }
      if (bookingStatus === "confirmed") setConfirmedCount((n) => Math.max(0, n - 1));
      setBookingStatus("cancelled");
    });
  }

  return (
    <>
      <div
        className={[
          "rounded-2xl border bg-bg-card overflow-hidden",
          isRunning ? "border-accent/40 bg-accent/5" : "border-border",
          !noFade && ((isPast && !isRunning) || (isClosed && !isBooked && !isWaitlisted && !isRunning)) ? "opacity-40" : "",
        ].filter(Boolean).join(" ")}
      >
        <div className="px-4 py-3.5 flex items-center gap-3">
          {/* Time column */}
          <div className="shrink-0 text-center w-14">
            {showDate && (
              <p className="text-[10px] text-text-tertiary leading-none mb-0.5 capitalize">
                {format(startsAt, "EEE d", { locale: pt })}
              </p>
            )}
            <p className="text-base font-semibold text-text-primary leading-none">
              {format(startsAt, "HH:mm")}
            </p>
            <p className="text-[10px] text-text-tertiary mt-0.5">{cls.duration_minutes}min</p>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-border shrink-0" />

          {/* Name + meta */}
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-baseline gap-2 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{cls.name}</p>
              {isTooEarly && (
                <p className="text-[11px] text-text-tertiary shrink-0">
                  Inscrições em: <span className="font-medium text-text-secondary">{bookingOpensLabel}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isRunning ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  Em curso
                </span>
              ) : isClosed && !isPast ? (
                <span className="text-[11px] text-text-tertiary">Inscrições fechadas</span>
              ) : (
                <span className="text-[11px] text-text-tertiary">{timeLabel}</span>
              )}

              {!isRunning && <span className="h-1 w-1 rounded-full bg-border shrink-0" />}

              <span className={[
                "text-[11px] font-medium",
                isFull ? "text-error" : spotsLeft <= 3 ? "text-orange-500" : "text-text-tertiary",
              ].join(" ")}>
                {confirmedCount}/{cls.capacity}
                {!isFull && spotsLeft <= 5 && (
                  <span className="ml-1 text-text-tertiary font-normal">
                    ({spotsLeft} vaga{spotsLeft !== 1 ? "s" : ""})
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setDetailOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-text-tertiary transition-colors hover:border-accent/40 hover:text-accent"
              aria-label="Ver detalhes"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.35" />
                <path d="M7 6.5V10" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
                <circle cx="7" cy="4.5" r="0.75" fill="currentColor" />
              </svg>
            </button>

            {!isPast && (
              canCancel ? (
                <button
                  onClick={handleCancel}
                  disabled={pending}
                  className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-text-tertiary transition-colors hover:border-error/40 hover:text-error disabled:opacity-50"
                >
                  {pending ? "…" : isWaitlisted ? "Sair da lista" : "Cancelar"}
                </button>
              ) : canBook ? (
                <button
                  onClick={handleBook}
                  disabled={pending}
                  className={[
                    "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50",
                    isBooked
                      ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                      : isFull
                      ? "border border-border text-text-secondary hover:border-accent/30 hover:text-accent"
                      : "bg-accent text-accent-fg hover:bg-accent-hover",
                  ].join(" ")}
                >
                  {pending ? "…" : isBooked ? "✓ Reservado" : isFull ? "Lista de espera" : "Reservar"}
                </button>
              ) : null
            )}
          </div>
        </div>

        {/* Progress bar — client-only to avoid SSR/client mismatch */}
        {mounted && isRunning && (
          <div className="relative h-1 w-full bg-accent/15">
            <div
              className="absolute inset-y-0 left-0 bg-accent"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Booking status bar */}
        {(isBooked || isWaitlisted) && !isPast && (
          <div className={[
            "px-4 py-1.5 text-[11px] font-medium border-t",
            isBooked
              ? "bg-green-500/5 border-green-500/10 text-green-600 dark:text-green-400"
              : "bg-orange-500/5 border-orange-500/10 text-orange-500",
          ].join(" ")}>
            {isBooked
              ? "A tua reserva está confirmada"
              : waitlistPosition
              ? `Lista de espera · ${waitlistPosition} de ${maxWaitlist}`
              : "Estás na lista de espera"}
          </div>
        )}

        {/* Teaser for running class with booking — nudge to register after */}
        {isRunning && isBooked && (
          <div className="border-t border-border/60 px-4 py-2 text-[11px] text-text-tertiary italic">
            Podes registar o resultado ao fim da aula
          </div>
        )}

        {/* No check-in: absent (or unmarked) athletes have no WOD/result access */}
        {showNoCheckinNotice && (
          <div className={[
            "border-t px-4 py-2 text-[11px] font-medium",
            isAbsent
              ? "border-error/20 bg-error/5 text-error"
              : "border-border/60 text-text-tertiary italic",
          ].join(" ")}>
            {isAbsent
              ? "Falta registada — sem acesso ao WOD nem registo de resultado"
              : "Presença por confirmar pelo coach — o WOD fica disponível após o check-in"}
          </div>
        )}

        {/* Result section for attended past classes */}
        {showResultSection && (
          <div className="border-t border-border px-4 py-2.5">
            {localWods.length === 0 ? (
              <p className="text-[11px] text-text-tertiary italic">
                Esta aula não tem registo de resultado
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {localWods.map((wod) => (
                  <button
                    key={wod.id}
                    onClick={() => setResultWod(wod)}
                    className={[
                      "rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors",
                      wod.my_result
                        ? "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                        : "border-accent/30 bg-accent/10 text-accent hover:bg-accent/20",
                    ].join(" ")}
                  >
                    {wod.my_result
                      ? `✓ ${wod.title} · ${shortScore(wod.my_result.score_display)}`
                      : `Registar resultado · ${wod.title}`}
                  </button>
                ))}
                <a
                  href="/athlete/leaderboard"
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/5 bg-white/8 px-3 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/15"
                >
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <path d="M2 11V7M5 11V4M8 11V6M11 11V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Leaderboard
                </a>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-1.5 border-t border-error/20 bg-error/5 text-[11px] text-error">
            {error}
          </div>
        )}
      </div>

      <ClassDetailDrawer
        cls={{ ...cls, confirmed_count: confirmedCount }}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {resultWod && boxId && (
        <WodResultDrawer
          wod={resultWod}
          boxId={boxId}
          classId={cls.id}
          open={true}
          onClose={() => setResultWod(null)}
          onSaved={(display, rx, isPR) => {
            setLocalWods((prev) =>
              prev.map((w) =>
                w.id === resultWod.id
                  ? { ...w, my_result: { id: "", score_display: display, rx, is_pr: isPR } }
                  : w
              )
            );
          }}
        />
      )}
    </>
  );
}
