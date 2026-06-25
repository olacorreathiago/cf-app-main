"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleTemplateActive, deleteTemplate } from "@/lib/box/schedule-actions";
import { TemplateDrawer } from "./template-drawer";
import { PrimaryButton } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { ClassTemplate } from "@/types";

// Mon→Sun display order
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

interface Props {
  boxId: string;
  templates: ClassTemplate[];
  modalities: string[];
}

export function WeeklyGrid({ boxId, templates, modalities }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ClassTemplate | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [modalityFilter, setModalityFilter] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"columns" | "rows">("columns");
  const [pending, startTransition] = useTransition();

  const allModalities = Array.from(new Set(templates.map((t) => t.name))).sort();

  function toggleModality(m: string) {
    setModalityFilter((prev) => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  }

  const visibleTemplates = modalityFilter.size > 0
    ? templates.filter((t) => modalityFilter.has(t.name))
    : templates;

  const byDay = WEEKDAY_ORDER.reduce<Record<number, ClassTemplate[]>>((acc, d) => {
    acc[d] = visibleTemplates
      .filter((t) => t.weekday === d)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    return acc;
  }, {});

  function openCreate() {
    setEditing(undefined);
    setDrawerOpen(true);
  }

  function openEdit(t: ClassTemplate) {
    setEditing(t);
    setDrawerOpen(true);
  }

  function handleToggle(t: ClassTemplate) {
    startTransition(async () => {
      const result = await toggleTemplateActive(t.id, boxId, !t.active);
      if (result.error) toast.error(result.error);
    });
  }

  function handleDelete(templateId: string) {
    startTransition(async () => {
      const result = await deleteTemplate(templateId, boxId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Template eliminado");
        setConfirmDelete(null);
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-tertiary">
          {templates.filter((t) => t.active).length} aulas activas por semana
        </p>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border bg-bg-input p-0.5">
            <button
              type="button"
              title="Vista em colunas"
              onClick={() => setView("columns")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                view === "columns"
                  ? "bg-bg-base text-text-primary shadow-sm border border-border"
                  : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              {/* Columns icon */}
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1" y="1" width="3" height="11" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="5" y="1" width="3" height="11" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="9" y="1" width="3" height="11" rx="1" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </button>
            <button
              type="button"
              title="Vista em linhas"
              onClick={() => setView("rows")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                view === "rows"
                  ? "bg-bg-base text-text-primary shadow-sm border border-border"
                  : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              {/* Rows icon */}
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="1" y="1" width="11" height="3" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="1" y="5" width="11" height="3" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="1" y="9" width="11" height="3" rx="1" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </button>
          </div>
          <PrimaryButton size="sm" onClick={openCreate} className="w-auto rounded-full px-5">
            + Novo template
          </PrimaryButton>
        </div>
      </div>

      {/* Modality filter */}
      {allModalities.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {allModalities.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggleModality(m)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                modalityFilter.has(m)
                  ? "border-accent bg-accent text-accent-fg shadow-sm"
                  : "border-border bg-bg-input text-text-tertiary hover:border-accent/40 hover:text-text-secondary"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Weekly grid */}
      <div className={cn(
        "gap-3",
        view === "columns"
          ? "grid grid-cols-1 lg:grid-cols-7"
          : "flex flex-col"
      )}>
        {WEEKDAY_ORDER.map((day) => (
          <div
            key={day}
            className={cn(
              "rounded-xl border border-border bg-bg-card overflow-hidden",
              view === "rows" && "flex items-start"
            )}
          >
            {/* Day label */}
            <div className={cn(
              "bg-bg-base border-border",
              view === "columns"
                ? "px-3 py-2 border-b"
                : "px-4 py-3 border-r w-16 shrink-0 self-stretch flex items-start"
            )}>
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                {WEEKDAY_LABELS[day]}
              </span>
            </div>

            {/* Templates */}
            <div className={cn(
              "p-2 space-y-2 min-h-[80px]",
              view === "rows" && "flex-1"
            )}>
              {byDay[day].length === 0 && (
                <p className="text-xs text-text-tertiary py-3 text-center w-full">—</p>
              )}
              {byDay[day].map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "rounded-lg border border-border bg-bg-base text-xs transition-opacity overflow-hidden",
                    !t.active && "opacity-40"
                  )}
                >
                  {/* Content — clickable to edit */}
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className={cn(
                      "w-full text-left transition-colors hover:bg-bg-input/50",
                      view === "columns" ? "px-2.5 py-2" : "px-3 py-3"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn(
                        "shrink-0 h-1.5 w-1.5 rounded-full",
                        t.active ? "bg-green-500" : "bg-border"
                      )} />
                      <p className={cn(
                        "font-semibold text-text-primary truncate leading-tight",
                        view === "rows" && "text-sm"
                      )}>
                        {t.name}
                      </p>
                    </div>
                    <p className={cn(
                      "text-text-tertiary pl-3 leading-tight",
                      view === "rows" && "text-xs mt-0.5"
                    )}>
                      {t.start_time.slice(0, 5)} · {t.duration_minutes}min · {t.capacity} lugares
                    </p>
                  </button>

                  {/* Actions footer */}
                  <div
                    className={cn(
                      "flex items-center gap-2 border-t border-border bg-bg-base/50",
                      view === "columns" ? "px-2 py-1.5" : "px-3 py-2"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(t)}
                      disabled={pending}
                      className={cn(
                        "rounded-full border transition-colors disabled:opacity-40",
                        view === "columns"
                          ? "h-5 w-5 flex items-center justify-center border-border text-text-tertiary hover:bg-bg-card hover:text-text-secondary"
                          : "flex items-center gap-1.5 px-3 py-1 text-xs font-medium border-border text-text-secondary hover:border-accent/40 hover:text-text-primary"
                      )}
                    >
                      {view === "columns" ? (
                        t.active ? (
                          <svg width="9" height="9" viewBox="0 0 11 11" fill="none">
                            <rect x="1.5" y="1" width="3" height="9" rx="1" fill="currentColor" />
                            <rect x="6.5" y="1" width="3" height="9" rx="1" fill="currentColor" />
                          </svg>
                        ) : (
                          <svg width="9" height="9" viewBox="0 0 11 11" fill="none">
                            <path d="M2 1.5l8 4-8 4V1.5z" fill="currentColor" />
                          </svg>
                        )
                      ) : (
                        t.active ? "Pausar" : "Activar"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDelete(t.id)}
                      className={cn(
                        "rounded-full border transition-colors",
                        view === "columns"
                          ? "h-5 w-5 flex items-center justify-center border-border text-text-tertiary hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                          : "flex items-center gap-1.5 px-3 py-1 text-xs font-medium border-border text-text-tertiary hover:border-red-200 hover:text-red-600 hover:bg-red-50"
                      )}
                    >
                      {view === "columns" ? (
                        <svg width="9" height="9" viewBox="0 0 11 11" fill="none">
                          <path d="M1.5 2.5h8M4 2.5V1.5h3v1M4.5 4.5v4M6.5 4.5v4M2.5 2.5l.5 7h5l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        "Apagar"
                      )}
                    </button>

                    {view === "rows" && (
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="ml-auto flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="rounded-2xl border border-border bg-bg-base p-6 shadow-xl w-full max-w-sm space-y-4">
            <div>
              <p className="label-caps text-text-tertiary mb-1">Confirmar acção</p>
              <h3 className="font-display text-xl text-text-primary">Apagar template?</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Esta acção é irreversível. As aulas já geradas não são afectadas.
              </p>
            </div>
            <div className="space-y-2">
              <PrimaryButton
                variant="primary"
                loading={pending}
                onClick={() => handleDelete(confirmDelete)}
                className="bg-red-500 hover:bg-red-600 disabled:bg-red-300"
              >
                {pending ? "A apagar…" : "Apagar template"}
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Template drawer */}
      <TemplateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        boxId={boxId}
        modalities={modalities}
        template={editing}
      />
    </>
  );
}
