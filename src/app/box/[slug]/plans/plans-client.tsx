"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createPlan,
  updatePlan,
  togglePlanActive,
  deletePlan,
  type Plan,
} from "@/lib/box/plan-actions";

interface Props {
  plans: Plan[];
  boxId: string;
  slug: string;
}

const intervalLabel: Record<string, string> = {
  monthly: "Mensal",
  annual: "Anual",
};

export function PlansClient({ plans: initial, boxId, slug }: Props) {
  const [plans, setPlans] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(plan: Plan) {
    setPlans((prev) => [plan, ...prev]);
    setShowForm(false);
    toast.success("Plano criado.");
  }

  function handleUpdate(updated: Plan) {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? { ...updated, _member_count: p._member_count } : p)));
    setEditingPlan(null);
    toast.success("Plano atualizado.");
  }

  function handleToggleActive(plan: Plan) {
    const newActive = !plan.active;
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, active: newActive } : p)));
    startTransition(async () => {
      const res = await togglePlanActive(plan.id, boxId, newActive, slug);
      if (res.error) {
        toast.error(res.error);
        setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, active: !newActive } : p)));
      } else {
        toast.success(newActive ? "Plano ativado." : "Plano desativado.");
      }
    });
  }

  function handleDelete(planId: string) {
    startTransition(async () => {
      const res = await deletePlan(planId, boxId, slug);
      if (res.error) {
        toast.error(res.error);
      } else {
        setPlans((prev) => prev.filter((p) => p.id !== planId));
        toast.success("Plano eliminado.");
      }
    });
  }

  const activePlans = plans.filter((p) => p.active);
  const inactivePlans = plans.filter((p) => !p.active);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(true); setEditingPlan(null); }}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Novo plano
        </button>
      </div>

      {plans.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card px-6 py-16 text-center">
          <p className="text-sm text-text-tertiary mb-4">Ainda não tens planos configurados.</p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Criar primeiro plano
          </button>
        </div>
      ) : (
        <>
          {activePlans.length > 0 && (
            <div className="space-y-3">
              {activePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isPending={isPending}
                  onEdit={() => { setEditingPlan(plan); setShowForm(true); }}
                  onToggle={() => handleToggleActive(plan)}
                  onDelete={() => handleDelete(plan.id)}
                />
              ))}
            </div>
          )}

          {inactivePlans.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60 px-1">
                Inativos
              </p>
              {inactivePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isPending={isPending}
                  onEdit={() => { setEditingPlan(plan); setShowForm(true); }}
                  onToggle={() => handleToggleActive(plan)}
                  onDelete={() => handleDelete(plan.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showForm && (
          <PlanFormModal
            boxId={boxId}
            slug={slug}
            plan={editingPlan}
            onClose={() => { setShowForm(false); setEditingPlan(null); }}
            onCreated={handleCreate}
            onUpdated={handleUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PlanCard({
  plan,
  isPending,
  onEdit,
  onToggle,
  onDelete,
}: {
  plan: Plan;
  isPending: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-bg-card p-5 transition-opacity",
        plan.active ? "border-border" : "border-border/50 opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-text-primary">{plan.name}</h3>
            <span className="rounded-full bg-bg-input px-2.5 py-0.5 text-[10px] font-medium text-text-tertiary">
              {intervalLabel[plan.billing_interval]}
            </span>
            {!plan.active && (
              <span className="rounded-full bg-error/10 px-2.5 py-0.5 text-[10px] font-medium text-error">
                Inativo
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-text-primary tabular-nums">{plan.price.toFixed(2)} €</span>
            <span className="text-sm text-text-tertiary">
              /{plan.billing_interval === "monthly" ? "mês" : "ano"}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-text-tertiary">
            {plan.classes_per_week && (
              <span>{plan.classes_per_week}x / semana</span>
            )}
            {!plan.classes_per_week && (
              <span>Aulas ilimitadas</span>
            )}
            <span>·</span>
            <span>{plan._member_count ?? 0} membro{(plan._member_count ?? 0) !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            title="Editar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-bg-input hover:text-text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggle}
            disabled={isPending}
            title={plan.active ? "Desativar" : "Ativar"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-40",
              plan.active
                ? "text-text-tertiary hover:bg-warning/10 hover:text-warning"
                : "text-success hover:bg-success/10"
            )}
          >
            {plan.active ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4 2.5v9M10 2.5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {confirmDelete ? (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-text-tertiary">Eliminar este plano?</span>
          <button
            onClick={onDelete}
            disabled={isPending}
            className="font-medium text-error hover:underline"
          >
            Sim, eliminar
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-text-tertiary"
          >
            Não
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="mt-3 text-xs text-error/60 hover:text-error transition-colors"
        >
          Eliminar
        </button>
      )}
    </div>
  );
}

function PlanFormModal({
  boxId,
  slug,
  plan,
  onClose,
  onCreated,
  onUpdated,
}: {
  boxId: string;
  slug: string;
  plan: Plan | null;
  onClose: () => void;
  onCreated: (p: Plan) => void;
  onUpdated: (p: Plan) => void;
}) {
  const isEditing = plan !== null;
  const [name, setName] = useState(plan?.name ?? "");
  const [price, setPrice] = useState(plan?.price?.toString() ?? "");
  const [interval, setInterval] = useState<"monthly" | "annual">(plan?.billing_interval ?? "monthly");
  const [classesPerWeek, setClassesPerWeek] = useState(plan?.classes_per_week?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError("Preço inválido.");
      return;
    }

    const parsedClasses = classesPerWeek ? parseInt(classesPerWeek) : null;
    if (classesPerWeek && (isNaN(parsedClasses!) || parsedClasses! < 1)) {
      setError("Número de aulas inválido.");
      return;
    }

    startTransition(async () => {
      if (isEditing) {
        const res = await updatePlan({
          id: plan.id,
          box_id: boxId,
          name,
          price: parsedPrice,
          billing_interval: interval,
          classes_per_week: parsedClasses,
          slug,
        });
        if (res.error) {
          setError(res.error);
        } else {
          onUpdated({ ...plan, name, price: parsedPrice, billing_interval: interval, classes_per_week: parsedClasses });
        }
      } else {
        const res = await createPlan({
          box_id: boxId,
          name,
          price: parsedPrice,
          billing_interval: interval,
          classes_per_week: parsedClasses,
          slug,
        });
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          onCreated(res.data);
        }
      }
    });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-2xl border border-border bg-bg-base p-6 shadow-xl sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">
            {isEditing ? "Editar plano" : "Novo plano"}
          </h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-input text-text-tertiary hover:text-text-primary">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Nome do plano *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="ex: Mensal Ilimitado"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Preço (€) *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="50.00"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">Aulas / semana</label>
              <input
                type="number"
                min="1"
                value={classesPerWeek}
                onChange={(e) => setClassesPerWeek(e.target.value)}
                className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="Ilimitadas"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Periodicidade</label>
            <div className="flex gap-2">
              {(["monthly", "annual"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setInterval(v)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                    interval === v
                      ? "border-accent bg-accent/5 text-text-primary"
                      : "border-border bg-bg-input text-text-secondary hover:border-accent/40"
                  )}
                >
                  {intervalLabel[v]}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-error">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "A guardar…" : isEditing ? "Guardar alterações" : "Criar plano"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
