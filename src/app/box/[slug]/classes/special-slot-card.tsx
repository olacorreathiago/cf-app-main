"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { assignSpecialClassWod, publishClass, deleteSpecialClass } from "@/lib/box/classes-actions";
import { getClassRoster, addAthleteToClass, removeAthleteFromClass, getAthleteClassResultCount } from "@/lib/box/roster-actions";
import type { RosterAttendee, BoxMemberOption, TrialRosterEntry } from "@/lib/box/roster-actions";
import { PrimaryButton, FieldInput } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { ClassInstance, Wod } from "@/types";

interface Coach {
  id: string;
  full_name: string | null;
  nickname: string | null;
}

interface Props {
  cls: ClassInstance;
  boxId: string;
  slug: string;
  coaches: Coach[];
  ownerProfileId: string | null;
  publishedWods: Wod[];
  confirmedCount: number;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Publicada",
  cancelled: "Cancelada",
};

const TYPE_COLORS: Record<string, string> = {
  AMRAP:      "bg-green-100 text-green-800 border-green-200",
  "For Time": "bg-blue-100 text-blue-800 border-blue-200",
  "For Load": "bg-amber-100 text-amber-800 border-amber-200",
  EMOM:       "bg-purple-100 text-purple-800 border-purple-200",
  Tabata:     "bg-teal-100 text-teal-800 border-teal-200",
  Custom:     "bg-border/60 text-text-secondary border-border",
};

type DrawerType = "publish" | "athletes" | "wods" | null;

function Drawer({ open, onClose, title, subtitle, children }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div key="drawer" initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "rounded-t-3xl border-t border-border bg-bg-base px-6 pb-10 pt-5",
              "lg:bottom-0 lg:left-auto lg:right-0 lg:top-0 lg:w-[440px]",
              "lg:rounded-none lg:rounded-l-3xl lg:border-l lg:border-t-0",
              "lg:pb-10 lg:pt-8 lg:overflow-y-auto"
            )}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border lg:hidden" />
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl leading-tight text-text-primary">{title}</h2>
                {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
              </div>
              <button type="button" onClick={onClose} aria-label="Fechar"
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary transition-colors hover:text-text-primary">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function displayName(full_name: string | null, nickname: string | null) {
  return nickname ?? full_name ?? "Atleta";
}

export function SpecialSlotCard({ cls, boxId, slug, coaches, ownerProfileId, publishedWods, confirmedCount }: Props) {
  const [drawer, setDrawer] = useState<DrawerType>(null);
  const [pending, startTransition] = useTransition();
  const status = cls.status;

  // WOD picker state
  const currentWodIds = (cls.wod_ids as string[]) ?? [];
  const [selectedWods, setSelectedWods] = useState<string[]>(currentWodIds);
  const [wodPending, startWodTransition] = useTransition();

  useEffect(() => {
    if (drawer === "wods") setSelectedWods(currentWodIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawer]);

  // Athletes drawer state
  const [attendees, setAttendees] = useState<RosterAttendee[]>([]);
  const [availableMembers, setAvailableMembers] = useState<BoxMemberOption[]>([]);
  const [trials, setTrials] = useState<TrialRosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [rosterPending, startRosterTransition] = useTransition();

  type RemovePending = { bookingId: string; userId: string; name: string; resultCount: number };
  const [removePending, setRemovePending] = useState<RemovePending | null>(null);

  // Publish state
  const defaultCoach = cls.coach_id ?? (coaches.find((c) => c.id === ownerProfileId) ? (ownerProfileId ?? "") : "");
  const [coachId, setCoachId] = useState(defaultCoach);
  const [capacity, setCapacity] = useState(String(cls.capacity));
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const time = cls.starts_at.slice(11, 16);
  const date = cls.starts_at.slice(0, 10);

  function openAthletesDrawer() {
    setDrawer("athletes");
    setMemberSearch("");
    setRosterLoading(true);
    getClassRoster(cls.id, boxId).then(({ attendees, availableMembers, trials }) => {
      setAttendees(attendees);
      setAvailableMembers(availableMembers);
      setTrials(trials);
      setRosterLoading(false);
    });
  }

  function handleAddAthlete(userId: string) {
    startRosterTransition(async () => {
      const res = await addAthleteToClass(cls.id, userId, boxId, slug);
      if (res.error) { toast.error(res.error); return; }
      setMemberSearch("");
      const { attendees: fresh, availableMembers: freshMembers, trials: freshTrials } = await getClassRoster(cls.id, boxId);
      setAttendees(fresh);
      setAvailableMembers(freshMembers);
      setTrials(freshTrials);
      toast.success("Atleta adicionado");
    });
  }

  function handleRemoveAthlete(bookingId: string, userId: string) {
    const attendee = attendees.find((a) => a.booking_id === bookingId);
    const name = attendee ? displayName(attendee.full_name, attendee.nickname) : "Atleta";
    startRosterTransition(async () => {
      const { count } = await getAthleteClassResultCount(cls.id, userId, boxId);
      setRemovePending({ bookingId, userId, name, resultCount: count });
    });
  }

  function confirmRemoveAthlete(deleteResults: boolean) {
    if (!removePending) return;
    const { bookingId, userId } = removePending;
    setRemovePending(null);
    startRosterTransition(async () => {
      const res = await removeAthleteFromClass(bookingId, boxId, slug, { classId: cls.id, userId, deleteResults });
      if (res.error) { toast.error(res.error); return; }
      const removed = attendees.find((a) => a.booking_id === bookingId);
      if (removed) {
        setAttendees((prev) => prev.filter((a) => a.booking_id !== bookingId));
        setAvailableMembers((prev) => [...prev, { user_id: userId, full_name: removed.full_name, nickname: removed.nickname, avatar_url: removed.avatar_url }]);
      }
      toast.success("Atleta removido");
    });
  }

  const filteredMembers = availableMembers.filter((m) => {
    const q = memberSearch.toLowerCase();
    return (m.full_name?.toLowerCase().includes(q) ?? false) || (m.nickname?.toLowerCase().includes(q) ?? false);
  });

  function handlePublish() {
    if (!coachId) { toast.error("Selecciona um coach"); return; }
    startTransition(async () => {
      const result = await publishClass(cls.id, boxId, { coach_id: coachId, capacity: Number(capacity) });
      if (result.error) toast.error(result.error);
      else { toast.success("Aula especial publicada"); setDrawer(null); }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSpecialClass(cls.id, boxId);
      if (result.error) toast.error(result.error);
      else { toast.success("Aula eliminada"); setDeleteConfirmOpen(false); }
    });
  }

  function handleSaveWods() {
    startWodTransition(async () => {
      const result = await assignSpecialClassWod(cls.id, boxId, selectedWods);
      if (result.error) { toast.error(result.error); return; }
      const count = selectedWods.length;
      toast.success(count === 0 ? "WODs removidos" : count === 1 ? "WOD atribuído" : `${count} WODs atribuídos`);
      setDrawer(null);
    });
  }

  const hasWodChanges = selectedWods.length !== currentWodIds.length || selectedWods.some((id) => !currentWodIds.includes(id));
  const suggested = publishedWods.filter((w) => w.scheduled_for === date);
  const others = publishedWods.filter((w) => w.scheduled_for !== date);

  return (
    <>
      <div className={cn(
        "rounded-2xl border overflow-hidden",
        status === "cancelled" ? "opacity-40 border-border" : "border-purple-200 dark:border-purple-900/40",
        status === "draft" ? "bg-purple-50/20 dark:bg-purple-950/10" : "bg-bg-card",
      )}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-purple-100 dark:border-purple-900/30">
          <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 bg-purple-100/60 dark:bg-purple-900/30 rounded-full px-2 py-0.5 shrink-0">
            Especial
          </span>
          <span className="flex-1 text-sm font-semibold text-text-primary truncate">{cls.name}</span>
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0",
            status === "scheduled" && "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400",
            status === "draft" && "border-border bg-bg-card text-text-tertiary",
            status === "cancelled" && "border-red-200 bg-red-50 text-red-600",
          )}>
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-text-tertiary">
            {time} · {cls.duration_minutes}min
            {cls.status === "scheduled" ? (
              <span className={cn(
                "ml-1.5 font-medium",
                confirmedCount >= cls.capacity ? "text-red-500"
                : confirmedCount >= cls.capacity * 0.8 ? "text-orange-500"
                : "text-text-tertiary"
              )}>
                · {confirmedCount}/{cls.capacity}
              </span>
            ) : (
              <> · {cls.capacity} lugares</>
            )}
            {cls.coach_id && (
              <> · {coaches.find((c) => c.id === cls.coach_id)?.full_name ?? "Coach"}</>
            )}
          </p>

          {/* WODs atribuídos */}
          {currentWodIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {publishedWods
                .filter((w) => currentWodIds.includes(w.id))
                .map((w) => (
                  <span key={w.id} className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    TYPE_COLORS[w.type] ?? TYPE_COLORS.Custom
                  )}>
                    {w.title}
                  </span>
                ))}
            </div>
          )}

          {/* Actions */}
          {status !== "cancelled" && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {status === "draft" && (
                <button onClick={() => setDrawer("publish")}
                  className="rounded-lg border border-border bg-bg-input px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors">
                  Publicar
                </button>
              )}
              {status === "scheduled" && (
                <button onClick={openAthletesDrawer}
                  className="rounded-lg border border-border bg-bg-input px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors">
                  Atletas
                </button>
              )}
              <button onClick={() => setDrawer("wods")}
                className="rounded-lg border border-border bg-bg-input px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors">
                {currentWodIds.length > 0 ? "Editar WODs" : "Adicionar WOD"}
              </button>
              <button onClick={() => setDeleteConfirmOpen(true)}
                className="rounded-lg px-2 py-1 text-xs text-text-tertiary hover:text-red-500 transition-colors"
                title="Eliminar aula">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Publish drawer */}
      <Drawer open={drawer === "publish"} onClose={() => setDrawer(null)}
        title="Publicar aula especial" subtitle={`${cls.name} · ${time}`}>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-text-secondary">Coach</p>
            <div className="space-y-2">
              {coaches.map((c) => (
                <button key={c.id} type="button" onClick={() => setCoachId(c.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all duration-150",
                    coachId === c.id
                      ? "border-accent bg-accent/5 text-text-primary"
                      : "border-border bg-bg-input text-text-secondary hover:border-accent/40"
                  )}>
                  <span className="font-medium">{c.full_name ?? c.nickname ?? "—"}</span>
                  {c.id === ownerProfileId && (
                    <span className="text-[10px] text-text-tertiary border border-border rounded-full px-2 py-0.5">Owner</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <FieldInput label="Capacidade" type="number" min={1} value={capacity}
            onChange={(e) => setCapacity(e.target.value)} hint="Número de lugares disponíveis" />
          <div className="space-y-2 pt-1">
            <PrimaryButton loading={pending} onClick={handlePublish}>Publicar aula</PrimaryButton>
            <PrimaryButton variant="secondary" onClick={() => setDrawer(null)}>Cancelar</PrimaryButton>
          </div>
        </div>
      </Drawer>

      {/* WOD picker drawer */}
      <Drawer open={drawer === "wods"} onClose={() => setDrawer(null)}
        title="Seleccionar WODs" subtitle={`${cls.name} · ${time}`}>
        <div className="space-y-5">
          {suggested.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Sugeridos para este dia</p>
              <div className="space-y-1.5">
                {suggested.map((w) => {
                  const isSelected = selectedWods.includes(w.id);
                  return (
                    <button key={w.id} type="button" onClick={() => setSelectedWods((p) => isSelected ? p.filter((x) => x !== w.id) : [...p, w.id])}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-all",
                        isSelected ? "border-accent bg-accent/5" : "border-border bg-bg-input hover:border-accent/40"
                      )}>
                      <div className="text-left">
                        <p className="font-medium text-text-primary">{w.title}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">{w.type}</p>
                      </div>
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-accent shrink-0">
                          <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Outros WODs</p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {others.map((w) => {
                  const isSelected = selectedWods.includes(w.id);
                  return (
                    <button key={w.id} type="button" onClick={() => setSelectedWods((p) => isSelected ? p.filter((x) => x !== w.id) : [...p, w.id])}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-all",
                        isSelected ? "border-accent bg-accent/5" : "border-border bg-bg-input hover:border-accent/40"
                      )}>
                      <div className="text-left">
                        <p className="font-medium text-text-primary">{w.title}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">{w.type}{w.scheduled_for ? ` · ${w.scheduled_for}` : ""}</p>
                      </div>
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-accent shrink-0">
                          <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {publishedWods.length === 0 && (
            <p className="text-sm text-text-tertiary text-center py-4">Sem WODs publicados disponíveis.</p>
          )}
          <div className="space-y-2 pt-1">
            <PrimaryButton loading={wodPending} onClick={handleSaveWods} disabled={!hasWodChanges && currentWodIds.length > 0}>
              {selectedWods.length === 0 ? "Remover WODs" : "Guardar WODs"}
            </PrimaryButton>
            <PrimaryButton variant="secondary" onClick={() => setDrawer(null)}>Cancelar</PrimaryButton>
          </div>
        </div>
      </Drawer>

      {/* Delete confirmation dialog */}
      {deleteConfirmOpen && createPortal(
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" style={{ zIndex: 9998 }} onClick={() => setDeleteConfirmOpen(false)} />
          <div className="fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-base p-6 shadow-xl" style={{ zIndex: 9999 }}>
            <h3 className="font-semibold text-text-primary mb-2">Eliminar {cls.name}?</h3>
            <p className="text-sm text-text-secondary mb-1">
              A aula e todas as inscrições associadas serão permanentemente eliminadas.
            </p>
            <p className="text-sm text-red-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={pending}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                {pending ? "A eliminar…" : "Eliminar"}
              </button>
              <button onClick={() => setDeleteConfirmOpen(false)} disabled={pending}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Athletes drawer */}
      <Drawer open={drawer === "athletes"} onClose={() => setDrawer(null)}
        title="Atletas" subtitle={`${cls.name} · ${time}`}>
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">Adicionar membro</p>
            <FieldInput placeholder="Pesquisar por nome…" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
            {memberSearch.length > 0 && (
              <div className="rounded-xl border border-border bg-bg-card overflow-hidden max-h-48 overflow-y-auto">
                {filteredMembers.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-text-tertiary">Sem resultados</p>
                ) : (
                  filteredMembers.map((m) => (
                    <button key={m.user_id} type="button" disabled={rosterPending}
                      onClick={() => handleAddAthlete(m.user_id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-bg-input transition-colors disabled:opacity-50 border-b border-border last:border-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                        {displayName(m.full_name, m.nickname).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-text-primary">{displayName(m.full_name, m.nickname)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-secondary">Inscritos</p>
              {!rosterLoading && <span className="text-xs text-text-tertiary">{attendees.length + trials.length} / {cls.capacity}</span>}
            </div>
            {rosterLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-border" />
                    <div className="h-3 w-28 rounded bg-border" />
                  </div>
                ))}
              </div>
            ) : attendees.length === 0 ? (
              <p className="text-sm text-text-tertiary">Sem inscrições ainda.</p>
            ) : (
              <div className="rounded-xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
                {attendees.map((a) => (
                  <div key={a.booking_id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                      {displayName(a.full_name, a.nickname).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{displayName(a.full_name, a.nickname)}</p>
                      {a.status === "waitlist" && <p className="text-[10px] text-orange-500">Lista de espera</p>}
                    </div>
                    <button type="button" disabled={rosterPending}
                      onClick={() => handleRemoveAthlete(a.booking_id, a.user_id)}
                      className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Trials */}
          {trials.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">Trials</p>
              <div className="rounded-xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
                {trials.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="flex-1 text-sm text-text-primary truncate">{t.name}</p>
                    <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Trial</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <PrimaryButton variant="secondary" onClick={() => setDrawer(null)}>Fechar</PrimaryButton>
        </div>
      </Drawer>

      {/* Remove confirmation dialog */}
      {removePending && createPortal(
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" style={{ zIndex: 9998 }} onClick={() => setRemovePending(null)} />
          <div className="fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-base p-6 shadow-xl" style={{ zIndex: 9999 }}>
            <h3 className="font-semibold text-text-primary mb-2">Remover {removePending.name}?</h3>
            {removePending.resultCount > 0 ? (
              <>
                <p className="text-sm text-text-secondary mb-1">
                  Este atleta tem <span className="font-semibold text-text-primary">{removePending.resultCount} resultado{removePending.resultCount > 1 ? "s" : ""}</span> registado{removePending.resultCount > 1 ? "s" : ""} nesta aula.
                </p>
                <p className="text-sm text-red-500 mb-5">Os resultados serão apagados permanentemente.</p>
                <div className="flex flex-col gap-2">
                  <button onClick={() => confirmRemoveAthlete(true)} disabled={rosterPending}
                    className="w-full rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                    Remover e apagar resultados
                  </button>
                  <button onClick={() => setRemovePending(null)}
                    className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text-secondary mb-5">O atleta será removido desta aula. Esta ação não pode ser desfeita.</p>
                <div className="flex gap-2">
                  <button onClick={() => confirmRemoveAthlete(false)} disabled={rosterPending}
                    className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                    Remover
                  </button>
                  <button onClick={() => setRemovePending(null)}
                    className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
