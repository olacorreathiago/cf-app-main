"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { boxOperationalSchema, type BoxOperationalInput } from "@/schemas/box-settings";
import { updateBoxOperational } from "@/lib/box/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BoxFull } from "@/types";

interface Props {
  box: BoxFull;
  canEdit: boolean;
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-5 border-b border-border last:border-0">
      <div className="sm:max-w-xs">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-sm text-text-tertiary mt-0.5">{description}</p>
      </div>
      <div className="sm:w-36 shrink-0">{children}</div>
    </div>
  );
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
      max_waitlist: box.settings?.max_waitlist ?? 5,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
      <SettingRow
        label="Janela de cancelamento"
        description="Horas mínimas de antecedência para cancelar uma reserva"
      >
        <div className="space-y-1">
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={168}
              {...register("cancellation_window_hours", { valueAsNumber: true })}
              disabled={!canEdit}
              className="pr-14"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">horas</span>
          </div>
          {errors.cancellation_window_hours && (
            <p className="text-xs text-red-500">{errors.cancellation_window_hours.message}</p>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label="Antecedência de reservas"
        description="Com quantos dias de antecedência as reservas ficam disponíveis"
      >
        <div className="space-y-1">
          <div className="relative">
            <Input
              type="number"
              min={1}
              max={60}
              {...register("booking_advance_days", { valueAsNumber: true })}
              disabled={!canEdit}
              className="pr-10"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">dias</span>
          </div>
          {errors.booking_advance_days && (
            <p className="text-xs text-red-500">{errors.booking_advance_days.message}</p>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label="Capacidade padrão"
        description="Número de vagas ao criar novas aulas"
      >
        <div className="space-y-1">
          <div className="relative">
            <Input
              type="number"
              min={1}
              max={500}
              {...register("default_capacity", { valueAsNumber: true })}
              disabled={!canEdit}
              className="pr-16"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">atletas</span>
          </div>
          {errors.default_capacity && (
            <p className="text-xs text-red-500">{errors.default_capacity.message}</p>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label="Lista de espera"
        description="Máximo de atletas em lista de espera por aula. Define 0 para desativar."
      >
        <div className="space-y-1">
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={50}
              {...register("max_waitlist", { valueAsNumber: true })}
              disabled={!canEdit}
              className="pr-16"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">atletas</span>
          </div>
          {errors.max_waitlist && (
            <p className="text-xs text-red-500">{errors.max_waitlist.message}</p>
          )}
        </div>
      </SettingRow>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-5 border-b border-border">
        <div className="sm:max-w-xs">
          <p className="text-sm font-medium text-text-primary">Aceitar drop-ins</p>
          <p className="text-sm text-text-tertiary mt-0.5">Permite que atletas externos reservem aulas avulso</p>
        </div>
        <div className="sm:w-36 shrink-0 flex items-center gap-2">
          <input
            id="drop_in_enabled"
            type="checkbox"
            {...register("drop_in_enabled")}
            disabled={!canEdit}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          <label htmlFor="drop_in_enabled" className="text-sm text-text-secondary select-none cursor-pointer">
            Ativado
          </label>
        </div>
      </div>

      {dropInEnabled && (
        <SettingRow
          label="Preço do drop-in"
          description="Valor cobrado por aula avulso"
        >
          <div className="space-y-1">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">€</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                {...register("drop_in_price", { valueAsNumber: true })}
                disabled={!canEdit}
                className="pl-6"
              />
            </div>
            {errors.drop_in_price && (
              <p className="text-xs text-red-500">{errors.drop_in_price.message}</p>
            )}
          </div>
        </SettingRow>
      )}

      {canEdit && (
        <div className="flex justify-end pt-6">
          <Button type="submit" disabled={pending}>
            {pending ? "A guardar…" : "Guardar configurações"}
          </Button>
        </div>
      )}
    </form>
  );
}
