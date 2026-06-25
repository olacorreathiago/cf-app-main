"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateBoxModalities } from "@/lib/box/settings-actions";
import { PrimaryButton } from "@/components/shared";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "CrossFit",
  "Open Gym",
  "Weightlifting",
  "Gymnastics",
  "Endurance",
  "Hyrox",
  "Kids",
  "Teens",
  "Masters",
  "Mobility",
  "Bootcamp",
];

interface Props {
  boxId: string;
  initial: string[];
  canEdit: boolean;
}

export function ModalitiesForm({ boxId, initial, canEdit }: Props) {
  const [modalities, setModalities] = useState<string[]>(initial);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();

  function add(value: string) {
    const trimmed = value.trim();
    if (!trimmed || modalities.includes(trimmed) || modalities.length >= 30) return;
    setModalities((prev) => [...prev, trimmed]);
    setInput("");
  }

  function remove(name: string) {
    setModalities((prev) => prev.filter((m) => m !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    }
    if (e.key === "Backspace" && !input && modalities.length > 0) {
      setModalities((prev) => prev.slice(0, -1));
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateBoxModalities(boxId, modalities);
      if (result.error) toast.error(result.error);
      else toast.success("Modalidades actualizadas");
    });
  }

  const suggestions = SUGGESTIONS.filter((s) => !modalities.includes(s));

  return (
    <div className="space-y-4">
      {/* Tag pills */}
      <div
        className={cn(
          "min-h-[52px] flex flex-wrap gap-2 rounded-xl border border-border bg-bg-input px-3 py-2.5",
          canEdit && "focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent"
        )}
      >
        {modalities.map((m) => (
          <span
            key={m}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/25 px-3 py-1 text-sm font-medium text-accent"
          >
            {m}
            {canEdit && (
              <button
                type="button"
                onClick={() => remove(m)}
                aria-label={`Remover ${m}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-accent/60 hover:text-accent transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </span>
        ))}
        {canEdit && (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => add(input)}
            placeholder={modalities.length === 0 ? "Escreve e prime Enter…" : "Adicionar…"}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
          />
        )}
      </div>

      {/* Quick suggestions */}
      {canEdit && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-text-tertiary mr-1 self-center">Sugestões:</span>
          {suggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-border bg-bg-card px-2.5 py-0.5 text-xs text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <PrimaryButton
            size="sm"
            loading={pending}
            onClick={handleSave}
            className="w-auto rounded-full px-6"
          >
            {pending ? "A guardar…" : "Guardar modalidades"}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
