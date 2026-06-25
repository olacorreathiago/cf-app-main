"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { classTemplateSchema, type ClassTemplateInput } from "@/schemas/class-template";
import { createTemplatesForDays, updateTemplate } from "@/lib/box/schedule-actions";
import { PrimaryButton, FieldInput } from "@/components/shared";
import { cn } from "@/lib/utils";
import type { ClassTemplate } from "@/types";

const WEEKDAYS = [
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

// Form shape — weekday is validated per-row in the action, not here
type FormValues = Omit<ClassTemplateInput, "weekday"> & { weekday: number };

interface Props {
  open: boolean;
  onClose: () => void;
  boxId: string;
  modalities: string[];
  template?: ClassTemplate;
}

export function TemplateDrawer({ open, onClose, boxId, modalities, template }: Props) {
  const isEditing = Boolean(template);
  const [pending, startTransition] = useTransition();

  // Multi-select weekdays (only used on create)
  const [selectedDays, setSelectedDays] = useState<number[]>(
    template ? [template.weekday] : [1]
  );
  const [daysError, setDaysError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(classTemplateSchema),
    defaultValues: {
      name: template?.name ?? "",
      weekday: template?.weekday ?? 1,
      start_time: template?.start_time?.slice(0, 5) ?? "07:00",
      duration_minutes: template?.duration_minutes ?? 60,
      capacity: template?.capacity ?? 20,
      active: template?.active ?? true,
    },
  });

  const selectedName = watch("name");

  useEffect(() => {
    if (open) {
      const days = template ? [template.weekday] : [1];
      setSelectedDays(days);
      setDaysError(null);
      reset({
        name: template?.name ?? "",
        weekday: days[0] ?? 1,
        start_time: template?.start_time?.slice(0, 5) ?? "07:00",
        duration_minutes: template?.duration_minutes ?? 60,
        capacity: template?.capacity ?? 20,
        active: template?.active ?? true,
      });
    }
  }, [open, template, reset]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function toggleDay(day: number) {
    if (isEditing) {
      // Single select when editing
      setSelectedDays([day]);
      setValue("weekday", day, { shouldValidate: true });
    } else {
      setSelectedDays((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
      );
      setDaysError(null);
    }
  }

  function onSubmit(data: FormValues) {
    if (!isEditing && selectedDays.length === 0) {
      setDaysError("Selecciona pelo menos um dia");
      return;
    }

    startTransition(async () => {
      if (isEditing) {
        const result = await updateTemplate(template!.id, boxId, {
          ...data,
          weekday: selectedDays[0] ?? template!.weekday,
        });
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Template actualizado");
          onClose();
        }
      } else {
        const result = await createTemplatesForDays(boxId, selectedDays, data);
        if (result.error) {
          toast.error(result.error);
        } else {
          const label =
            result.created === 1
              ? "1 template criado"
              : `${result.created} templates criados`;
          toast.success(label);
          onClose();
        }
      }
    });
  }

  const hasModalities = modalities.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
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
              "lg:rounded-none lg:rounded-l-3xl lg:border-l lg:border-t-0 lg:border-border",
              "lg:pb-10 lg:pt-8 lg:overflow-y-auto"
            )}
          >
            {/* Mobile drag handle */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border lg:hidden" />

            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="label-caps text-text-tertiary mb-1">
                  {isEditing ? "Editar template" : "Novo template"}
                </p>
                <h2 className="font-display text-2xl leading-tight text-text-primary">
                  {isEditing ? (template?.name ?? "Template") : "Criar aula recorrente"}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {isEditing
                    ? "Altera as definições deste slot semanal."
                    : "Podes seleccionar vários dias de uma vez."}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary transition-colors hover:text-text-primary"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Modalidade */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-text-secondary">Modalidade</p>

                {hasModalities ? (
                  <div className="flex flex-wrap gap-2">
                    {modalities.map((m) => {
                      const active = selectedName === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setValue("name", m, { shouldValidate: true })}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150",
                            active
                              ? "border-accent bg-accent text-accent-fg shadow-sm"
                              : "border-border bg-bg-input text-text-secondary hover:border-accent/40 hover:text-text-primary"
                          )}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <FieldInput
                    {...register("name")}
                    placeholder="ex: CrossFit, Open Gym, Weightlifting"
                    hint="Define as modalidades nas Definições da box para escolher por tag"
                    error={errors.name?.message}
                  />
                )}

                {hasModalities && errors.name && (
                  <p className="text-sm text-error flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7 4.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="7" cy="9.5" r="0.75" fill="currentColor" />
                    </svg>
                    Selecciona uma modalidade
                  </p>
                )}

                {hasModalities && (
                  <p className="text-xs text-text-tertiary">
                    Não encontras a modalidade?{" "}
                    <button
                      type="button"
                      className="underline hover:text-text-secondary transition-colors"
                      onClick={() => {
                        const custom = window.prompt("Nome da modalidade:");
                        if (custom?.trim()) setValue("name", custom.trim(), { shouldValidate: true });
                      }}
                    >
                      Adicionar outra
                    </button>
                  </p>
                )}
              </div>

              {/* Dias da semana */}
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-text-secondary">
                    {isEditing ? "Dia da semana" : "Dias da semana"}
                  </p>
                  {!isEditing && (
                    <button
                      type="button"
                      className="text-xs text-text-tertiary hover:text-text-secondary underline transition-colors"
                      onClick={() => {
                        // Toggle all weekdays (Mon–Fri) or clear
                        const weekdays = [1, 2, 3, 4, 5];
                        const allSelected = weekdays.every((d) => selectedDays.includes(d));
                        setSelectedDays(allSelected ? [] : weekdays);
                        setDaysError(null);
                      }}
                    >
                      {[1, 2, 3, 4, 5].every((d) => selectedDays.includes(d))
                        ? "Limpar dias úteis"
                        : "Seg → Sex"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {WEEKDAYS.map((d) => {
                    const active = selectedDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={cn(
                          "rounded-xl border py-2.5 text-xs font-medium transition-all duration-150 select-none",
                          active
                            ? "border-accent bg-accent text-accent-fg shadow-sm"
                            : "border-border bg-bg-input text-text-secondary hover:border-accent/40 hover:text-text-primary"
                        )}
                      >
                        {d.label.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>

                {!isEditing && selectedDays.length > 0 && (
                  <p className="text-xs text-text-tertiary">
                    {selectedDays.length === 1
                      ? "1 dia seleccionado — cria 1 template"
                      : `${selectedDays.length} dias — cria ${selectedDays.length} templates`}
                  </p>
                )}

                {daysError && (
                  <p className="text-sm text-error flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7 4.5V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="7" cy="9.5" r="0.75" fill="currentColor" />
                    </svg>
                    {daysError}
                  </p>
                )}
              </div>

              {/* Hora + Duração */}
              <div className="grid grid-cols-2 gap-3">
                <FieldInput
                  label="Hora de início"
                  type="time"
                  {...register("start_time")}
                  error={errors.start_time?.message}
                />
                <FieldInput
                  label="Duração (min)"
                  type="number"
                  min={15}
                  max={300}
                  {...register("duration_minutes", { valueAsNumber: true })}
                  error={errors.duration_minutes?.message}
                />
              </div>

              {/* Capacidade */}
              <FieldInput
                label="Capacidade"
                type="number"
                min={1}
                max={500}
                {...register("capacity", { valueAsNumber: true })}
                hint="Número máximo de atletas por aula"
                error={errors.capacity?.message}
              />

              {/* Hidden fields */}
              {hasModalities && <input type="hidden" {...register("name")} />}
              <input type="hidden" {...register("weekday", { valueAsNumber: true })} />

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <PrimaryButton type="submit" loading={pending}>
                  {pending
                    ? "A guardar…"
                    : isEditing
                    ? "Guardar alterações"
                    : selectedDays.length > 1
                    ? `Criar ${selectedDays.length} templates`
                    : "Criar template"}
                </PrimaryButton>
                <PrimaryButton type="button" variant="secondary" onClick={onClose}>
                  Cancelar
                </PrimaryButton>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
