"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  createTrial,
  updateTrialStatus,
  updateTrialNotes,
  convertTrialToMember,
  deleteTrial,
} from "@/lib/box/trial-actions";

type Trial = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  scheduled_for: string | null;
  class_id: string | null;
  status: "scheduled" | "completed" | "converted" | "lost";
  converted_at: string | null;
  notes: string | null;
  created_at: string;
};

type UpcomingClass = { id: string; name: string; starts_at: string; capacity: number };

type Filter = "all" | "scheduled" | "completed" | "converted" | "lost";

const statusLabel: Record<string, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  converted: "Convertido",
  lost: "Perdido",
};

const statusColor: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-500",
  completed: "bg-text-tertiary/10 text-text-tertiary",
  converted: "bg-success/10 text-success",
  lost: "bg-error/10 text-error",
};

interface Props {
  trials: Trial[];
  boxId: string;
  boxName: string;
  slug: string;
  upcomingClasses: UpcomingClass[];
}

export function TrialsClient({ trials: initial, boxId, slug, upcomingClasses }: Props) {
  const [trials, setTrials] = useState<Trial[]>(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const now = new Date();

  const filtered = filter === "all" ? trials : trials.filter((t) => t.status === filter);

  // Trial "needs action": aula já passou e ainda está scheduled
  function needsAction(trial: Trial) {
    return (
      trial.status === "scheduled" &&
      trial.scheduled_for != null &&
      new Date(trial.scheduled_for) < now
    );
  }

  function optimisticUpdate(id: string, patch: Partial<Trial>) {
    setTrials((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function handleStatusChange(trial: Trial, status: Trial["status"]) {
    if (status === "converted" && !trial.email) {
      toast.error("Este trial não tem email. Não é possível converter sem email.");
      return;
    }

    if (status === "converted" && trial.email) {
      startTransition(async () => {
        const res = await convertTrialToMember(trial.id, boxId, slug, trial.email!);
        if (res.error) { toast.error(res.error); return; }
        optimisticUpdate(trial.id, { status: "converted", converted_at: new Date().toISOString() });
        if (res.data?.addedDirectly) toast.success("Atleta adicionado diretamente como membro.");
        else toast.success("Convite enviado por email.");
      });
      return;
    }

    startTransition(async () => {
      const res = await updateTrialStatus(trial.id, boxId, slug, status);
      if (res.error) { toast.error(res.error); return; }
      optimisticUpdate(trial.id, { status });
    });
  }

  function handleSaveNotes(trialId: string) {
    startTransition(async () => {
      const res = await updateTrialNotes(trialId, boxId, slug, notesValue);
      if (res.error) { toast.error(res.error); return; }
      optimisticUpdate(trialId, { notes: notesValue });
      setEditingNotesId(null);
      toast.success("Notas guardadas.");
    });
  }

  function handleDelete(trialId: string) {
    startTransition(async () => {
      const res = await deleteTrial(trialId, boxId, slug);
      if (res.error) { toast.error(res.error); return; }
      setTrials((prev) => prev.filter((t) => t.id !== trialId));
      if (expandedId === trialId) setExpandedId(null);
      toast.success("Trial eliminado.");
    });
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "scheduled", label: "Agendados" },
    { key: "completed", label: "Concluídos" },
    { key: "converted", label: "Convertidos" },
    { key: "lost", label: "Perdidos" },
  ];

  // Separar trials que precisam de ação dos restantes (dentro do filtro ativo)
  const needsActionList = filtered.filter(needsAction);
  const normalList = filtered.filter((t) => !needsAction(t));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Novo trial
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {filters.map((f) => {
          const count = f.key === "all" ? trials.length : trials.filter((t) => t.status === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-accent text-black"
                  : "bg-bg-card text-text-secondary hover:text-text-primary border border-border"
              }`}
            >
              {f.label} <span className="opacity-60 ml-1">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Needs action section */}
      {needsActionList.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
            <p className="text-xs font-semibold text-warning">A aguardar ação ({needsActionList.length})</p>
          </div>
          <ul className="space-y-2">
            {needsActionList.map((trial) => (
              <TrialRow
                key={trial.id}
                trial={trial}
                highlight
                isExpanded={expandedId === trial.id}
                isEditingNotes={editingNotesId === trial.id}
                notesValue={notesValue}
                isPending={isPending}
                onToggleExpand={() => {
                  setExpandedId(expandedId === trial.id ? null : trial.id);
                  if (expandedId !== trial.id && trial.notes) setNotesValue(trial.notes);
                }}
                onStatusChange={(s) => handleStatusChange(trial, s)}
                onEditNotes={() => { setEditingNotesId(trial.id); setNotesValue(trial.notes ?? ""); }}
                onCancelNotes={() => setEditingNotesId(null)}
                onNotesChange={setNotesValue}
                onSaveNotes={() => handleSaveNotes(trial.id)}
                onDelete={() => handleDelete(trial.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Normal list */}
      {normalList.length === 0 && needsActionList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card px-6 py-12 text-center">
          <p className="text-sm text-text-tertiary">Sem trials {filter !== "all" ? `com estado "${statusLabel[filter]}"` : "ainda"}.</p>
        </div>
      ) : (
        normalList.length > 0 && (
          <ul className="space-y-2">
            {normalList.map((trial) => (
              <TrialRow
                key={trial.id}
                trial={trial}
                highlight={false}
                isExpanded={expandedId === trial.id}
                isEditingNotes={editingNotesId === trial.id}
                notesValue={notesValue}
                isPending={isPending}
                onToggleExpand={() => {
                  setExpandedId(expandedId === trial.id ? null : trial.id);
                  if (expandedId !== trial.id && trial.notes) setNotesValue(trial.notes);
                }}
                onStatusChange={(s) => handleStatusChange(trial, s)}
                onEditNotes={() => { setEditingNotesId(trial.id); setNotesValue(trial.notes ?? ""); }}
                onCancelNotes={() => setEditingNotesId(null)}
                onNotesChange={setNotesValue}
                onSaveNotes={() => handleSaveNotes(trial.id)}
                onDelete={() => handleDelete(trial.id)}
              />
            ))}
          </ul>
        )
      )}

      {/* Create form modal */}
      <AnimatePresence>
        {showForm && (
          <CreateTrialModal
            boxId={boxId}
            slug={slug}
            upcomingClasses={upcomingClasses}
            onClose={() => setShowForm(false)}
            onCreated={(t) => {
              setTrials((prev) => [t as Trial, ...prev]);
              setShowForm(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Trial row ─────────────────────────────────────────────────────────────────

interface TrialRowProps {
  trial: Trial;
  highlight: boolean;
  isExpanded: boolean;
  isEditingNotes: boolean;
  notesValue: string;
  isPending: boolean;
  onToggleExpand: () => void;
  onStatusChange: (s: Trial["status"]) => void;
  onEditNotes: () => void;
  onCancelNotes: () => void;
  onNotesChange: (v: string) => void;
  onSaveNotes: () => void;
  onDelete: () => void;
}

function TrialRow({
  trial, highlight, isExpanded, isEditingNotes, notesValue, isPending,
  onToggleExpand, onStatusChange, onEditNotes, onCancelNotes, onNotesChange, onSaveNotes, onDelete,
}: TrialRowProps) {
  return (
    <li className={`rounded-2xl border overflow-hidden ${highlight ? "border-warning/40 bg-warning/5" : "border-border bg-bg-card"}`}>
      <button
        onClick={onToggleExpand}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-input/40 transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
          {trial.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{trial.name}</p>
          <p className="text-xs text-text-tertiary truncate">
            {trial.scheduled_for
              ? new Date(trial.scheduled_for).toLocaleString("pt-PT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" })
              : trial.email ?? trial.phone ?? "Sem aula associada"}
          </p>
        </div>
        {highlight && (
          <span className="shrink-0 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
            Aguarda ação
          </span>
        )}
        {!highlight && (
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[trial.status]}`}>
            {statusLabel[trial.status]}
          </span>
        )}
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className={`shrink-0 text-text-tertiary transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {trial.email && (
                  <div>
                    <p className="text-text-tertiary mb-0.5">Email</p>
                    <p className="text-text-primary">{trial.email}</p>
                  </div>
                )}
                {trial.phone && (
                  <div>
                    <p className="text-text-tertiary mb-0.5">Telefone</p>
                    <p className="text-text-primary">{trial.phone}</p>
                  </div>
                )}
                {trial.scheduled_for && (
                  <div>
                    <p className="text-text-tertiary mb-0.5">Aula</p>
                    <p className="text-text-primary">
                      {new Date(trial.scheduled_for).toLocaleString("pt-PT", {
                        weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
                      })}
                    </p>
                  </div>
                )}
                {trial.converted_at && (
                  <div>
                    <p className="text-text-tertiary mb-0.5">Convertido em</p>
                    <p className="text-text-primary">{new Date(trial.converted_at).toLocaleDateString("pt-PT")}</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-text-tertiary">Notas</p>
                  {!isEditingNotes && (
                    <button onClick={onEditNotes} className="text-xs text-accent hover:underline underline-offset-4">
                      Editar
                    </button>
                  )}
                </div>
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => onNotesChange(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                      placeholder="Adiciona notas sobre este prospect..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={onSaveNotes}
                        disabled={isPending}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={onCancelNotes}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">
                    {trial.notes || <span className="text-text-tertiary italic">Sem notas.</span>}
                  </p>
                )}
              </div>

              {/* Actions */}
              {trial.status !== "converted" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {trial.status !== "completed" && (
                    <button
                      onClick={() => onStatusChange("completed")}
                      disabled={isPending}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-text-tertiary transition-colors disabled:opacity-50"
                    >
                      Marcar concluído
                    </button>
                  )}
                  {trial.status !== "lost" && (
                    <button
                      onClick={() => onStatusChange("lost")}
                      disabled={isPending}
                      className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/5 transition-colors disabled:opacity-50"
                    >
                      Marcar perdido
                    </button>
                  )}
                  {trial.email && (
                    <button
                      onClick={() => onStatusChange("converted")}
                      disabled={isPending}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-black hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      Converter em membro
                    </button>
                  )}
                  {trial.status !== "scheduled" && (
                    <button
                      onClick={() => onStatusChange("scheduled")}
                      disabled={isPending}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
                    >
                      Repor agendado
                    </button>
                  )}
                </div>
              )}

              <div className="pt-1 border-t border-border/50">
                <button
                  onClick={onDelete}
                  disabled={isPending}
                  className="text-xs text-error/70 hover:text-error transition-colors"
                >
                  Eliminar trial
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateTrialModal({
  boxId, slug, upcomingClasses, onClose, onCreated,
}: {
  boxId: string;
  slug: string;
  upcomingClasses: UpcomingClass[];
  onClose: () => void;
  onCreated: (t: unknown) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  // Use UTC consistently — same as the rest of the app (formatTime uses timeZone:"UTC")
  const todayStr = new Date().toLocaleDateString("sv", { timeZone: "UTC" });
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const minDate = upcomingClasses.length > 0
    ? new Date(upcomingClasses[0].starts_at).toLocaleDateString("sv", { timeZone: "UTC" })
    : todayStr;
  const maxDate = upcomingClasses.length > 0
    ? new Date(upcomingClasses[upcomingClasses.length - 1].starts_at).toLocaleDateString("sv", { timeZone: "UTC" })
    : todayStr;

  // Classes for the selected date (UTC)
  const classesForDay = upcomingClasses.filter((cls) => {
    const clsDate = new Date(cls.starts_at).toLocaleDateString("sv", { timeZone: "UTC" });
    return clsDate === selectedDate;
  });

  // Reset selected class if it's no longer in the current day's list
  const selectedClass = classesForDay.find((c) => c.id === selectedClassId) ?? null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("boxId", boxId);
    fd.set("slug", slug);
    fd.set("class_id", selectedClass?.id ?? "");

    startTransition(async () => {
      const res = await createTrial(fd);
      if (res.error) { setError(res.error); return; }
      toast.success("Trial criado.");
      onCreated(res.data);
    });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-2xl border border-border bg-bg-base p-6 shadow-xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 max-h-[90vh] overflow-y-auto"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Novo trial</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-input text-text-tertiary hover:text-text-primary">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Nome *</label>
            <input
              name="name"
              required
              autoFocus
              className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="Nome do prospect"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Email</label>
              <input
                name="email"
                type="email"
                className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="email@exemplo.pt"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Telefone</label>
              <input
                name="phone"
                type="tel"
                className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="912 345 678"
              />
            </div>
          </div>

          {/* Seletor de aula por data */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-secondary">Aula</label>

            {/* Date picker */}
            <input
              type="date"
              value={selectedDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedClassId(""); // reset class when date changes
              }}
              className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
            />

            {/* Classes for the selected day */}
            <div className="space-y-1.5">
              {/* No class option */}
              <button
                type="button"
                onClick={() => setSelectedClassId("")}
                className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-all ${
                  selectedClassId === ""
                    ? "border-accent bg-accent/5 text-text-primary"
                    : "border-border bg-bg-input text-text-secondary hover:border-accent/40"
                }`}
              >
                <span>Sem aula associada</span>
                {selectedClassId === "" && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1.5 6l3 3 6-6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {classesForDay.length === 0 ? (
                <p className="px-1 text-xs text-text-tertiary">Sem aulas neste dia.</p>
              ) : (
                classesForDay.map((cls) => {
                  const selected = selectedClassId === cls.id;
                  const time = new Date(cls.starts_at).toLocaleTimeString("pt-PT", {
                    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
                  });
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-all ${
                        selected
                          ? "border-accent bg-accent/5 text-text-primary"
                          : "border-border bg-bg-input text-text-secondary hover:border-accent/40"
                      }`}
                    >
                      <div className="text-left min-w-0">
                        <p className="font-medium truncate">{cls.name}</p>
                        <p className="text-xs text-text-tertiary">{time}</p>
                      </div>
                      {selected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 ml-2">
                          <path d="M1.5 6l3 3 6-6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Notas</label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
              placeholder="Observações iniciais..."
            />
          </div>

          {error && <p className="text-xs text-error">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "A criar…" : "Criar trial"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
