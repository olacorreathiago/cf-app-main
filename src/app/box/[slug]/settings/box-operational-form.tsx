"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { boxOperationalSchema, type BoxOperationalInput } from "@/schemas/box-settings";
import { updateBoxOperational } from "@/lib/box/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BoxFull } from "@/types";

interface Props {
  box: BoxFull;
  canEdit: boolean;
}

export function BoxOperationalForm({ box, canEdit }: Props) {
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BoxOperationalInput>({
    resolver: zodResolver(boxOperationalSchema),
    defaultValues: {
      cancellation_window_hours: box.settings?.cancellation_window_hours ?? 2,
      booking_advance_days: box.settings?.booking_advance_days ?? 7,
      default_capacity: box.settings?.default_capacity ?? 20,
      drop_in_enabled: box.drop_in_enabled,
      drop_in_price: box.drop_in_price ?? undefined,
    },
  });

  const dropInEnabled = watch("drop_in_enabled");

  function onSubmit(data: BoxOperationalInput) {
    startTransition(async () => {
      const result = await updateBoxOperational(box.id, data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Configurações actualizadas");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cancellation_window_hours">Janela de cancelamento (horas)</Label>
          <Input
            id="cancellation_window_hours"
            type="number"
            min={0}
            max={168}
            {...register("cancellation_window_hours", { valueAsNumber: true })}
            disabled={!canEdit}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-text-tertiary">Atletas não podem cancelar com menos de X horas de antecedência</p>
          {errors.cancellation_window_hours && (
            <p className="mt-1 text-xs text-red-500">{errors.cancellation_window_hours.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="booking_advance_days">Antecedência de reservas (dias)</Label>
          <Input
            id="booking_advance_days"
            type="number"
            min={1}
            max={60}
            {...register("booking_advance_days", { valueAsNumber: true })}
            disabled={!canEdit}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-text-tertiary">Quantos dias antes as reservas ficam disponíveis</p>
          {errors.booking_advance_days && (
            <p className="mt-1 text-xs text-red-500">{errors.booking_advance_days.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="default_capacity">Capacidade padrão</Label>
          <Input
            id="default_capacity"
            type="number"
            min={1}
            max={500}
            {...register("default_capacity", { valueAsNumber: true })}
            disabled={!canEdit}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-text-tertiary">Capacidade padrão ao criar novas aulas</p>
          {errors.default_capacity && (
            <p className="mt-1 text-xs text-red-500">{errors.default_capacity.message}</p>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <div className="flex items-center gap-3">
          <input
            id="drop_in_enabled"
            type="checkbox"
            {...register("drop_in_enabled")}
            disabled={!canEdit}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          <div>
            <Label htmlFor="drop_in_enabled">Aceitar drop-ins</Label>
            <p className="text-xs text-text-tertiary">Permite que atletas externos reservem aulas avulso</p>
          </div>
        </div>

        {dropInEnabled && (
          <div className="sm:max-w-[180px]">
            <Label htmlFor="drop_in_price">Preço do drop-in (€)</Label>
            <Input
              id="drop_in_price"
              type="number"
              min={0}
              step="0.01"
              {...register("drop_in_price", { valueAsNumber: true })}
              disabled={!canEdit}
              className="mt-1"
            />
            {errors.drop_in_price && (
              <p className="mt-1 text-xs text-red-500">{errors.drop_in_price.message}</p>
            )}
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "A guardar…" : "Guardar configurações"}
          </Button>
        </div>
      )}
    </form>
  );
}
