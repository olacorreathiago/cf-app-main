"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { specialClassSchema, type SpecialClassInput } from "@/schemas/class-instance";
import { createSpecialClass } from "@/lib/box/classes-actions";
import { PrimaryButton, FieldInput } from "@/components/shared";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Coach {
  id: string;
  full_name: string | null;
  nickname: string | null;
}

interface Props {
  boxId: string;
  coaches: Coach[];
  ownerProfileId: string | null;
}

export function SpecialClassButton({ boxId, coaches, ownerProfileId }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SpecialClassInput>({
    resolver: zodResolver(specialClassSchema),
    defaultValues: {
      name: "",
      date: format(new Date(), "yyyy-MM-dd"),
      start_time: "09:00",
      duration_minutes: 60,
      capacity: 20,
      coach_id: ownerProfileId ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: "",
        date: format(new Date(), "yyyy-MM-dd"),
        start_time: "09:00",
        duration_minutes: 60,
        capacity: 20,
        coach_id: ownerProfileId ?? "",
      });
    }
  }, [open, reset, ownerProfileId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const selectedCoachId = watch("coach_id");

  function onSubmit(data: SpecialClassInput) {
    startTransition(async () => {
      const result = await createSpecialClass(boxId, data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Aula especial criada");
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-border bg-bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors"
      >
        + Aula especial
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
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

              {/* Header */}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="label-caps text-text-tertiary mb-1">Aula especial</p>
                  <h2 className="font-display text-2xl leading-tight text-text-primary">
                    Nova aula especial
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Aula fora do horário habitual, sem template.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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
                <FieldInput
                  label="Modalidade"
                  {...register("name")}
                  placeholder="ex: Open Gym especial, Bootcamp, Workshop"
                  error={errors.name?.message}
                />

                {/* Data + Hora */}
                <div className="grid grid-cols-2 gap-3">
                  <FieldInput
                    label="Data"
                    type="date"
                    {...register("date")}
                    error={errors.date?.message}
                  />
                  <FieldInput
                    label="Hora"
                    type="time"
                    {...register("start_time")}
                    error={errors.start_time?.message}
                  />
                </div>

                {/* Duração + Capacidade */}
                <div className="grid grid-cols-2 gap-3">
                  <FieldInput
                    label="Duração (min)"
                    type="number"
                    min={15}
                    max={300}
                    {...register("duration_minutes", { valueAsNumber: true })}
                    error={errors.duration_minutes?.message}
                  />
                  <FieldInput
                    label="Capacidade"
                    type="number"
                    min={1}
                    max={500}
                    {...register("capacity", { valueAsNumber: true })}
                    error={errors.capacity?.message}
                  />
                </div>

                {/* Coach */}
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-text-secondary">Coach</p>
                  <div className="space-y-2">
                    {/* No coach option */}
                    <button
                      type="button"
                      onClick={() => setValue("coach_id", "")}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all duration-150",
                        !selectedCoachId
                          ? "border-accent bg-accent/5 text-text-primary"
                          : "border-border bg-bg-input text-text-tertiary hover:border-accent/40"
                      )}
                    >
                      <span>Sem coach definido</span>
                      {!selectedCoachId && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>

                    {coaches.map((c) => {
                      const isOwner = c.id === ownerProfileId;
                      const selected = selectedCoachId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setValue("coach_id", c.id)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all duration-150",
                            selected
                              ? "border-accent bg-accent/5 text-text-primary"
                              : "border-border bg-bg-input text-text-secondary hover:border-accent/40 hover:text-text-primary"
                          )}
                        >
                          <span className="font-medium">{c.full_name ?? c.nickname ?? "—"}</span>
                          <div className="flex items-center gap-2">
                            {isOwner && (
                              <span className="text-[10px] text-text-tertiary border border-border rounded-full px-2 py-0.5">
                                Owner
                              </span>
                            )}
                            {selected && (
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <input type="hidden" {...register("coach_id")} />
                </div>

                {/* Notas */}
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-text-secondary">Notas <span className="text-text-tertiary font-normal">(opcional)</span></p>
                  <textarea
                    {...register("notes")}
                    rows={2}
                    placeholder="Informações adicionais para os atletas…"
                    className="w-full rounded-xl border border-border bg-bg-input px-4 py-3.5 text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <PrimaryButton type="submit" loading={pending}>
                    Criar aula especial
                  </PrimaryButton>
                  <PrimaryButton type="button" variant="secondary" onClick={() => setOpen(false)}>
                    Cancelar
                  </PrimaryButton>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
