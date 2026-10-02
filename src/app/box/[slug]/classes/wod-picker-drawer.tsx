"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { assignModalityWod } from "@/lib/box/classes-actions";
import { PrimaryButton, DrawerShell } from "@/components/shared";
import { WodDrawer } from "../wods/wod-drawer";
import type { Wod, ClassTemplate, BenchmarkWod } from "@/types";

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
  benchmarks: BenchmarkWod[];
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
  benchmarks,
}: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(currentWodIds);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setSelected(currentWodIds);
      setCreating(false);
      setQuery("");
    }
  }, [open, currentWodIds]);

  // The new WOD is created while the picker is hidden; once saved we come back
  // to the picker with it already ticked. router.refresh() brings it into `wods`.
  function handleCreated(wodId: string) {
    setSelected((prev) => (prev.includes(wodId) ? prev : [...prev, wodId]));
    setCreating(false);
    router.refresh();
  }

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
  const q = query.trim().toLowerCase();
  const matches = (w: Wod) =>
    !q ||
    w.title.toLowerCase().includes(q) ||
    w.type.toLowerCase().includes(q) ||
    (w.description ?? "").toLowerCase().includes(q);
  const filtered  = wods.filter(matches);
  const suggested = filtered.filter((w) => w.scheduled_for === date);
  const others    = filtered.filter((w) => w.scheduled_for !== date);

  const hasChanges =
    selected.length !== currentWodIds.length ||
    selected.some((id) => !currentWodIds.includes(id));

  return (
    <>
    <WodDrawer
      open={open && creating}
      onClose={() => setCreating(false)}
      boxId={boxId}
      benchmarks={benchmarks}
      publishOnly
      onCreated={handleCreated}
    />
    <DrawerShell
      open={open && !creating}
      onClose={onClose}
      header={
        <>
          <p className="label-caps text-text-tertiary mb-1">WODs do dia</p>
          <h2 className="font-display text-2xl leading-tight text-text-primary">
            {modalityName}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {formatDate(date)} · selecciona um ou mais blocos
          </p>
        </>
      }
      footer={
        <>
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
        </>
      }
    >
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-3 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-accent/50 hover:text-text-primary"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Criar novo WOD
            </button>

            {wods.length > 0 && (
              <div className="relative mb-4">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
                >
                  <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pesquisar WODs…"
                  aria-label="Pesquisar WODs"
                  className="w-full rounded-xl border border-border bg-bg-input py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent/50 focus:outline-none"
                />
              </div>
            )}

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
                  Cria o primeiro WOD com o botão acima.
                </p>
              </div>
            )}

            {wods.length > 0 && filtered.length === 0 && (
              <p className="mb-5 px-1 py-6 text-center text-sm text-text-tertiary">
                Nenhum WOD corresponde a “{query.trim()}”.
              </p>
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
    </DrawerShell>
    </>
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
