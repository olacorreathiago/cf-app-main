"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { wodSchema, WOD_TYPES, WOD_CATEGORIES, DEFAULT_SCORE_TYPE, SCORE_TYPES, type WodInput, type WodCategory, type Movement, type ScoreType } from "@/schemas/wod";
import { createWod, updateWod, publishWod } from "@/lib/box/wod-actions";
import { PrimaryButton, FieldInput } from "@/components/shared";
import type { Wod, BenchmarkWod } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<WodCategory, string> = {
  girls:        "The Girls",
  heroes:       "Heroes",
  notables:     "Notables",
  games:        "Games",
  weightlifting:"Weightlifting",
  endurance:    "Endurance",
  gymnastics:   "Gymnastics",
  original:     "Original",
};

const TYPE_COLORS: Record<string, string> = {
  AMRAP:      "border-green-300 bg-green-50 text-green-800",
  "For Time": "border-blue-300 bg-blue-50 text-blue-800",
  "For Load": "border-amber-300 bg-amber-50 text-amber-800",
  EMOM:       "border-purple-300 bg-purple-50 text-purple-800",
  Tabata:     "border-teal-300 bg-teal-50 text-teal-800",
  Custom:     "border-border bg-bg-input text-text-secondary",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCORE_TYPE_LABELS: Record<ScoreType, string> = {
  time:           "Tempo",
  reps:           "Reps",
  weight:         "Carga (kg)",
  "rounds+reps":  "Rondas + Reps",
  distance:       "Distância",
  "round-best":   "Melhor ronda (tempo)",
  "round-total":  "Total de rondas (tempo)",
  "round-worst":  "Pior ronda (tempo)",
  "round-reps":   "Total de reps por ronda",
};

function defaultValues(wod?: Wod): WodInput {
  const type = wod?.type ?? "Custom";
  return {
    title:               wod?.title ?? "",
    type,
    category:            wod?.category ?? "original",
    score_type:          wod?.score_type ?? DEFAULT_SCORE_TYPE[type],
    benchmark_slug:      wod?.benchmark_slug ?? null,
    is_benchmark:        wod?.is_benchmark ?? false,
    description:         wod?.description ?? null,
    time_cap_minutes:    wod?.time_cap_minutes ?? null,
    movements:           (wod?.movements as Movement[]) ?? [],
    scaling_notes:       wod?.scaling_notes ?? null,
    scheduled_for:       wod?.scheduled_for ?? null,
    result_sets:         wod?.result_sets ?? null,
    result_reps_per_set: wod?.result_reps_per_set ?? null,
  };
}

// ---------------------------------------------------------------------------
// Sub-component: Benchmark picker
// ---------------------------------------------------------------------------

interface BenchmarkPickerProps {
  benchmarks: BenchmarkWod[];
  onSelect: (b: BenchmarkWod) => void;
}

function BenchmarkPicker({ benchmarks, onSelect }: BenchmarkPickerProps) {
  const [activeCategory, setActiveCategory] = useState<WodCategory>("girls");

  const SELECTABLE = WOD_CATEGORIES.filter((c) => c !== "original");
  const filtered = benchmarks.filter((b) => b.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {SELECTABLE.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
              activeCategory === cat
                ? "border-accent bg-accent text-accent-fg shadow-sm"
                : "border-border bg-bg-input text-text-secondary hover:border-accent/40 hover:text-text-primary"
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Benchmark list */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {filtered.map((b) => (
          <button
            key={b.slug}
            type="button"
            onClick={() => onSelect(b)}
            className="w-full text-left rounded-xl border border-border bg-bg-input hover:border-accent/40 hover:bg-bg-card px-3 py-2.5 transition-all group"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-text-primary">{b.name}</p>
                <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{b.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full border",
                  TYPE_COLORS[b.type] ?? TYPE_COLORS.Custom
                )}>
                  {b.type}
                </span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                  <path d="M5 2l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-text-tertiary text-center py-4">
            Sem benchmarks nesta categoria.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main drawer
// ---------------------------------------------------------------------------

type DrawerStep = "origin" | "form";

interface Props {
  open: boolean;
  onClose: () => void;
  boxId: string;
  wod?: Wod;
  benchmarks: BenchmarkWod[];
}

export function WodDrawer({ open, onClose, boxId, wod, benchmarks }: Props) {
  const isEditing = Boolean(wod);
  const [step, setStep] = useState<DrawerStep>(isEditing ? "form" : "origin");
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<WodInput>({
    resolver: zodResolver(wodSchema),
    defaultValues: defaultValues(wod),
  });

  const { fields: movements, append, remove } = useFieldArray({
    control,
    name: "movements",
  });

  const selectedType = watch("type");
  const selectedScoreType = watch("score_type");
  const selectedBenchmarkSlug = watch("benchmark_slug");
  const isBenchmark = watch("is_benchmark");

  useEffect(() => {
    if (open) {
      setStep(isEditing ? "form" : "origin");
      reset(defaultValues(wod));
    }
  }, [open, isEditing, wod, reset]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleSelectBenchmark(b: BenchmarkWod) {
    reset({
      title:               b.name,
      type:                b.type,
      category:            b.category,
      score_type:          DEFAULT_SCORE_TYPE[b.type],
      benchmark_slug:      b.slug,
      is_benchmark:        true,
      description:         b.description ?? null,
      time_cap_minutes:    b.time_cap_minutes ?? null,
      movements:           (b.movements as Movement[]) ?? [],
      scaling_notes:       null,
      scheduled_for:       null,
      result_sets:         null,
      result_reps_per_set: null,
    });
    setStep("form");
  }

  function handleSelectOriginal() {
    reset(defaultValues());
    setValue("category", "original");
    setStep("form");
  }

  function submitForm(data: WodInput, shouldPublish: boolean) {
    startTransition(async () => {
      if (isEditing) {
        const result = await updateWod(wod!.id, boxId, data);
        if (result.error) { toast.error(result.error); return; }
        if (shouldPublish && !wod!.published_at) {
          await publishWod(wod!.id, boxId);
        }
        toast.success(shouldPublish ? "WOD publicado" : "Alterações guardadas");
      } else {
        const result = await createWod(boxId, data);
        if (result.error) { toast.error(result.error); return; }
        if (shouldPublish && result.id) {
          await publishWod(result.id, boxId);
        }
        toast.success(shouldPublish ? "WOD criado e publicado" : "Rascunho guardado");
      }
      onClose();
    });
  }

  const benchmarkName = selectedBenchmarkSlug
    ? benchmarks.find((b) => b.slug === selectedBenchmarkSlug)?.name
    : null;

  return (
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
            onClick={onClose}
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
              "lg:bottom-0 lg:left-auto lg:right-0 lg:top-0 lg:w-[480px]",
              "lg:rounded-none lg:rounded-l-3xl lg:border-l lg:border-t-0 lg:border-border",
              "lg:pb-10 lg:pt-8 lg:overflow-y-auto"
            )}
          >
            {/* Mobile drag handle */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border lg:hidden" />

            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                {step === "form" && !isEditing && (
                  <button
                    type="button"
                    onClick={() => setStep("origin")}
                    className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary mb-2 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Voltar
                  </button>
                )}
                <p className="label-caps text-text-tertiary mb-1">
                  {isEditing ? "Editar WOD" : step === "origin" ? "Novo WOD" : "Configurar WOD"}
                </p>
                <h2 className="font-display text-2xl leading-tight text-text-primary">
                  {isEditing
                    ? wod?.title
                    : step === "origin"
                    ? "De onde vem este WOD?"
                    : benchmarkName ?? "WOD original"}
                </h2>
                {step === "form" && benchmarkName && (
                  <p className="mt-1 text-xs text-text-tertiary">
                    Benchmark pré-preenchido · podes editar à vontade
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary hover:text-text-primary transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* ── STEP: ORIGIN ── */}
            {step === "origin" && (
              <div className="space-y-3">
                {/* Benchmark option */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {/* stay on origin but show picker */}}
                    className="hidden"
                  />
                  <p className="text-sm font-medium text-text-secondary">
                    Selecciona um benchmark clássico
                  </p>
                  <BenchmarkPicker benchmarks={benchmarks} onSelect={handleSelectBenchmark} />
                </div>

                <div className="relative flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-text-tertiary">ou</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Original option */}
                <button
                  type="button"
                  onClick={handleSelectOriginal}
                  className="w-full flex items-center justify-between rounded-2xl border border-border bg-bg-card hover:border-accent/40 hover:bg-bg-input px-4 py-4 transition-all group"
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-text-primary">WOD original</p>
                    <p className="text-xs text-text-tertiary mt-0.5">Criar de raiz com o teu próprio WOD</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-text-tertiary group-hover:text-text-primary transition-colors">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}

            {/* ── STEP: FORM ── */}
            {step === "form" && (
              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>

                {/* Título */}
                <FieldInput
                  label="Título"
                  placeholder="ex: Fran, WOD do dia, Strength A"
                  {...register("title")}
                  error={errors.title?.message}
                />

                {/* Tipo */}
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-text-secondary">Tipo</p>
                  <div className="flex flex-wrap gap-2">
                    {WOD_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setValue("type", t, { shouldValidate: true });
                          setValue("score_type", DEFAULT_SCORE_TYPE[t]);
                        }}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all",
                          selectedType === t
                            ? TYPE_COLORS[t]
                            : "border-border bg-bg-input text-text-secondary hover:border-accent/40 hover:text-text-primary"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Score type — shown for Custom, editable for all */}
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-text-secondary">Como se regista o resultado</p>
                  <div className="flex flex-wrap gap-2">
                    {SCORE_TYPES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setValue("score_type", st)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                          selectedScoreType === st
                            ? "border-accent bg-accent text-accent-fg"
                            : "border-border bg-bg-input text-text-secondary hover:border-accent/40 hover:text-text-primary"
                        )}
                      >
                        {SCORE_TYPE_LABELS[st]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* For Load — sets + reps config */}
                {selectedType === "For Load" && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <FieldInput
                        label="Nº de sets"
                        type="number"
                        min={1}
                        max={20}
                        placeholder="ex: 5"
                        {...register("result_sets", {
                          setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                        })}
                        error={errors.result_sets?.message}
                      />
                    </div>
                    <div className="flex-1">
                      <FieldInput
                        label="Reps por set"
                        type="number"
                        min={1}
                        max={100}
                        placeholder="ex: 5"
                        hint="Opcional"
                        {...register("result_reps_per_set", {
                          setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                        })}
                        error={errors.result_reps_per_set?.message}
                      />
                    </div>
                  </div>
                )}

                {/* Round-based score types — nº de rondas definido pelo manager */}
                {(selectedScoreType === "round-best" || selectedScoreType === "round-total" || selectedScoreType === "round-worst" || selectedScoreType === "round-reps") && (
                  <div className="w-1/2 pr-1.5">
                    <FieldInput
                      label="Nº de rondas"
                      type="number"
                      min={1}
                      max={60}
                      placeholder="ex: 5"
                      {...register("result_sets", {
                        setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                      })}
                      error={errors.result_sets?.message}
                    />
                  </div>
                )}

                {/* É um benchmark? */}
                {selectedBenchmarkSlug ? (
                  <div className="w-full flex items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-500/8 px-4 py-3.5">
                    <div className="text-left">
                      <p className="text-sm font-semibold text-amber-500">Benchmark global</p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        Este WOD é um benchmark fixo — aparece automaticamente na página de PRs de todos os atletas.
                      </p>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 text-amber-500">
                      <path d="M9 1l2.06 5.26L17 7.27l-4 3.9.94 5.5L9 14.1l-4.94 2.57.94-5.5-4-3.9 5.94-.01L9 1z" fill="currentColor" />
                    </svg>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setValue("is_benchmark", !isBenchmark)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-2xl border px-4 py-3.5 transition-all",
                      isBenchmark
                        ? "border-amber-400/50 bg-amber-500/10"
                        : "border-border bg-bg-input hover:border-accent/30"
                    )}
                  >
                    <div className="text-left">
                      <p className={cn("text-sm font-semibold", isBenchmark ? "text-amber-500" : "text-text-primary")}>
                        É um benchmark?
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        Ativa para registar PRs dos atletas neste WOD
                      </p>
                    </div>
                    <div className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                      isBenchmark ? "bg-amber-500" : "bg-border"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                        isBenchmark ? "translate-x-5" : "translate-x-0.5"
                      )} />
                    </div>
                  </button>
                )}

                {/* Descrição */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary">
                    Descrição
                  </label>
                  <textarea
                    {...register("description")}
                    rows={5}
                    placeholder="21-15-9&#10;Thrusters (43/30 kg)&#10;Pull-ups"
                    className={cn(
                      "w-full rounded-xl border border-border bg-bg-input px-4 py-3",
                      "text-sm text-text-primary placeholder:text-text-tertiary",
                      "resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50",
                      "transition-colors"
                    )}
                  />
                </div>

                {/* Time cap */}
                <FieldInput
                  label="Time cap (minutos)"
                  type="number"
                  min={1}
                  max={300}
                  placeholder="Opcional"
                  hint="Deixa em branco se não houver limite de tempo"
                  {...register("time_cap_minutes", {
                    setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                  })}
                  error={errors.time_cap_minutes?.message}
                />

                {/* Movimentos */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Movimentos</p>

                  {movements.length > 0 && (
                    <div className="space-y-2">
                      {movements.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <FieldInput
                              placeholder="Nome do movimento"
                              {...register(`movements.${index}.name`)}
                              error={errors.movements?.[index]?.name?.message}
                            />
                          </div>
                          <div className="w-32 shrink-0">
                            <FieldInput
                              placeholder="Carga (opcional)"
                              {...register(`movements.${index}.rx_weight`)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            aria-label="Remover movimento"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-text-tertiary hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => append({ name: "", rx_weight: "" })}
                    className="flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary border border-dashed border-border hover:border-accent/40 rounded-xl px-3 py-2 transition-all w-full justify-center"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Adicionar movimento
                  </button>
                </div>

                {/* Scaling notes */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary">
                    Notas de scaling
                  </label>
                  <textarea
                    {...register("scaling_notes")}
                    rows={3}
                    placeholder="Versão scaled ou modificações sugeridas…"
                    className={cn(
                      "w-full rounded-xl border border-border bg-bg-input px-4 py-3",
                      "text-sm text-text-primary placeholder:text-text-tertiary",
                      "resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50",
                      "transition-colors"
                    )}
                  />
                </div>

                {/* Data programada */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary">
                    Data programada
                  </label>
                  <input
                    type="date"
                    {...register("scheduled_for", {
                      setValueAs: (v) => (v === "" || v == null ? null : v),
                    })}
                    className={cn(
                      "h-12 w-full rounded-xl border border-border bg-bg-input px-4",
                      "text-sm text-text-primary",
                      "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50",
                      "transition-colors"
                    )}
                  />
                  <p className="text-xs text-text-tertiary">
                    Usado para filtrar e atribuir na gestão de aulas
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <PrimaryButton
                    type="button"
                    loading={pending}
                    onClick={handleSubmit((data) => submitForm(data, true))}
                  >
                    {isEditing && wod?.published_at
                      ? "Guardar alterações"
                      : "Publicar WOD"}
                  </PrimaryButton>
                  <PrimaryButton
                    type="button"
                    variant="secondary"
                    loading={pending}
                    onClick={handleSubmit((data) => submitForm(data, false))}
                  >
                    Guardar como rascunho
                  </PrimaryButton>
                  <PrimaryButton type="button" variant="secondary" onClick={onClose}>
                    Cancelar
                  </PrimaryButton>
                </div>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
