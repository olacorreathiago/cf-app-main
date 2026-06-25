"use client";

import { useState } from "react";
import { SlotCard, type ClassSlot } from "./slot-card";
import { WodPickerDrawer } from "./wod-picker-drawer";
import type { ClassTemplate, Wod } from "@/types";

interface Coach {
  id: string;
  full_name: string | null;
  nickname: string | null;
}

interface Props {
  modalityName: string;
  wodIds: string[];
  slots: ClassSlot[];
  templates: Pick<ClassTemplate, "id" | "name" | "start_time" | "duration_minutes" | "capacity">[];
  boxId: string;
  slug: string;
  date: string;
  coaches: Coach[];
  ownerProfileId: string | null;
  publishedWods: Wod[];
  selectMode?: boolean;
  selectedSlots?: Set<string>;
  onToggleSlot?: (startsAt: string) => void;
}

export function ModalityGroup({
  modalityName,
  wodIds,
  slots,
  templates,
  boxId,
  slug,
  date,
  coaches,
  ownerProfileId,
  publishedWods,
  selectMode,
  selectedSlots,
  onToggleSlot,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const assignedWods = wodIds
    .map((id) => publishedWods.find((w) => w.id === id))
    .filter((w): w is Wod => Boolean(w));

  return (
    <>
      <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        {/* Group header */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border bg-bg-base">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">{modalityName}</span>
            <span className="text-xs text-text-tertiary">
              · {slots.length} slot{slots.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* WOD badges */}
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {assignedWods.length > 0 ? (
              <>
                {assignedWods.map((wod) => (
                  <span
                    key={wod.id}
                    className="flex items-center gap-1 text-xs font-medium text-green-700 border border-green-200 bg-green-50 rounded-full px-2.5 py-1"
                  >
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5 4.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {wod.title}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex items-center justify-center h-6 w-6 rounded-full border border-border text-text-tertiary hover:border-accent/40 hover:text-text-primary transition-colors"
                  title="Editar WODs do dia"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1 9L7.5 2.5a1.5 1.5 0 0 1 2.12 2.12L3 11l-3 .5.5-3z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex items-center gap-1.5 text-xs text-text-tertiary border border-border rounded-full px-2.5 py-1 hover:border-accent/40 hover:text-text-primary transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                WOD do dia
              </button>
            )}
          </div>
        </div>

        {/* Slots */}
        <div className="p-3 space-y-1.5">
          {slots.map((slot) => (
            <SlotCard
              key={`${slot.templateId}|${slot.startsAt}`}
              slot={slot}
              boxId={boxId}
              slug={slug}
              coaches={coaches}
              ownerProfileId={ownerProfileId}
              selectMode={selectMode}
              isSelected={selectedSlots?.has(slot.startsAt)}
              onToggleSelect={() => onToggleSlot?.(slot.startsAt)}
            />
          ))}
        </div>
      </div>

      <WodPickerDrawer
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        boxId={boxId}
        date={date}
        modalityName={modalityName}
        templates={templates}
        wods={publishedWods}
        currentWodIds={wodIds}
      />
    </>
  );
}
