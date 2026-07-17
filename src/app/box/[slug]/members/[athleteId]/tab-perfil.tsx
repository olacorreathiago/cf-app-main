"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { suspendMember, reactivateMember, removeMember, changeRole, updateMemberNotes } from "@/lib/box/member-actions";
import { assignPlan, type Plan } from "@/lib/box/plan-actions";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  phone: string | null;
}

interface Membership {
  id: string;
  role: string;
  status: string;
  notes: string | null;
  plan_id: string | null;
  created_at: string;
}

interface Props {
  slug: string;
  boxId: string;
  membership: Membership;
  profile: Profile;
  viewerRole: string;
  roleLabel: Record<string, string>;
  plans: Plan[];
}

const ASSIGNABLE_ROLES: Record<string, string[]> = {
  owner:   ["partner", "manager", "coach", "athlete"],
  partner: ["partner", "manager", "coach", "athlete"],
  manager: ["coach", "athlete"],
};

export function TabPerfil({ slug, boxId, membership, profile, viewerRole, roleLabel, plans }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(membership.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showPlanMenu, setShowPlanMenu] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(membership.plan_id);

  const canAct = membership.role !== "owner" && viewerRole !== "athlete" && viewerRole !== "coach";
  const assignable = (ASSIGNABLE_ROLES[viewerRole] ?? []).filter((r) => r !== membership.role);

  function handleSuspend() {
    startTransition(async () => {
      try {
        await suspendMember(membership.id, boxId, slug);
        toast.success("Atleta suspenso.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao suspender.");
      }
    });
  }

  function handleReactivate() {
    startTransition(async () => {
      try {
        await reactivateMember(membership.id, boxId, slug);
        toast.success("Atleta reativado.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao reativar.");
      }
    });
  }

  function handleRemove() {
    if (!confirm("Tens a certeza que queres remover este atleta da box?")) return;
    startTransition(async () => {
      try {
        await removeMember(membership.id, boxId, slug);
        toast.success("Atleta removido.");
        router.push(`/box/${slug}/members`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao remover.");
      }
    });
  }

  function handleRoleChange(newRole: string) {
    setShowRoleMenu(false);
    startTransition(async () => {
      try {
        await changeRole(membership.id, boxId, slug, newRole);
        toast.success(`Role alterado para ${roleLabel[newRole] ?? newRole}.`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao alterar role.");
      }
    });
  }

  function handleSaveNotes() {
    startTransition(async () => {
      try {
        await updateMemberNotes(membership.id, boxId, slug, notes);
        toast.success("Notas guardadas.");
        setEditingNotes(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao guardar notas.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Dados pessoais */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
          Dados pessoais
        </h2>
        <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border">
          <FieldRow label="Nome" value={profile.full_name ?? "—"} />
          <FieldRow label="Email" value={profile.email} />
          <FieldRow label="Telemóvel" value={profile.phone ?? "—"} muted={!profile.phone} />
        </div>
      </section>

      {/* Membresia */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
          Membership
        </h2>
        <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border">
          <FieldRow label="Role" value={roleLabel[membership.role] ?? membership.role} />
          <FieldRow
            label="Estado"
            value={membership.status === "active" ? "Ativo" : "Suspenso"}
            valueClass={membership.status === "active" ? "text-success" : "text-error"}
          />
          <FieldRow
            label="Membro desde"
            value={new Date(membership.created_at).toLocaleDateString("pt-PT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        </div>
      </section>

      {/* Plano */}
      {membership.role === "athlete" && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
            Plano
          </h2>
          <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-text-tertiary">Plano atual</span>
              <div className="relative flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">
                  {currentPlanId ? plans.find((p) => p.id === currentPlanId)?.name ?? "—" : "Sem plano"}
                </span>
                {canAct && (
                  <button
                    onClick={() => setShowPlanMenu((v) => !v)}
                    className="text-xs text-accent hover:underline underline-offset-4"
                  >
                    Alterar
                  </button>
                )}
                {showPlanMenu && (
                  <div className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-border bg-bg-card shadow-lg py-1">
                    <button
                      onClick={() => {
                        setShowPlanMenu(false);
                        setCurrentPlanId(null);
                        startTransition(async () => {
                          const res = await assignPlan(membership.id, null, boxId, slug);
                          if (res.error) { toast.error(res.error); setCurrentPlanId(membership.plan_id); }
                          else { toast.success("Plano removido."); router.refresh(); }
                        });
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-text-tertiary hover:bg-bg-input transition-colors"
                    >
                      Sem plano
                    </button>
                    {plans.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setShowPlanMenu(false);
                          setCurrentPlanId(p.id);
                          startTransition(async () => {
                            const res = await assignPlan(membership.id, p.id, boxId, slug);
                            if (res.error) { toast.error(res.error); setCurrentPlanId(membership.plan_id); }
                            else { toast.success(`Plano alterado para ${p.name}.`); router.refresh(); }
                          });
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-bg-input transition-colors ${
                          currentPlanId === p.id ? "text-accent font-medium" : "text-text-primary"
                        }`}
                      >
                        {p.name} · {p.price.toFixed(2)} €/{p.billing_interval === "monthly" ? "mês" : "ano"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {currentPlanId && (() => {
              const plan = plans.find((p) => p.id === currentPlanId);
              if (!plan) return null;
              return (
                <>
                  <FieldRow label="Preço" value={`${plan.price.toFixed(2)} €/${plan.billing_interval === "monthly" ? "mês" : "ano"}`} />
                  <FieldRow label="Aulas/semana" value={plan.classes_per_week ? String(plan.classes_per_week) : "Ilimitadas"} />
                </>
              );
            })()}
          </div>
        </section>
      )}

      {/* Notas internas */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
            Notas internas
          </h2>
          {!editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              Editar
            </button>
          )}
        </div>

        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Adiciona uma nota sobre este atleta..."
              className="w-full rounded-xl border border-border bg-bg-input px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveNotes}
                disabled={isPending}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
              >
                Guardar
              </button>
              <button
                onClick={() => { setNotes(membership.notes ?? ""); setEditingNotes(false); }}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-tertiary hover:text-text-primary"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-bg-card px-4 py-3 min-h-[64px]">
            {notes ? (
              <p className="text-sm text-text-secondary whitespace-pre-wrap">{notes}</p>
            ) : (
              <p className="text-sm text-text-tertiary">Sem notas. Visíveis apenas para gestores e coaches.</p>
            )}
          </div>
        )}
      </section>

      {/* Ações */}
      {canAct && (
        <section className="flex flex-wrap items-center gap-2 pt-2">
          {membership.status === "suspended" ? (
            <button
              onClick={handleReactivate}
              disabled={isPending}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-input disabled:opacity-50 transition-colors"
            >
              Reativar
            </button>
          ) : (
            <button
              onClick={handleSuspend}
              disabled={isPending}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-input disabled:opacity-50 transition-colors"
            >
              Suspender
            </button>
          )}

          {assignable.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu((v) => !v)}
                disabled={isPending}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-input disabled:opacity-50 transition-colors"
              >
                Alterar role
              </button>
              {showRoleMenu && (
                <div className="absolute left-0 top-9 z-20 w-40 rounded-xl border border-border bg-bg-card shadow-lg py-1">
                  {assignable.map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-input transition-colors"
                    >
                      {roleLabel[r] ?? r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleRemove}
            disabled={isPending}
            className="ml-auto rounded-lg border border-error/30 px-3 py-1.5 text-sm text-error hover:bg-error/10 disabled:opacity-50 transition-colors"
          >
            Remover da box
          </button>
        </section>
      )}
    </div>
  );
}

function FieldRow({
  label,
  value,
  muted,
  valueClass,
}: {
  label: string;
  value: string;
  muted?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-text-tertiary">{label}</span>
      <span className={`text-sm font-medium ${valueClass ?? (muted ? "text-text-tertiary font-normal" : "text-text-primary")}`}>
        {value}
      </span>
    </div>
  );
}
