"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { getClassAttendees } from "@/lib/athlete/classes-actions";
import type { ClassAttendee } from "@/lib/athlete/classes-actions";
import type { AthleteDashboardClass } from "@/lib/athlete/dashboard-actions";

interface Props {
  cls: AthleteDashboardClass;
  open: boolean;
  onClose: () => void;
}

function attendeeDisplayName(a: ClassAttendee): string {
  if (a.nickname) return a.nickname;
  if (a.full_name) return a.full_name.split(" ")[0];
  return "Atleta";
}

function AvatarCircle({ attendee }: { attendee: ClassAttendee }) {
  const initials = attendeeDisplayName(attendee).charAt(0).toUpperCase();
  return attendee.avatar_url ? (
    <img
      src={attendee.avatar_url}
      alt={attendeeDisplayName(attendee)}
      title={attendeeDisplayName(attendee)}
      className="h-8 w-8 rounded-full object-cover ring-2 ring-bg-card"
    />
  ) : (
    <div
      title={attendeeDisplayName(attendee)}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent ring-2 ring-bg-card"
    >
      {initials}
    </div>
  );
}

export function ClassDetailDrawer({ cls, open, onClose }: Props) {
  const [attendees, setAttendees] = useState<ClassAttendee[] | null>(null);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingAttendees(true);
    getClassAttendees(cls.id).then((data) => {
      setAttendees(data);
      setLoadingAttendees(false);
    });
  }, [open, cls.id]);

  const startsAt = new Date(cls.starts_at.replace("Z", "").replace(/\+\d{2}:\d{2}$/, ""));
  const endsAt = new Date(startsAt.getTime() + cls.duration_minutes * 60_000);
  const dateLabel = format(startsAt, "EEEE, d 'de' MMMM", { locale: pt });
  const dateCapitalized = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border bg-bg-base px-6 pb-10 pt-5 lg:bottom-0 lg:left-auto lg:right-0 lg:top-0 lg:w-[440px] lg:rounded-none lg:rounded-l-3xl lg:border-l lg:border-t-0 lg:overflow-y-auto lg:pb-10 lg:pt-8"
          >
            {/* Handle (mobile) */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border lg:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="label-caps text-text-tertiary mb-1">Detalhes da aula</p>
                <h2 className="font-display text-2xl text-text-primary">{cls.name}</h2>
              </div>
              <button
                onClick={onClose}
                className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Fechar"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Info rows */}
            <div className="space-y-3 mb-6">
              {/* Date */}
              <InfoRow
                icon={
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.35" />
                    <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
                  </svg>
                }
                label={dateCapitalized}
              />

              {/* Time */}
              <InfoRow
                icon={
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.35" />
                    <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
                label={`${format(startsAt, "HH:mm")} – ${format(endsAt, "HH:mm")} · ${cls.duration_minutes} min`}
              />

              {/* Coach */}
              {cls.coach_name && (
                <InfoRow
                  icon={
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.35" />
                      <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
                    </svg>
                  }
                  label={cls.coach_name}
                  sublabel="Coach"
                />
              )}

              {/* Capacity */}
              <InfoRow
                icon={
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.35" />
                    <circle cx="11" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.35" />
                    <path d="M1 13c0-2.21 1.79-4 4-4M15 13c0-2.21-1.79-4-4-4M8 13c0-2.21 1.79-4 4-4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
                  </svg>
                }
                label={`${cls.confirmed_count} / ${cls.capacity} atletas`}
                sublabel={
                  cls.confirmed_count >= cls.capacity
                    ? "Aula completa"
                    : `${cls.capacity - cls.confirmed_count} vaga${cls.capacity - cls.confirmed_count !== 1 ? "s" : ""} disponíve${cls.capacity - cls.confirmed_count !== 1 ? "is" : "l"}`
                }
              />
            </div>

            {/* Attendees */}
            <div>
              <p className="label-caps text-text-tertiary mb-3">Inscritos</p>

              {loadingAttendees ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-8 w-8 rounded-full bg-border" />
                      <div className="h-3 w-24 rounded bg-border" />
                    </div>
                  ))}
                </div>
              ) : attendees && attendees.length > 0 ? (
                <>
                  {/* Avatar stack */}
                  <div className="flex -space-x-2 mb-3">
                    {attendees.slice(0, 8).map((a) => (
                      <AvatarCircle key={a.user_id} attendee={a} />
                    ))}
                    {attendees.length > 8 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-card text-[10px] font-semibold text-text-tertiary ring-2 ring-bg-card">
                        +{attendees.length - 8}
                      </div>
                    )}
                  </div>

                  {/* Name list */}
                  <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
                    {attendees.map((a, i) => (
                      <div key={a.user_id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-4 text-xs text-text-tertiary text-right">{i + 1}</span>
                        <AvatarCircle attendee={a} />
                        <span className="text-sm text-text-primary">{attendeeDisplayName(a)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-tertiary">Ainda sem inscritos.</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoRow({
  icon,
  label,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-text-tertiary">{icon}</span>
      <div>
        <p className="text-sm text-text-primary">{label}</p>
        {sublabel && <p className="text-xs text-text-tertiary">{sublabel}</p>}
      </div>
    </div>
  );
}
