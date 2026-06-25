"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { assignModalityWod } from "@/lib/box/classes-actions";
import { PrimaryButton } from "@/components/shared";
import type { Wod, ClassTemplate } from "@/types";

const TYPE_COLORS: Record<string, string> = {
  AMRAP:      "bg-green-100 text-green-800 border-green-200",
  "For Time": "bg-blue-100 text-blue-800 border-blue-200",
  "For Load": "bg-amber-100 text-amber-800 border-amber-200",
  EMOM:       "bg-purple-100 text-purple-800 border-purple-200",
  Tabata:     "bg-teal-100 text-teal-800 border-teal-200",
  Custom:     "bg-border/60 text-text-secondary border-border",
};

interface Props {
  open: boolean;
  onClose: () => void;
  boxId: string;
  date: string;
  modalityName: string;
  templates: Pick<ClassTemplate, "id" | "name" | "start_time" | "duration_minutes" | "capacity">[];
  wods: Wod[];
  currentWodIds: string[];
}

export function WodPickerDrawer({
  open,
  onClose,
  boxId,
  date,
  modalityName,
  templates,
  wods,
  currentWodIds,
}: Props) {
  const [selected, setSelected] = useState<string[]>(currentWodIds);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) setSelected(currentWodIds);
  }, [open, currentWodIds]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function toggleWod(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await assignModalityWod(boxId, date, modalityName, selected, templates);
      if (result.error) {
        toast.error(result.error);
      } else {
        const count = selected.length;
        toast.success(
          count === 0 ? "WODs removidos" :
          count === 1 ? "WOD atribuído" :
          `${count} WODs atribuídos`
        );
        onClose();
      }
    });
  }

  // WODs scheduled for this exact date go first
  const suggested = wods.filter((w) => w.scheduled_for === date);
  const others    = wods.filter((w) => w.scheduled_for !== date);

  const hasChanges =
    selected.length !== currentWodIds.length ||
    selected.some((id) => !currentWodIds.includes(id));

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

            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="label-caps text-text-tertiary mb-1">WODs do dia</p>
                <h2 className="font-display text-2xl leading-tight text-text-primary">
                  {modalityName}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {formatDate(date)} · selecciona um ou mais blocos
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary hover:text-text-primary transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Selection summary */}
            {selected.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5 p-3 rounded-xl bg-bg-input border border-border">
                {selected.map((id) => {
                  const wod = wods.find((w) => w.id === id);
                  if (!wod) return null;
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 text-xs font-medium bg-bg-base border border-border rounded-full px-2.5 py-1"
                    >
                      {wod.title}
                      <button
                        type="button"
                        onClick={() => toggleWod(id)}
                        className="ml-0.5 text-text-tertiary hover:text-red-500 transition-colors"
                        aria-label={`Remover ${wod.title}`}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* No WODs state */}
            {wods.length === 0 && (
              <div className="rounded-xl border border-border bg-bg-card px-4 py-8 text-center mb-5">
                <p className="text-sm text-text-secondary">Sem WODs publicados</p>
                <p className="text-xs text-text-tertiary mt-1">
                  Publica WODs em <span className="font-medium">WODs</span> para os poder atribuir aqui.
                </p>
              </div>
            )}

            {/* Suggested */}
            {suggested.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary mb-2">
                  Programados para hoje
                </p>
                <div className="space-y-2">
                  {suggested.map((wod) => (
                    <WodOption
                      key={wod.id}
                      wod={wod}
                      selected={selected.includes(wod.id)}
                      onToggle={() => toggleWod(wod.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All other published wods */}
            {others.length > 0 && (
              <div className="mb-5">
                {suggested.length > 0 && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary mb-2">
                    Outros WODs publicados
                  </p>
                )}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {others.map((wod) => (
                    <WodOption
                      key={wod.id}
                      wod={wod}
                      selected={selected.includes(wod.id)}
                      onToggle={() => toggleWod(wod.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <PrimaryButton loading={pending} onClick={handleConfirm} disabled={!hasChanges}>
                {selected.length === 0
                  ? "Confirmar (sem WOD)"
                  : selected.length === 1
                  ? "Confirmar WOD"
                  : `Confirmar ${selected.length} WODs`}
              </PrimaryButton>
              {currentWodIds.length > 0 && selected.length > 0 && (
                <PrimaryButton
                  variant="secondary"
                  loading={pending}
                  onClick={() => setSelected([])}
                >
                  Remover todos
                </PrimaryButton>
              )}
              <PrimaryButton variant="secondary" onClick={onClose}>
                Cancelar
              </PrimaryButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function WodOption({
  wod,
  selected,
  onToggle,
}: {
  wod: Wod;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full text-left rounded-xl border px-3 py-3 transition-all duration-150",
        selected
          ? "border-accent bg-accent/5"
          : "border-border bg-bg-input hover:border-accent/40 hover:bg-bg-card"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{wod.title}</p>
          {wod.description && (
            <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{wod.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full border",
            TYPE_COLORS[wod.type] ?? TYPE_COLORS.Custom
          )}>
            {wod.type}
          </span>
          <div className={cn(
            "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
            selected ? "border-accent bg-accent" : "border-border"
          )}>
            {selected && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-PT", {
    weekday: "long", day: "numeric", month: "long",
  });
}
