"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CoachTodayClass, CoachTodayAthlete, CoachTodayDropIn } from "@/lib/box/coach-today-actions";
import {
  checkInAthlete,
  getAvailableMembersForClass,
  addAthleteTodayClass,
  removeAthleteTodayClass,
  type AvailableMember,
} from "@/lib/box/today-actions";
import { checkInTrial } from "@/lib/box/trial-actions";
import { checkInDropIn, confirmDropIn, cancelDropIn } from "@/lib/box/drop-in-actions";
import { markPaymentPaid, recordPayment } from "@/lib/payments/actions";
import type { PaymentMethod } from "@/lib/payments/types";
import { updateClass } from "@/lib/box/classes-actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

const WOD_TYPE_LABEL: Record<string, string> = {
  amrap: "AMRAP",
  "for-time": "For Time",
  emom: "EMOM",
  strength: "Strength",
  skill: "Skill",
  custom: "Custom",
};

const SCORE_TYPE_LABEL: Record<string, string> = {
  time: "Tempo",
  reps: "Reps",
  weight: "Peso",
  rounds: "Rounds",
  calories: "Calorias",
  distance: "Distância",
  "round-reps": "Rounds+Reps",
  points: "Pontos",
};

function formatTime(starts_at: string) {
  return new Date(starts_at).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function avatarInitial(name: string | null) {
  return (name ?? "?").charAt(0).toUpperCase();
}

// ── Drawer ────────────────────────────────────────────────────────────────────

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

// ── Avatar strip ──────────────────────────────────────────────────────────────

const MAX_VISIBLE = 5;

function AvatarStrip({
  athletes,
  onClick,
}: {
  athletes: CoachTodayAthlete[];
  onClick: () => void;
}) {
  const visible = athletes.slice(0, MAX_VISIBLE);
  const overflow = athletes.length - MAX_VISIBLE;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 px-5 py-3 w-full text-left hover:bg-bg-input/40 transition-colors"
    >
      <div className="flex items-center">
        {visible.map((a, i) => (
          <div
            key={a.id}
            className={cn("relative ring-2 ring-bg-card rounded-full", i > 0 && "-ml-2")}
          >
            {a.avatar_url ? (
              <img
                src={a.avatar_url}
                alt={a.full_name ?? ""}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-accent/15 flex items-center justify-center text-xs font-semibold text-accent">
                {avatarInitial(a.full_name)}
              </div>
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-bg-input ring-2 ring-bg-card text-[11px] font-semibold text-text-secondary">
            +{overflow}
          </div>
        )}
      </div>
      {athletes.length === 0 && (
        <span className="text-sm text-text-tertiary">Sem inscrições</span>
      )}
    </button>
  );
}

// ── Check-in toggle ───────────────────────────────────────────────────────────

function CheckInToggle({
  attended,
  disabled,
  onToggle,
}: {
  attended: boolean | null;
  disabled: boolean;
  onToggle: () => void;
}) {
  const isOn = attended === true;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      title={isOn ? "Marcar como não confirmado" : "Confirmar presença"}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 shrink-0",
        isOn
          ? "bg-success/15 text-success"
          : "bg-bg-input text-text-tertiary hover:text-text-secondary",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {isOn ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.35" strokeDasharray="2.5 2.5" />
        </svg>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Coach {
  id: string;
  full_name: string | null;
}

interface Props {
  cls: CoachTodayClass;
  slug: string;
  boxId: string;
  coaches: Coach[];
  autoOpenCheckIn?: boolean;
}

export function ClassCardClient({ cls, slug, boxId, coaches, autoOpenCheckIn }: Props) {
  const isOngoing = cls.status === "ongoing";
  const isFinished = cls.status === "finished";
  const canCheckIn = isOngoing || isFinished;

  // Optimistic attended state (undefined = fall back to server value)
  const [optimisticAttended, setOptimisticAttended] = useState<
    Record<string, boolean | null | undefined>
  >({});
  const [optimisticTrialCheckin, setOptimisticTrialCheckin] = useState<Record<string, boolean>>({});
  const [optimisticDropInCheckin, setOptimisticDropInCheckin] = useState<Record<string, boolean>>({});
  const [optimisticDropInStatus, setOptimisticDropInStatus] = useState<Record<string, "pending" | "confirmed" | "cancelled">>({});
  const [optimisticPaymentStatus, setOptimisticPaymentStatus] = useState<Record<string, "pending" | "paid">>({});
  const [paymentDropInId, setPaymentDropInId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  // Drawers
  const [checkInOpen, setCheckInOpen] = useState(autoOpenCheckIn ?? false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Edit state
  const [editCoachId, setEditCoachId] = useState(cls.coach_id ?? "");
  const [editCapacity, setEditCapacity] = useState(String(cls.capacity));

  // Add athlete state
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[] | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  // Remove confirm
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleTrialCheckIn(trialId: string, newCheckedIn: boolean) {
    setOptimisticTrialCheckin((prev) => ({ ...prev, [trialId]: newCheckedIn }));
    startTransition(async () => {
      const result = await checkInTrial(trialId, newCheckedIn, slug);
      if (result.error) {
        toast.error("Erro ao registar presença do trial");
        setOptimisticTrialCheckin((prev) => ({ ...prev, [trialId]: !newCheckedIn }));
      }
    });
  }

  function handleDropInCheckIn(dropInId: string, newCheckedIn: boolean) {
    setOptimisticDropInCheckin((prev) => ({ ...prev, [dropInId]: newCheckedIn }));
    startTransition(async () => {
      const result = await checkInDropIn(dropInId, newCheckedIn, slug);
      if (result.error) {
        toast.error("Erro ao registar presença do drop-in");
        setOptimisticDropInCheckin((prev) => ({ ...prev, [dropInId]: !newCheckedIn }));
      }
    });
  }

  function handleDropInConfirm(dropInId: string) {
    setOptimisticDropInStatus((prev) => ({ ...prev, [dropInId]: "confirmed" }));
    startTransition(async () => {
      const result = await confirmDropIn(dropInId, boxId, slug);
      if (result.error) {
        toast.error(result.error);
        setOptimisticDropInStatus((prev) => ({ ...prev, [dropInId]: "pending" }));
      } else {
        toast.success("Drop-in confirmado.");
      }
    });
  }

  function handleDropInCancel(dropInId: string) {
    setOptimisticDropInStatus((prev) => ({ ...prev, [dropInId]: "cancelled" }));
    startTransition(async () => {
      const result = await cancelDropIn(dropInId, boxId, slug);
      if (result.error) {
        toast.error(result.error);
        setOptimisticDropInStatus((prev) => ({ ...prev, [dropInId]: "pending" }));
      }
    });
  }

  function handleMarkPayment(dropIn: CoachTodayDropIn) {
    setOptimisticPaymentStatus((prev) => ({ ...prev, [dropIn.id]: "paid" }));
    setPaymentDropInId(null);
    startTransition(async () => {
      try {
        if (dropIn.payment_id) {
          await markPaymentPaid({
            payment_id: dropIn.payment_id,
            box_id: boxId,
            method: paymentMethod,
            slug,
          });
        }
        toast.success("Pagamento registado.");
      } catch {
        toast.error("Erro ao registar pagamento.");
        setOptimisticPaymentStatus((prev) => ({ ...prev, [dropIn.id]: "pending" }));
      }
    });
  }

  function handleCheckIn(bookingId: string, athleteId: string, newAttended: boolean | null) {
    setOptimisticAttended((prev) => ({ ...prev, [athleteId]: newAttended }));
    startTransition(async () => {
      const result = await checkInAthlete(bookingId, newAttended, slug);
      if (result.error) {
        toast.error("Erro ao registar presença");
        setOptimisticAttended((prev) => ({ ...prev, [athleteId]: undefined }));
      }
    });
  }

  const openAddDrawer = useCallback(async () => {
    setAddOpen(true);
    if (availableMembers !== null) return;
    setLoadingMembers(true);
    const members = await getAvailableMembersForClass(cls.id, boxId);
    setAvailableMembers(members);
    setLoadingMembers(false);
  }, [cls.id, boxId, availableMembers]);

  function handleUpdate() {
    if (!editCoachId) { toast.error("Selecciona um coach"); return; }
    startTransition(async () => {
      const result = await updateClass(cls.id, boxId, {
        coach_id: editCoachId,
        capacity: Number(editCapacity),
      });
      if (result.error) toast.error(result.error);
      else { toast.success("Aula atualizada"); setEditOpen(false); }
    });
  }

  function handleAdd(userId: string) {
    startTransition(async () => {
      const result = await addAthleteTodayClass(cls.id, userId, slug);
      if (result.error) {
        toast.error(result.error);
      } else {
        setAvailableMembers((prev) => prev?.filter((m) => m.user_id !== userId) ?? null);
      }
    });
  }

  function handleRemove(bookingId: string) {
    startTransition(async () => {
      const result = await removeAthleteTodayClass(bookingId, slug);
      if (result.error) toast.error(result.error);
      else setConfirmRemoveId(null);
    });
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const checkedInCount = cls.athletes.filter((a) => {
    const opt = optimisticAttended[a.id];
    return (opt !== undefined ? opt : a.attended) === true;
  }).length;

  const filteredMembers = (availableMembers ?? []).filter((m) =>
    (m.full_name ?? "").toLowerCase().includes(memberSearch.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className={cn(
          "rounded-2xl border bg-bg-card overflow-hidden",
          isOngoing ? "border-accent/40" : "border-border"
        )}
      >
        {/* Header */}
        <div className={cn("px-5 py-4", isOngoing && "bg-accent/5")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-text-primary">{cls.name}</h2>
                <StatusBadge status={cls.status} />
                {cls.status === "upcoming" && (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    title="Editar aula"
                    className="flex h-5 w-5 items-center justify-center rounded text-text-tertiary transition-colors hover:text-text-primary"
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="mt-0.5 text-sm text-text-tertiary">
                {formatTime(cls.starts_at)} · {cls.duration_minutes} min
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-semibold text-text-primary tabular-nums">
                {cls.results_count}/{cls.athletes.length}
              </p>
              <p className="text-[10px] text-text-tertiary">resultados</p>
              {canCheckIn && cls.athletes.length > 0 && (
                <p className="text-[10px] text-text-tertiary mt-0.5 tabular-nums">
                  {checkedInCount}/{cls.athletes.length} presentes
                </p>
              )}
            </div>
          </div>
        </div>

        {/* WOD summary */}
        {cls.wods.length > 0 && (
          <div className="px-5 pb-4 border-t border-border/60">
            {cls.wods.map((wod) => (
              <div key={wod.id} className="pt-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-medium text-text-primary">{wod.title}</span>
                  <span className="text-[10px] rounded-full bg-bg-input px-2 py-0.5 text-text-tertiary">
                    {WOD_TYPE_LABEL[wod.type] ?? wod.type}
                  </span>
                  <span className="text-[10px] rounded-full bg-bg-input px-2 py-0.5 text-text-tertiary">
                    {SCORE_TYPE_LABEL[wod.score_type] ?? wod.score_type}
                  </span>
                </div>
                {wod.description && (
                  <p className="text-xs text-text-secondary line-clamp-2">{wod.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Avatar strip — click to open check-in drawer */}
        <div className="border-t border-border/60">
          <p className="px-5 pt-3 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60">
            Inscritos · {cls.athletes.length}
          </p>
          <AvatarStrip athletes={cls.athletes} onClick={() => setCheckInOpen(true)} />
        </div>

        {/* Add athlete */}
        <div className="px-4 pb-3 border-t border-border/40">
          <button
            type="button"
            onClick={openAddDrawer}
            className="flex items-center gap-2 pt-3 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.35" />
              <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
            Adicionar atleta
          </button>
        </div>
      </div>

      {/* ── Check-in drawer ─────────────────────────────────────────────────── */}
      <Drawer
        open={checkInOpen}
        onClose={() => { setCheckInOpen(false); setConfirmRemoveId(null); }}
        title="Inscritos"
        subtitle={`${cls.name} · ${formatTime(cls.starts_at)}`}
      >
        {cls.athletes.length === 0 && cls.trials.length === 0 && cls.dropIns.length === 0 ? (
          <p className="text-sm text-text-tertiary">Nenhum atleta inscrito.</p>
        ) : (
          <div className="space-y-1">
            {!canCheckIn && (
              <p className="mb-4 text-xs text-text-tertiary">
                O check-in fica disponível quando a aula começar.
              </p>
            )}
            <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
              {cls.athletes.map((athlete) => {
                const opt = optimisticAttended[athlete.id];
                const attended = opt !== undefined ? opt : athlete.attended;
                const isConfirming = confirmRemoveId === athlete.booking_id;

                return (
                  <div key={athlete.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Avatar */}
                    {athlete.avatar_url ? (
                      <img
                        src={athlete.avatar_url}
                        alt={athlete.full_name ?? ""}
                        className="h-9 w-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-accent/15 flex items-center justify-center text-sm font-semibold text-accent shrink-0">
                        {avatarInitial(athlete.full_name)}
                      </div>
                    )}

                    {/* Name + result */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {athlete.full_name ?? "Atleta"}
                      </p>
                      {athlete.result && (
                        <p className="text-xs text-text-tertiary truncate">
                          {athlete.result.dnf ? "DNF" : athlete.result.score_display}
                          {" · "}
                          <span className={athlete.result.rx ? "text-accent" : ""}>
                            {athlete.result.rx ? "RX" : "Scaled"}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Confirm remove */}
                    <AnimatePresence mode="wait">
                      {isConfirming ? (
                        <motion.div
                          key="confirm"
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          className="flex items-center gap-2 shrink-0"
                        >
                          <span className="text-xs text-text-tertiary">Remover?</span>
                          <button
                            onClick={() => handleRemove(athlete.booking_id)}
                            className="text-xs font-medium text-error hover:underline"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setConfirmRemoveId(null)}
                            className="text-xs text-text-tertiary"
                          >
                            Não
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="actions"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1.5 shrink-0"
                        >
                          {/* Check-in toggle */}
                          <CheckInToggle
                            attended={attended ?? null}
                            disabled={!canCheckIn || pending}
                            onToggle={() =>
                              handleCheckIn(
                                athlete.booking_id,
                                athlete.id,
                                attended === true ? null : true
                              )
                            }
                          />

                          {/* Remove */}
                          <button
                            type="button"
                            title="Remover da aula"
                            onClick={() => setConfirmRemoveId(athlete.booking_id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                          >
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            {/* Trials */}
            {cls.trials.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60 mb-2">
                  Trials · {cls.trials.length}
                </p>
                <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
                  {cls.trials.map((trial) => {
                    const checkedIn = optimisticTrialCheckin[trial.id] ?? trial.checked_in;
                    return (
                      <div key={trial.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-sm font-semibold text-accent shrink-0">
                          {trial.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{trial.name}</p>
                          <span className="text-[10px] font-medium text-accent/70 bg-accent/10 rounded-full px-2 py-0.5">Trial</span>
                        </div>
                        <CheckInToggle
                          attended={checkedIn ? true : null}
                          disabled={!canCheckIn || pending}
                          onToggle={() => handleTrialCheckIn(trial.id, !checkedIn)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Drop-ins */}
            {cls.dropIns.length > 0 && (
              <div className="mt-4 space-y-1">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60 mb-2">
                  Drop-ins · {cls.dropIns.filter((d) => (optimisticDropInStatus[d.id] ?? d.status) !== "cancelled").length}
                </p>
                <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
                  {cls.dropIns.map((dropIn) => {
                    const status = optimisticDropInStatus[dropIn.id] ?? dropIn.status;
                    const checkedIn = optimisticDropInCheckin[dropIn.id] ?? dropIn.checked_in;
                    const pStatus = optimisticPaymentStatus[dropIn.id] ?? dropIn.payment_status;
                    const displayName = dropIn.nickname ?? dropIn.name ?? dropIn.email ?? "Drop-in";
                    if (status === "cancelled") return null;
                    const isPaymentPending = pStatus === "pending";
                    const isPaymentPaid = pStatus === "paid";
                    return (
                      <div key={dropIn.id} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-semibold text-blue-500 shrink-0">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={cn(
                                "text-[10px] font-medium rounded-full px-2 py-0.5",
                                status === "pending"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-blue-500/10 text-blue-500"
                              )}>
                                {status === "pending" ? "Pendente" : "Drop-in"}
                              </span>
                              {isPaymentPaid && (
                                <span className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-accent/10 text-accent">
                                  Pago
                                </span>
                              )}
                              {isPaymentPending && (
                                <button
                                  type="button"
                                  onClick={() => { setPaymentDropInId(dropIn.id); setPaymentMethod("cash"); }}
                                  className="text-[10px] font-medium rounded-full px-2 py-0.5 bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                                >
                                  Pag. pendente
                                </button>
                              )}
                            </div>
                          </div>
                          {status === "pending" ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => handleDropInConfirm(dropIn.id)}
                                title="Confirmar drop-in"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 text-success transition-colors hover:bg-success/20 disabled:opacity-40"
                              >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                  <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => handleDropInCancel(dropIn.id)}
                                title="Recusar drop-in"
                                className="flex h-9 w-9 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-error/10 hover:text-error disabled:opacity-40"
                              >
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <CheckInToggle
                              attended={checkedIn ? true : null}
                              disabled={!canCheckIn || pending}
                              onToggle={() => handleDropInCheckIn(dropIn.id, !checkedIn)}
                            />
                          )}
                        </div>

                        {/* Inline payment form */}
                        <AnimatePresence>
                          {paymentDropInId === dropIn.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 ml-12 rounded-xl border border-border bg-bg-input p-3 space-y-2.5">
                                <p className="text-xs font-medium text-text-secondary">Método de pagamento</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {(["cash", "mbway", "transferencia", "multibanco", "card"] as PaymentMethod[]).map((m) => (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => setPaymentMethod(m)}
                                      className={cn(
                                        "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                                        paymentMethod === m
                                          ? "bg-accent text-black"
                                          : "bg-bg-card border border-border text-text-secondary hover:text-text-primary"
                                      )}
                                    >
                                      {{ cash: "Dinheiro", mbway: "MB Way", transferencia: "Transferência", multibanco: "Multibanco", card: "Cartão" }[m]}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() => handleMarkPayment(dropIn)}
                                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
                                  >
                                    Confirmar pagamento
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPaymentDropInId(null)}
                                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ── Add athlete drawer ───────────────────────────────────────────────── */}
      <Drawer
        open={addOpen}
        onClose={() => { setAddOpen(false); setMemberSearch(""); }}
        title="Adicionar atleta"
        subtitle={`${cls.name} · ${formatTime(cls.starts_at)}`}
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Pesquisar por nome…"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            autoFocus
            className="w-full rounded-xl border border-border bg-bg-input px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {loadingMembers ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-border" />
                  <div className="h-3 w-36 rounded bg-border" />
                </div>
              ))}
            </div>
          ) : availableMembers !== null && availableMembers.length === 0 ? (
            <p className="text-sm text-text-tertiary">Todos os membros já estão inscritos.</p>
          ) : filteredMembers.length === 0 && memberSearch ? (
            <p className="text-sm text-text-tertiary">Sem resultados para "{memberSearch}".</p>
          ) : (
            <div className="rounded-xl border border-border bg-bg-card divide-y divide-border overflow-hidden max-h-[60vh] overflow-y-auto">
              {filteredMembers.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  disabled={pending}
                  onClick={() => handleAdd(m.user_id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-input transition-colors disabled:opacity-50"
                >
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-accent/15 flex items-center justify-center text-sm font-semibold text-accent shrink-0">
                      {avatarInitial(m.full_name)}
                    </div>
                  )}
                  <span className="text-sm text-text-primary">{m.full_name ?? "Atleta"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Drawer>

      {/* Edit drawer — only for upcoming classes */}
      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar aula"
        subtitle={`${formatTime(cls.starts_at)} · ${cls.name}`}
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-text-secondary">Coach</p>
            <div className="space-y-2">
              {coaches.map((c) => {
                const selected = editCoachId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setEditCoachId(c.id)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all duration-150",
                      selected
                        ? "border-accent bg-accent/5 text-text-primary"
                        : "border-border bg-bg-input text-text-secondary hover:border-accent/40 hover:text-text-primary"
                    )}
                  >
                    <span className="font-medium">{c.full_name ?? "—"}</span>
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

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-text-secondary">Capacidade</p>
            <input
              type="number"
              min={1}
              value={editCapacity}
              onChange={(e) => setEditCapacity(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg-input px-4 py-3 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={pending}
              onClick={handleUpdate}
              className="w-full rounded-2xl bg-accent px-4 py-3.5 text-base font-semibold text-accent-fg transition-opacity disabled:opacity-50"
            >
              {pending ? "A guardar…" : "Guardar alterações"}
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="w-full rounded-2xl border border-border px-4 py-3.5 text-base font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}

function StatusBadge({ status }: { status: CoachTodayClass["status"] }) {
  const cfg = {
    ongoing: { label: "Em curso", cls: "bg-accent/10 text-accent" },
    upcoming: { label: "Próxima", cls: "bg-bg-input text-text-secondary" },
    finished: { label: "Terminada", cls: "bg-bg-input text-text-tertiary" },
  }[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", cfg.cls)}>
      {cfg.label}
    </span>
  );
}
