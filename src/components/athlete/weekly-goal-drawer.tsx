"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DrawerShell } from "@/components/shared/drawer-shell";
import { setWeeklyGoal, resetWeeklyGoal } from "@/lib/athlete/consistency-actions";

interface Props {
  open: boolean;
  onClose: () => void;
  boxId: string;
  currentTarget: number | null;
  systemTarget: number | null;
  isCustomTarget: boolean;
}

export function WeeklyGoalDrawer({ open, onClose, boxId, currentTarget, systemTarget, isCustomTarget }: Props) {
  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      widthClassName="lg:w-[400px]"
      header={
        <div>
          <p className="label-caps text-text-tertiary">Meta semanal</p>
          <h2 className="font-display mt-1 text-2xl uppercase text-text-primary">Ajustar meta</h2>
        </div>
      }
    >
      {open && (
        <DrawerBody
          boxId={boxId}
          currentTarget={currentTarget}
          systemTarget={systemTarget}
          isCustomTarget={isCustomTarget}
          onClose={onClose}
        />
      )}
    </DrawerShell>
  );
}

function DrawerBody({
  boxId,
  currentTarget,
  systemTarget,
  isCustomTarget,
  onClose,
}: Omit<Props, "open">) {
  const [value, setValue] = useState(currentTarget ?? systemTarget ?? 3);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await setWeeklyGoal(boxId, value);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Meta atualizada");
      onClose();
    });
  }

  function handleReset() {
    startTransition(async () => {
      const res = await resetWeeklyGoal(boxId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Meta automática reposta");
      onClose();
    });
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setValue((v) => Math.max(1, v - 1))}
            disabled={isPending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-lg font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
            aria-label="Diminuir meta"
          >
            −
          </button>
          <span className="font-display w-16 text-center text-5xl text-text-primary">{value}</span>
          <button
            type="button"
            onClick={() => setValue((v) => Math.min(14, v + 1))}
            disabled={isPending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-lg font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
            aria-label="Aumentar meta"
          >
            +
          </button>
        </div>
        <p className="text-xs text-text-tertiary">treinos por semana</p>
      </div>

      {systemTarget != null && (
        <p className="text-center text-xs text-text-tertiary">
          Proposta do sistema: <span className="font-medium text-text-secondary">{systemTarget}</span>
        </p>
      )}

      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-fg transition-opacity disabled:opacity-60"
        >
          Guardar
        </button>
        {isCustomTarget && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="w-full rounded-xl border border-border py-3 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-60"
          >
            Voltar à proposta automática
          </button>
        )}
      </div>
    </div>
  );
}
