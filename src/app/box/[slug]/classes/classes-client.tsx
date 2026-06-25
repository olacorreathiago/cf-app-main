"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ModalityGroup } from "./modality-group";
import { SpecialClassButton } from "./special-class-form";
import { SpecialSlotCard } from "./special-slot-card";
import { bulkPublishClasses, type BulkSlot } from "@/lib/box/classes-actions";
import { PrimaryButton } from "@/components/shared";
import type { ClassInstance, ClassTemplate, Wod } from "@/types";
import type { ClassSlot } from "./slot-card";

interface Coach {
  id: string;
  full_name: string | null;
  nickname: string | null;
}

interface ModalityGroupData {
  name: string;
  wodIds: string[];
  slots: ClassSlot[];
  templates: Pick<ClassTemplate, "id" | "name" | "start_time" | "duration_minutes" | "capacity">[];
}

export interface DayData {
  date: string;
  dayLabel: string;
  groups: ModalityGroupData[];
  specials: { cls: ClassInstance; confirmedCount: number }[];
}

interface Props {
  days: DayData[];
  boxId: string;
  slug: string;
  coaches: Coach[];
  ownerProfileId: string | null;
  publishedWods: Wod[];
  hasAnyTemplates: boolean;
  weekLabel: string;
  prevWeek: string;
  nextWeek: string;
}

export function ClassesClient({
  days,
  boxId,
  slug,
  coaches,
  ownerProfileId,
  publishedWods,
  hasAnyTemplates,
  weekLabel,
  prevWeek,
  nextWeek,
}: Props) {
  const [selectMode, setSelectMode]   = useState(false);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [bulkDrawer, setBulkDrawer]   = useState(false);
  const [coachId, setCoachId]         = useState(ownerProfileId ?? "");
  const [modalityFilter, setModalityFilter] = useState<Set<string>>(new Set());
  const [pending, startTransition]    = useTransition();

  const allModalities = Array.from(
    new Set(days.flatMap((d) => d.groups.map((g) => g.name)))
  ).sort();

  function toggleModality(m: string) {
    setModalityFilter((prev) => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  }

  const filteredDays = modalityFilter.size > 0
    ? days.map((d) => ({
        ...d,
        groups: d.groups.filter((g) => modalityFilter.has(g.name)),
      }))
    : days;

  function enterSelectMode() { setSelectMode(true); setSelected(new Set()); }
  function exitSelectMode()  { setSelectMode(false); setSelected(new Set()); }

  function toggleSlot(startsAt: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(startsAt) ? next.delete(startsAt) : next.add(startsAt);
      return next;
    });
  }

  function selectDay(date: string, groups: ModalityGroupData[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const dayDraftSlots = groups
        .flatMap((g) => g.slots)
        .filter((s) => (s.instance?.status ?? "draft") === "draft")
        .map((s) => s.startsAt);
      const allSelected = dayDraftSlots.every((k) => next.has(k));
      if (allSelected) {
        dayDraftSlots.forEach((k) => next.delete(k));
      } else {
        dayDraftSlots.forEach((k) => next.add(k));
      }
      return next;
    });
  }

  function selectAll() {
    const allDraft = filteredDays
      .flatMap((d) => d.groups)
      .flatMap((g) => g.slots)
      .filter((s) => (s.instance?.status ?? "draft") === "draft")
      .map((s) => s.startsAt);
    setSelected(new Set(allDraft));
  }

  // Resolve selected slots to BulkSlot[]
  function resolveSelectedSlots(): BulkSlot[] {
    const result: BulkSlot[] = [];
    for (const day of days) {
      for (const group of day.groups) {
        for (const slot of group.slots) {
          if (!selected.has(slot.startsAt)) continue;
          if ((slot.instance?.status ?? "draft") !== "draft") continue;
          result.push({
            templateId:   slot.templateId,
            startsAt:     slot.startsAt,
            templateData: slot.templateData,
            instanceId:   slot.instance?.id ?? null,
          });
        }
      }
    }
    return result;
  }

  function handleBulkPublish() {
    if (!coachId) { toast.error("Selecciona um coach"); return; }
    const slots = resolveSelectedSlots();
    if (!slots.length) { toast.error("Nenhum rascunho seleccionado"); return; }

    startTransition(async () => {
      const result = await bulkPublishClasses(boxId, slots, coachId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          result.published === 1 ? "1 aula publicada" : `${result.published} aulas publicadas`
        );
        setBulkDrawer(false);
        exitSelectMode();
      }
    });
  }

  const draftCount = filteredDays
    .flatMap((d) => d.groups)
    .flatMap((g) => g.slots)
    .filter((s) => (s.instance?.status ?? "draft") === "draft").length;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Gestão de aulas</h1>
          <p className="text-sm text-text-tertiary mt-0.5">
            Publica e gere as aulas da semana.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!selectMode ? (
            <>
              {draftCount > 0 && (
                <button
                  type="button"
                  onClick={enterSelectMode}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-3.5 py-2 text-sm font-medium text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1.5" y="1.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="8.5" y="1.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="1.5" y="8.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    <rect x="8.5" y="8.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                  Publicar em bulk
                </button>
              )}
              <SpecialClassButton boxId={boxId} coaches={coaches} ownerProfileId={ownerProfileId} />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-text-tertiary hover:text-text-primary underline transition-colors"
              >
                Seleccionar todos
              </button>
              <button
                type="button"
                onClick={exitSelectMode}
                className="flex items-center gap-1 rounded-full border border-border bg-bg-card px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2 mb-8">
        <a
          href={`/box/${slug}/classes?week=${prevWeek}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-card text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Semana anterior"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L5 7l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <span className="text-sm font-medium text-text-primary">{weekLabel}</span>
        <a
          href={`/box/${slug}/classes?week=${nextWeek}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-card text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Próxima semana"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      {/* Modality filter */}
      {allModalities.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
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

      {/* No templates warning */}
      {!hasAnyTemplates && (
        <div className="rounded-xl border border-border bg-bg-card px-4 py-6 text-center">
          <p className="text-sm text-text-secondary mb-1">Sem templates activos</p>
          <p className="text-xs text-text-tertiary">
            Define o horário semanal na{" "}
            <a href={`/box/${slug}/schedule`} className="underline hover:text-text-primary transition-colors">
              Agenda
            </a>{" "}
            para os slots aparecerem aqui automaticamente.
          </p>
        </div>
      )}

      {/* Days */}
      <div className="space-y-8 pb-32">
        {filteredDays.map((day) => {
          const hasContent = day.groups.length > 0 || day.specials.length > 0;
          const dayDraftCount = day.groups
            .flatMap((g) => g.slots)
            .filter((s) => (s.instance?.status ?? "draft") === "draft").length;
          const daySelectedCount = day.groups
            .flatMap((g) => g.slots)
            .filter((s) => selected.has(s.startsAt)).length;

          return (
            <section key={day.date}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary capitalize">
                  {day.dayLabel}
                </h2>
                {selectMode && dayDraftCount > 0 && (
                  <button
                    type="button"
                    onClick={() => selectDay(day.date, day.groups)}
                    className="text-xs text-text-tertiary hover:text-text-primary underline transition-colors"
                  >
                    {daySelectedCount === dayDraftCount ? "Desseleccionar" : "Seleccionar dia"}
                  </button>
                )}
              </div>

              {!hasContent ? (
                <p className="text-xs text-text-tertiary pl-1">Sem aulas</p>
              ) : (
                <div className="space-y-3">
                  {day.groups.map((group) => (
                    <ModalityGroup
                      key={group.name}
                      modalityName={group.name}
                      wodIds={group.wodIds}
                      slots={group.slots}
                      templates={group.templates}
                      boxId={boxId}
                      slug={slug}
                      date={day.date}
                      coaches={coaches}
                      ownerProfileId={ownerProfileId}
                      publishedWods={publishedWods}
                      selectMode={selectMode}
                      selectedSlots={selected}
                      onToggleSlot={toggleSlot}
                    />
                  ))}

                  {/* Special classes */}
                  {day.specials.map(({ cls, confirmedCount }) => (
                    <SpecialSlotCard
                      key={cls.id}
                      cls={cls}
                      boxId={boxId}
                      slug={slug}
                      coaches={coaches}
                      ownerProfileId={ownerProfileId}
                      publishedWods={publishedWods}
                      confirmedCount={confirmedCount}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            key="bulk-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-6 pt-3 bg-gradient-to-t from-bg-base via-bg-base/95 to-transparent"
          >
            <div className="mx-auto max-w-3xl flex items-center gap-3 rounded-2xl border border-border bg-bg-card px-4 py-3 shadow-lg">
              <p className="text-sm font-medium text-text-primary flex-1">
                {selected.size === 0
                  ? "Nenhum rascunho seleccionado"
                  : selected.size === 1
                  ? "1 aula seleccionada"
                  : `${selected.size} aulas seleccionadas`}
              </p>
              <button
                type="button"
                onClick={() => setBulkDrawer(true)}
                disabled={selected.size === 0}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-all",
                  selected.size > 0
                    ? "bg-accent text-accent-fg hover:opacity-90"
                    : "bg-bg-input text-text-tertiary cursor-not-allowed"
                )}
              >
                Publicar {selected.size > 0 && `${selected.size}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk publish drawer */}
      <AnimatePresence>
        {bulkDrawer && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setBulkDrawer(false)}
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
                  <p className="label-caps text-text-tertiary mb-1">Publicar em bulk</p>
                  <h2 className="font-display text-2xl leading-tight text-text-primary">
                    {selected.size} {selected.size === 1 ? "aula" : "aulas"}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Escolhe o coach para todas as aulas seleccionadas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkDrawer(false)}
                  aria-label="Fechar"
                  className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-text-secondary">Coach</p>
                  <div className="space-y-2">
                    {coaches.map((c) => {
                      const isOwner = c.id === ownerProfileId;
                      const isActive = coachId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCoachId(c.id)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all",
                            isActive
                              ? "border-accent bg-accent/5 text-text-primary"
                              : "border-border bg-bg-input text-text-secondary hover:border-accent/40"
                          )}
                        >
                          <span className="font-medium">{c.full_name ?? c.nickname ?? "—"}</span>
                          <div className="flex items-center gap-2">
                            {isOwner && (
                              <span className="text-[10px] text-text-tertiary border border-border rounded-full px-2 py-0.5">
                                Owner
                              </span>
                            )}
                            {isActive && (
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-accent">
                                <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <PrimaryButton loading={pending} onClick={handleBulkPublish}>
                    Publicar {selected.size} {selected.size === 1 ? "aula" : "aulas"}
                  </PrimaryButton>
                  <PrimaryButton variant="secondary" onClick={() => setBulkDrawer(false)}>
                    Cancelar
                  </PrimaryButton>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
