"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  createDropIn,
  confirmDropIn,
  cancelDropIn,
  updateDropInNotes,
  deleteDropIn,
  type DropIn,
  type DropInStatus,
} from "@/lib/box/drop-in-actions";
import { APP_CONFIG } from "@/lib/config";

type UpcomingClass = { id: string; name: string; starts_at: string; capacity: number };

type Filter = "all" | "pending" | "confirmed" | "cancelled";

const statusLabel: Record<DropInStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

const statusColor: Record<DropInStatus, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-blue-500/10 text-blue-500",
  cancelled: "bg-error/10 text-error",
};

interface Props {
  dropIns: DropIn[];
  boxId: string;
  slug: string;
  dropInPrice: number | null;
  upcomingClasses: UpcomingClass[];
}

export function DropInsClient({ dropIns: initial, boxId, slug, dropInPrice, upcomingClasses }: Props) {
  const [dropIns, setDropIns] = useState<DropIn[]>(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = filter === "all" ? dropIns : dropIns.filter((d) => d.status === filter);

  function optimisticUpdate(id: string, patch: Partial<DropIn>) {
    setDropIns((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function handleConfirm(dropIn: DropIn) {
    startTransition(async () => {
      const res = await confirmDropIn(dropIn.id, boxId, slug);
      if (res.error) { toast.error(res.error); return; }
      optimisticUpdate(dropIn.id, { status: "confirmed" });
      toast.success("Drop-in confirmado. Email enviado ao atleta.");
    });
  }

  function handleCancel(dropIn: DropIn) {
    startTransition(async () => {
      const res = await cancelDropIn(dropIn.id, boxId, slug);
      if (res.error) { toast.error(res.error); return; }
      optimisticUpdate(dropIn.id, { status: "cancelled" });
    });
  }

  function handleSaveNotes(dropInId: string) {
    startTransition(async () => {
      const res = await updateDropInNotes(dropInId, boxId, slug, notesValue);
      if (res.error) { toast.error(res.error); return; }
      optimisticUpdate(dropInId, { notes: notesValue });
      setEditingNotesId(null);
      toast.success("Notas guardadas.");
    });
  }

  function handleDelete(dropInId: string) {
    startTransition(async () => {
      const res = await deleteDropIn(dropInId, boxId, slug);
      if (res.error) { toast.error(res.error); return; }
      setDropIns((prev) => prev.filter((d) => d.id !== dropInId));
      if (expandedId === dropInId) setExpandedId(null);
      toast.success("Drop-in eliminado.");
    });
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "pending", label: "Pendentes" },
    { key: "confirmed", label: "Confirmados" },
    { key: "cancelled", label: "Cancelados" },
  ];

  const pendingCount = dropIns.filter((d) => d.status === "pending").length;
  const dropInUrl = `${typeof window !== "undefined" ? window.location.origin : APP_CONFIG.url}/dropin/${slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setShowLink(!showLink)}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8 6a2.83 2.83 0 0 1 0 4L6.5 11.5a2.83 2.83 0 0 1-4-4l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M6 8a2.83 2.83 0 0 1 0-4L7.5 2.5a2.83 2.83 0 0 1 4 4l-1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Link / QR
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Novo drop-in
        </button>
      </div>

      {/* Link + QR panel */}
      <AnimatePresence>
        {showLink && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-4">
              <div>
                <p className="text-xs font-medium text-text-secondary mb-2">Link público de registo</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={dropInUrl}
                    className="flex-1 rounded-xl border border-border bg-bg-input px-3 py-2 text-xs text-text-secondary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(dropInUrl);
                      toast.success("Link copiado!");
                    }}
                    className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Copiar
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary mb-2">QR Code</p>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(dropInUrl)}`}
                  alt="QR Code drop-in"
                  className="rounded-xl border border-border"
                  width={160}
                  height={160}
                />
              </div>
              {dropInPrice != null && (
                <p className="text-xs text-text-tertiary">
                  Preço do drop-in: <strong className="text-text-primary">{dropInPrice.toFixed(2)} €</strong>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
          <p className="text-xs font-semibold text-warning">
            {pendingCount} drop-in{pendingCount !== 1 ? "s" : ""} a aguardar confirmação
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {filters.map((f) => {
          const count = f.key === "all" ? dropIns.length : dropIns.filter((d) => d.status === f.key).length;
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

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card px-6 py-12 text-center">
          <p className="text-sm text-text-tertiary">
            {filter === "all" ? "Sem drop-ins ainda." : `Sem drop-ins ${statusLabel[filter as DropInStatus]?.toLowerCase()}.`}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((dropIn) => (
            <DropInRow
              key={dropIn.id}
              dropIn={dropIn}
              isExpanded={expandedId === dropIn.id}
              isEditingNotes={editingNotesId === dropIn.id}
              notesValue={notesValue}
              isPending={isPending}
              onToggleExpand={() => {
                setExpandedId(expandedId === dropIn.id ? null : dropIn.id);
                if (expandedId !== dropIn.id) setNotesValue(dropIn.notes ?? "");
              }}
              onConfirm={() => handleConfirm(dropIn)}
              onCancel={() => handleCancel(dropIn)}
              onEditNotes={() => { setEditingNotesId(dropIn.id); setNotesValue(dropIn.notes ?? ""); }}
              onCancelNotes={() => setEditingNotesId(null)}
              onNotesChange={setNotesValue}
              onSaveNotes={() => handleSaveNotes(dropIn.id)}
              onDelete={() => handleDelete(dropIn.id)}
            />
          ))}
        </ul>
      )}

      {/* Create form modal */}
      <AnimatePresence>
        {showForm && (
          <CreateDropInModal
            boxId={boxId}
            slug={slug}
            upcomingClasses={upcomingClasses}
            onClose={() => setShowForm(false)}
            onCreated={(d) => {
              setDropIns((prev) => [d, ...prev]);
              setShowForm(false);
              toast.success("Drop-in criado e confirmado.");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

interface RowProps {
  dropIn: DropIn;
  isExpanded: boolean;
  isEditingNotes: boolean;
  notesValue: string;
  isPending: boolean;
  onToggleExpand: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onEditNotes: () => void;
  onCancelNotes: () => void;
  onNotesChange: (v: string) => void;
  onSaveNotes: () => void;
  onDelete: () => void;
}

function DropInRow({
  dropIn, isExpanded, isEditingNotes, notesValue, isPending,
  onToggleExpand, onConfirm, onCancel, onEditNotes, onCancelNotes, onNotesChange, onSaveNotes, onDelete,
}: RowProps) {
  const displayName = dropIn.name ?? dropIn.email ?? "Drop-in";
  const isPending2 = dropIn.status === "pending";

  return (
    <li className={`rounded-2xl border overflow-hidden ${isPending2 ? "border-warning/40 bg-warning/5" : "border-border bg-bg-card"}`}>
      <button
        onClick={onToggleExpand}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-input/40 transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-sm font-semibold text-blue-500">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
          <p className="text-xs text-text-tertiary truncate">
            {dropIn.email ?? dropIn.date}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[dropIn.status]}`}>
          {statusLabel[dropIn.status]}
        </span>
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
                {dropIn.name && (
                  <div>
                    <p className="text-text-tertiary mb-0.5">Nome</p>
                    <p className="text-text-primary">{dropIn.name}</p>
                  </div>
                )}
                {dropIn.nickname && (
                  <div>
                    <p className="text-text-tertiary mb-0.5">Nickname</p>
                    <p className="text-text-primary">{dropIn.nickname}</p>
                  </div>
                )}
                {dropIn.email && (
                  <div>
                    <p className="text-text-tertiary mb-0.5">Email</p>
                    <p className="text-text-primary">{dropIn.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-text-tertiary mb-0.5">Data</p>
                  <p className="text-text-primary">{new Date(dropIn.date).toLocaleDateString("pt-PT")}</p>
                </div>
                {dropIn.amount_paid != null && (
                  <div>
                    <p className="text-text-tertiary mb-0.5">Pago</p>
                    <p className="text-text-primary">{dropIn.amount_paid.toFixed(2)} €</p>
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
                      placeholder="Observações..."
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
                    {dropIn.notes || <span className="text-text-tertiary italic">Sem notas.</span>}
                  </p>
                )}
              </div>

              {/* Actions */}
              {dropIn.status !== "cancelled" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {dropIn.status === "pending" && (
                    <button
                      onClick={onConfirm}
                      disabled={isPending}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-black hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      Confirmar drop-in
                    </button>
                  )}
                  <button
                    onClick={onCancel}
                    disabled={isPending}
                    className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/5 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              <div className="pt-1 border-t border-border/50">
                <button
                  onClick={onDelete}
                  disabled={isPending}
                  className="text-xs text-error/70 hover:text-error transition-colors"
                >
                  Eliminar registo
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

function CreateDropInModal({
  boxId, slug, upcomingClasses, onClose, onCreated,
}: {
  boxId: string;
  slug: string;
  upcomingClasses: UpcomingClass[];
  onClose: () => void;
  onCreated: (d: DropIn) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const todayStr = new Date().toLocaleDateString("sv", { timeZone: "UTC" });
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const minDate = upcomingClasses.length > 0
    ? new Date(upcomingClasses[0].starts_at).toLocaleDateString("sv", { timeZone: "UTC" })
    : todayStr;
  const maxDate = upcomingClasses.length > 0
    ? new Date(upcomingClasses[upcomingClasses.length - 1].starts_at).toLocaleDateString("sv", { timeZone: "UTC" })
    : todayStr;

  const classesForDay = upcomingClasses.filter((cls) => {
    const clsDate = new Date(cls.starts_at).toLocaleDateString("sv", { timeZone: "UTC" });
    return clsDate === selectedDate;
  });

  const selectedClass = classesForDay.find((c) => c.id === selectedClassId) ?? null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("boxId", boxId);
    fd.set("slug", slug);
    fd.set("class_id", selectedClass?.id ?? "");

    startTransition(async () => {
      const res = await createDropIn(fd);
      if (res.error) { setError(res.error); return; }
      onCreated(res.data as DropIn);
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
          <h2 className="text-base font-semibold text-text-primary">Novo drop-in</h2>
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
              placeholder="Nome do atleta"
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
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Nickname</label>
              <input
                name="nickname"
                className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="@handle"
              />
            </div>
          </div>

          {/* Seletor de aula */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-secondary">Aula</label>
            <input
              type="date"
              value={selectedDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedClassId("");
              }}
              className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <div className="space-y-1.5">
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
              placeholder="Observações..."
            />
          </div>

          {error && <p className="text-xs text-error">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "A criar…" : "Criar drop-in"}
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
