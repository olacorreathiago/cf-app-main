"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ensureInstance, publishClass, cancelClass, updateClass } from "@/lib/box/classes-actions";
import { getClassRoster, addAthleteToClass, removeAthleteFromClass, getAthleteClassResultCount } from "@/lib/box/roster-actions";
import { checkInAthlete } from "@/lib/box/today-actions";
import type { RosterAttendee, BoxMemberOption, TrialRosterEntry } from "@/lib/box/roster-actions";
import { PrimaryButton, FieldInput } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { ClassInstance, ClassTemplate } from "@/types";

interface Coach {
  id: string;
  full_name: string | null;
  nickname: string | null;
}

export interface ClassSlot {
  templateId: string;
  templateData: Pick<ClassTemplate, "id" | "name" | "duration_minutes" | "capacity">;
  startsAt: string;
  startTime: string;
  durationMinutes: number;
  defaultCapacity: number;
  instance: ClassInstance | null;
  confirmedCount: number;
}

interface Props {
  slot: ClassSlot;
  boxId: string;
  slug: string;
  coaches: Coach[];
  ownerProfileId: string | null;
  selectMode?: "publish" | "edit";
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Publicada",
  cancelled: "Cancelada",
};

type DrawerType = "publish" | "edit" | "cancel" | "athletes" | null;

function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
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
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="drawer"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
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
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary transition-colors hover:text-text-primary"
              >
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

export function SlotCard({ slot, boxId, slug, coaches, ownerProfileId, selectMode, isSelected, onToggleSelect }: Props) {
  const [drawer, setDrawer] = useState<DrawerType>(null);
  const [pending, startTransition] = useTransition();

  // Athletes drawer state
  const [attendees, setAttendees] = useState<RosterAttendee[]>([]);
  const [availableMembers, setAvailableMembers] = useState<BoxMemberOption[]>([]);
  const [trials, setTrials] = useState<TrialRosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [rosterPending, startRosterTransition] = useTransition();

  // Remove confirmation dialog
  type RemovePending = { bookingId: string; userId: string; name: string; resultCount: number };
  const [removePending, setRemovePending] = useState<RemovePending | null>(null);

  // Optimistic check-in state: bookingId -> attended value
  const [optimisticAttended, setOptimisticAttended] = useState<Record<string, boolean | null>>({});

  const classStarted = slot.instance ? new Date(slot.instance.starts_at) <= new Date() : false;

  function openAthletesDrawer() {
    setDrawer("athletes");
    setMemberSearch("");
    setRosterLoading(true);
    const classId = slot.instance?.id;
    if (!classId) { setRosterLoading(false); return; }
    getClassRoster(classId, boxId).then(({ attendees, availableMembers, trials }) => {
      setAttendees(attendees);
      setAvailableMembers(availableMembers);
      setTrials(trials);
      setRosterLoading(false);
    });
  }

  function handleAddAthlete(userId: string) {
    const classId = slot.instance?.id;
    if (!classId) return;
    startRosterTransition(async () => {
      const res = await addAthleteToClass(classId, userId, boxId, slug);
      if (res.error) { toast.error(res.error); return; }
      setMemberSearch("");
      const { attendees: fresh, availableMembers: freshMembers, trials: freshTrials } = await getClassRoster(classId, boxId);
      setAttendees(fresh);
      setAvailableMembers(freshMembers);
      setTrials(freshTrials);
      toast.success("Atleta adicionado");
    });
  }

  function handleRemoveAthlete(bookingId: string, userId: string) {
    const classId = slot.instance?.id;
    const attendee = attendees.find((a) => a.booking_id === bookingId);
    const name = attendee ? displayName(attendee.full_name, attendee.nickname) : "Atleta";
    startRosterTransition(async () => {
      const { count } = classId
        ? await getAthleteClassResultCount(classId, userId, boxId)
        : { count: 0 };
      setRemovePending({ bookingId, userId, name, resultCount: count });
    });
  }

  function handleCheckIn(bookingId: string, currentAttended: boolean | null) {
    const newAttended = currentAttended === true ? null : true;
    setOptimisticAttended((prev) => ({ ...prev, [bookingId]: newAttended }));
    startRosterTransition(async () => {
      const res = await checkInAthlete(bookingId, newAttended, slug);
      if (res.error) {
        toast.error(res.error);
        setOptimisticAttended((prev) => ({ ...prev, [bookingId]: currentAttended }));
      }
    });
  }

  function confirmRemoveAthlete(deleteResults: boolean) {
    if (!removePending) return;
    const { bookingId, userId } = removePending;
    const classId = slot.instance?.id;
    setRemovePending(null);
    startRosterTransition(async () => {
      const res = await removeAthleteFromClass(bookingId, boxId, slug, {
        classId,
        userId,
        deleteResults,
      });
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
    return (
      (m.full_name?.toLowerCase().includes(q) ?? false) ||
      (m.nickname?.toLowerCase().includes(q) ?? false)
    );
  });

  // Publish state — default coach = owner (if in coaches list), or existing coach
  const defaultCoach =
    slot.instance?.coach_id ??
    (coaches.find((c) => c.id === ownerProfileId) ? (ownerProfileId ?? "") : "");

  const [coachId, setCoachId] = useState(defaultCoach);
  const [capacity, setCapacity] = useState(
    String(slot.instance?.capacity ?? slot.defaultCapacity)
  );
  const [reason, setReason] = useState("");

  // Re-sync when slot data changes (page refresh)
  useEffect(() => {
    setCoachId(
      slot.instance?.coach_id ??
      (coaches.find((c) => c.id === ownerProfileId) ? (ownerProfileId ?? "") : "")
    );
    setCapacity(String(slot.instance?.capacity ?? slot.defaultCapacity));
  }, [slot.instance?.coach_id, slot.instance?.capacity, slot.defaultCapacity, ownerProfileId, coaches]);

  const status = slot.instance?.status ?? "draft";

  async function getOrCreateInstanceId(): Promise<string | null> {
    if (slot.instance) return slot.instance.id;
    const result = await ensureInstance(boxId, slot.templateData, slot.startsAt);
    if (result.error) { toast.error(result.error); return null; }
    return result.instanceId;
  }

  function handlePublish() {
    if (!coachId) { toast.error("Selecciona um coach"); return; }
    startTransition(async () => {
      const id = await getOrCreateInstanceId();
      if (!id) return;
      const result = await publishClass(id, boxId, { coach_id: coachId, capacity: Number(capacity) });
      if (result.error) toast.error(result.error);
      else { toast.success("Aula publicada"); setDrawer(null); }
    });
  }

  function handleCancel() {
    if (!reason.trim()) { toast.error("Indica o motivo"); return; }
    startTransition(async () => {
      const id = await getOrCreateInstanceId();
      if (!id) return;
      const result = await cancelClass(id, boxId, { cancellation_reason: reason });
      if (result.error) toast.error(result.error);
      else { toast.success("Aula cancelada"); setDrawer(null); setReason(""); }
    });
  }

  function handleUpdate() {
    if (!coachId) { toast.error("Selecciona um coach"); return; }
    const classId = slot.instance?.id;
    if (!classId) return;
    startTransition(async () => {
      const result = await updateClass(classId, boxId, { coach_id: coachId, capacity: Number(capacity) });
      if (result.error) toast.error(result.error);
      else { toast.success("Aula atualizada"); setDrawer(null); }
    });
  }

  const isSelectable =
    (selectMode === "publish" && status === "draft") ||
    (selectMode === "edit" && status === "scheduled");

  return (
    <>
      <div
        onClick={isSelectable ? onToggleSelect : undefined}
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border bg-bg-base px-3 py-2.5 transition-all",
          isSelectable && "cursor-pointer",
          isSelected ? "border-accent bg-accent/5" : "border-border",
          status === "cancelled" && "opacity-40",
          selectMode && !isSelectable && "opacity-40 pointer-events-none"
        )}
      >
        {/* Select indicator */}
        {selectMode && (
          <div className={cn(
            "h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
            isSelected ? "border-accent bg-accent" : "border-border"
          )}>
            {isSelected && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}

        {/* Left */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-sm font-semibold text-text-primary tabular-nums shrink-0">
            {slot.startTime}
          </span>
          <p className="text-xs text-text-tertiary truncate">
            {slot.durationMinutes}min
            {slot.instance?.status === "scheduled" && (
              <span className={cn(
                "ml-1.5 font-medium",
                slot.confirmedCount >= (slot.instance?.capacity ?? slot.defaultCapacity)
                  ? "text-red-500"
                  : slot.confirmedCount >= (slot.instance?.capacity ?? slot.defaultCapacity) * 0.8
                  ? "text-orange-500"
                  : "text-text-tertiary"
              )}>
                · {slot.confirmedCount}/{slot.instance?.capacity ?? slot.defaultCapacity}
              </span>
            )}
            {slot.instance?.status !== "scheduled" && (
              <> · {slot.instance?.capacity ?? slot.defaultCapacity} lugares</>
            )}
            {slot.instance?.coach_id && (
              <> · {coaches.find((c) => c.id === slot.instance?.coach_id)?.full_name ?? "Coach"}</>
            )}
          </p>
        </div>

        {/* Right */}
        {!selectMode && (
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full border",
              status === "scheduled" && "border-green-200 bg-green-50 text-green-700",
              status === "draft" && "border-border bg-bg-card text-text-tertiary",
              status === "cancelled" && "border-red-200 bg-red-50 text-red-600",
            )}>
              {STATUS_LABEL[status]}
            </span>

            {status !== "cancelled" && (
              <div className="flex gap-1">
                {status === "draft" && (
                  <button
                    onClick={() => setDrawer("publish")}
                    className="rounded-lg border border-border bg-bg-card px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors"
                  >
                    Publicar
                  </button>
                )}
                {status === "scheduled" && (
                  <>
                    <button
                      onClick={() => setDrawer("edit")}
                      className="rounded-lg border border-border bg-bg-card px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors"
                      title="Editar coach e capacidade"
                    >
                      Editar
                    </button>
                    <button
                      onClick={openAthletesDrawer}
                      className="rounded-lg border border-border bg-bg-card px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors"
                      title="Gerir atletas"
                    >
                      Atletas
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setReason(""); setDrawer("cancel"); }}
                  className="rounded-lg px-2 py-1 text-xs text-text-tertiary hover:text-red-500 transition-colors"
                  title="Cancelar aula"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Select mode status badge */}
        {selectMode && (
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0",
            status === "scheduled" && "border-green-200 bg-green-50 text-green-700",
            status === "draft" && "border-border bg-bg-card text-text-tertiary",
            status === "cancelled" && "border-red-200 bg-red-50 text-red-600",
          )}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      {/* Publish drawer */}
      <Drawer
        open={drawer === "publish"}
        onClose={() => setDrawer(null)}
        title={`Publicar aula`}
        subtitle={`${slot.startTime} · ${slot.durationMinutes}min · ${slot.defaultCapacity} lugares`}
      >
        <div className="space-y-5">
          {/* Coach selector */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-text-secondary">Coach</p>
            <div className="space-y-2">
              {coaches.map((c) => {
                const isOwner = c.id === ownerProfileId;
                const selected = coachId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCoachId(c.id)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all duration-150",
                      selected
                        ? "border-accent bg-accent/5 text-text-primary"
                        : "border-border bg-bg-input text-text-secondary hover:border-accent/40 hover:text-text-primary"
                    )}
                  >
                    <span className="font-medium">{c.full_name ?? c.nickname ?? "—"}</span>
                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <span className="text-[10px] text-text-tertiary border border-border rounded-full px-2 py-0.5">
                          Owner
                        </span>
                      )}
                      {selected && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <FieldInput
            label="Capacidade"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            hint="Número de lugares disponíveis para reserva"
          />

          <div className="space-y-2 pt-1">
            <PrimaryButton loading={pending} onClick={handlePublish}>
              Publicar aula
            </PrimaryButton>
            <PrimaryButton variant="secondary" onClick={() => setDrawer(null)}>
              Cancelar
            </PrimaryButton>
          </div>
        </div>
      </Drawer>

      {/* Edit drawer */}
      <Drawer
        open={drawer === "edit"}
        onClose={() => setDrawer(null)}
        title="Editar aula"
        subtitle={`${slot.startTime} · ${slot.templateData.name}`}
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-text-secondary">Coach</p>
            <div className="space-y-2">
              {coaches.map((c) => {
                const selected = coachId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCoachId(c.id)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all duration-150",
                      selected
                        ? "border-accent bg-accent/5 text-text-primary"
                        : "border-border bg-bg-input text-text-secondary hover:border-accent/40 hover:text-text-primary"
                    )}
                  >
                    <span className="font-medium">{c.full_name ?? c.nickname ?? "—"}</span>
                    {selected && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5L12 3" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <FieldInput
            label="Capacidade"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            hint="Número de lugares disponíveis para reserva"
          />

          <div className="space-y-2 pt-1">
            <PrimaryButton loading={pending} onClick={handleUpdate}>
              Guardar alterações
            </PrimaryButton>
            <PrimaryButton variant="secondary" onClick={() => setDrawer(null)}>
              Cancelar
            </PrimaryButton>
          </div>
        </div>
      </Drawer>

      {/* Cancel drawer */}
      <Drawer
        open={drawer === "cancel"}
        onClose={() => setDrawer(null)}
        title="Cancelar aula"
        subtitle={`${slot.startTime} · ${slot.templateData.name}`}
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-text-secondary">Motivo do cancelamento</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="ex: Coach indisponível, manutenção do espaço…"
              className="w-full rounded-xl border border-border bg-bg-input px-4 py-3.5 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="space-y-2">
            <PrimaryButton
              loading={pending}
              onClick={handleCancel}
              className="bg-red-500 hover:bg-red-600 disabled:bg-red-300"
            >
              Confirmar cancelamento
            </PrimaryButton>
            <PrimaryButton variant="secondary" onClick={() => setDrawer(null)}>
              Voltar
            </PrimaryButton>
          </div>
        </div>
      </Drawer>

      {/* Athletes drawer */}
      <Drawer
        open={drawer === "athletes"}
        onClose={() => setDrawer(null)}
        title="Atletas"
        subtitle={`${slot.startTime} · ${slot.templateData.name}`}
      >
        <div className="space-y-6">
          {/* Add member search */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">Adicionar membro</p>
            <FieldInput
              placeholder="Pesquisar por nome…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
            {memberSearch.length > 0 && (
              <div className="rounded-xl border border-border bg-bg-card overflow-hidden max-h-48 overflow-y-auto">
                {filteredMembers.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-text-tertiary">Sem resultados</p>
                ) : (
                  filteredMembers.map((m) => (
                    <button
                      key={m.user_id}
                      type="button"
                      disabled={rosterPending}
                      onClick={() => handleAddAthlete(m.user_id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-bg-input transition-colors disabled:opacity-50 border-b border-border last:border-0"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                        {displayName(m.full_name, m.nickname).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-text-primary">{displayName(m.full_name, m.nickname)}</span>
                      {m.full_name && m.nickname && (
                        <span className="text-text-tertiary text-xs ml-auto">{m.full_name}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Current attendees */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-secondary">Inscritos</p>
              {!rosterLoading && (
                <span className="text-xs text-text-tertiary">
                  {attendees.length + trials.length} / {slot.instance?.capacity ?? slot.defaultCapacity}
                </span>
              )}
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
                {attendees.map((a) => {
                  const attended = optimisticAttended[a.booking_id] !== undefined
                    ? optimisticAttended[a.booking_id]
                    : (a.attended ?? (a.checked_in_at !== null ? true : null));
                  const isPresent = attended === true;
                  return (
                    <div key={a.booking_id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                        {displayName(a.full_name, a.nickname).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {displayName(a.full_name, a.nickname)}
                        </p>
                        {a.status === "waitlist" && (
                          <p className="text-[10px] text-orange-500">Lista de espera</p>
                        )}
                      </div>
                      {classStarted && (
                        <button
                          type="button"
                          disabled={rosterPending}
                          onClick={() => handleCheckIn(a.booking_id, attended ?? null)}
                          title={isPresent ? "Remover check-in" : "Marcar presença"}
                          className={cn(
                            "shrink-0 flex h-6 w-6 items-center justify-center rounded-full transition-colors disabled:opacity-40",
                            isPresent
                              ? "bg-success/20 text-success"
                              : "bg-bg-input text-text-tertiary hover:bg-success/10 hover:text-success"
                          )}
                        >
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={rosterPending}
                        onClick={() => handleRemoveAthlete(a.booking_id, a.user_id)}
                        className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Remover"
                      >
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
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
                    <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                      Trial
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <PrimaryButton variant="secondary" onClick={() => setDrawer(null)}>
            Fechar
          </PrimaryButton>
        </div>
      </Drawer>

      {/* Remove confirmation dialog — portal to body to escape all stacking contexts */}
      {removePending && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 9998 }}
            onClick={() => setRemovePending(null)}
          />
          <div
            className="fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-base p-6 shadow-xl"
            style={{ zIndex: 9999 }}
          >
              <h3 className="font-semibold text-text-primary mb-2">Remover {removePending.name}?</h3>
              {removePending.resultCount > 0 ? (
                <>
                  <p className="text-sm text-text-secondary mb-1">
                    Este atleta tem <span className="font-semibold text-text-primary">{removePending.resultCount} resultado{removePending.resultCount > 1 ? "s" : ""}</span> registado{removePending.resultCount > 1 ? "s" : ""} nesta aula.
                  </p>
                  <p className="text-sm text-red-500 mb-5">
                    Os resultados serão apagados permanentemente e não podem ser recuperados.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => confirmRemoveAthlete(true)}
                      disabled={rosterPending}
                      className="w-full rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      Remover e apagar resultados
                    </button>
                    <button
                      onClick={() => setRemovePending(null)}
                      className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-text-secondary mb-5">
                    O atleta será removido desta aula. Esta ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmRemoveAthlete(false)}
                      disabled={rosterPending}
                      className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      Remover
                    </button>
                    <button
                      onClick={() => setRemovePending(null)}
                      className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
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
