"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { publishWod, unpublishWod, deleteWod, duplicateWod, getWod } from "@/lib/box/wod-actions";
import type { Wod } from "@/types";

const TYPE_COLORS: Record<string, string> = {
  AMRAP:      "bg-green-100 text-green-800 border-green-200",
  "For Time": "bg-blue-100 text-blue-800 border-blue-200",
  "For Load": "bg-amber-100 text-amber-800 border-amber-200",
  EMOM:       "bg-purple-100 text-purple-800 border-purple-200",
  Tabata:     "bg-teal-100 text-teal-800 border-teal-200",
  Custom:     "bg-border/60 text-text-secondary border-border",
};

const CATEGORY_LABELS: Record<string, string> = {
  girls:        "The Girls",
  heroes:       "Heroes",
  notables:     "Notables",
  games:        "Games",
  weightlifting:"Weightlifting",
  endurance:    "Endurance",
  gymnastics:   "Gymnastics",
  original:     "Original",
};

interface Props {
  wod: Wod;
  boxId: string;
  onEdit: (wod: Wod) => void;
}

export function WodCard({ wod, boxId, onEdit }: Props) {
  const [pending, startTransition] = useTransition();

  const isPublished = Boolean(wod.published_at);

  function handlePublishToggle() {
    startTransition(async () => {
      const result = isPublished
        ? await unpublishWod(wod.id, boxId)
        : await publishWod(wod.id, boxId);
      if (result.error) toast.error(result.error);
      else toast.success(isPublished ? "WOD despublicado" : "WOD publicado");
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateWod(wod.id, boxId);
      if (result.error) { toast.error(result.error); return; }
      if (result.id) {
        const copy = await getWod(result.id);
        if (copy) onEdit(copy);
      }
      toast.success("WOD duplicado — a editar cópia");
    });
  }

  function handleDelete() {
    if (!confirm(`Apagar "${wod.title}"? Esta acção não pode ser desfeita.`)) return;
    startTransition(async () => {
      const result = await deleteWod(wod.id, boxId);
      if (result.error) toast.error(result.error);
      else toast.success("WOD apagado");
    });
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-bg-card overflow-hidden transition-opacity",
        pending && "opacity-50 pointer-events-none"
      )}
    >
      {/* Main row — clickable to edit */}
      <button
        type="button"
        onClick={() => onEdit(wod)}
        className="w-full text-left px-4 py-4 hover:bg-bg-input/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className={cn(
                "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border",
                TYPE_COLORS[wod.type] ?? TYPE_COLORS.Custom
              )}>
                {wod.type}
              </span>
              {wod.category !== "original" && (
                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-bg-base text-text-tertiary">
                  {CATEGORY_LABELS[wod.category]}
                </span>
              )}
              {wod.benchmark_slug && (
                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-bg-base text-text-tertiary">
                  Benchmark
                </span>
              )}
            </div>

            {/* Title */}
            <p className="font-semibold text-text-primary truncate">{wod.title}</p>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {wod.scheduled_for && (
                <span className="text-xs text-text-tertiary">
                  {formatDate(wod.scheduled_for)}
                </span>
              )}
              {wod.time_cap_minutes && (
                <span className="text-xs text-text-tertiary">
                  {wod.time_cap_minutes} min
                </span>
              )}
              {(wod.movements as unknown[]).length > 0 && (
                <span className="text-xs text-text-tertiary">
                  {(wod.movements as unknown[]).length} mov.
                </span>
              )}
              {wod.creator_name && (
                <span className="text-xs text-text-tertiary">
                  por {wod.creator_name}
                </span>
              )}
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {isPublished ? (
              <span className="flex items-center gap-1 text-xs font-medium text-green-700 border border-green-200 bg-green-50 rounded-full px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Publicado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-text-tertiary border border-border rounded-full px-2 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-border" />
                Rascunho
              </span>
            )}
            {/* Edit chevron */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-tertiary">
              <path d="M5 2l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </button>

      {/* Actions footer */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border bg-bg-base/50">
        <button
          type="button"
          onClick={handlePublishToggle}
          className={cn(
            "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
            isPublished
              ? "border-border text-text-secondary hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50"
              : "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
          )}
        >
          {isPublished ? "Despublicar" : "Publicar"}
        </button>

        <button
          type="button"
          onClick={() => onEdit(wod)}
          className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors"
        >
          Editar
        </button>

        <button
          type="button"
          onClick={handleDuplicate}
          className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors"
          title="Duplicar e editar"
        >
          Duplicar
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="ml-auto text-xs font-medium px-3 py-1.5 rounded-full border border-border text-text-tertiary hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          Apagar
        </button>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
}
