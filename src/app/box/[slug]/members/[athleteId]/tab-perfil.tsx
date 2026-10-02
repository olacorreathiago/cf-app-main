"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { suspendMember, reactivateMember, removeMember, changeRole, addMemberNote, deleteMemberNote, type MemberNote } from "@/lib/box/member-actions";
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
  notes: MemberNote[];
  currentUserId: string;
}

const ASSIGNABLE_ROLES: Record<string, string[]> = {
  owner:   ["partner", "manager", "coach", "athlete"],
  partner: ["partner", "manager", "coach", "athlete"],
  manager: ["coach", "athlete"],
};

export function TabPerfil({ slug, boxId, membership, profile, viewerRole, roleLabel, plans, notes: initialNotes, currentUserId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<MemberNote[]>(initialNotes);
  const [draft, setDraft] = useState("");
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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

  function handleAddNote() {
    const text = draft.trim();
    if (!text) return;
    startTransition(async () => {
      try {
        const note = await addMemberNote(membership.id, boxId, slug, text);
        setNotes((prev) => [note, ...prev]);
        setDraft("");
        toast.success("Nota adicionada.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao guardar nota.");
      }
    });
  }

  function handleDeleteNote(id: string) {
    startTransition(async () => {
      try {
        await deleteMemberNote(id, boxId, slug);
        setNotes((prev) => prev.filter((n) => n.id !== id));
        setConfirmDeleteId(null);
        toast.success("Nota apagada.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao apagar nota.");
      }
    });
  }

  const VISIBLE_NOTES = 3;
  const visibleNotes = showAllNotes ? notes : notes.slice(0, VISIBLE_NOTES);

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

      {/* Notas internas — linha do tempo, da mais recente para a mais antiga */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">
            Notas internas
          </h2>
          {notes.length > 0 && (
            <span className="rounded-full bg-bg-input px-2 py-0.5 text-[10px] font-medium tabular-nums text-text-tertiary">
              {notes.length}
            </span>
          )}
        </div>

        {/* Composer */}
        <div className="rounded-2xl border border-border bg-bg-card transition-colors focus-within:border-accent/50">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleAddNote();
              }
            }}
            rows={2}
            placeholder="Escreve uma nota sobre este atleta…"
            className="block w-full resize-none bg-transparent px-4 pt-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
            <p className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Só gestores e coaches
            </p>
            <button
              onClick={handleAddNote}
              disabled={isPending || !draft.trim()}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* Timeline */}
        {notes.length === 0 ? (
          <p className="px-1 text-sm text-text-tertiary">Ainda sem notas.</p>
        ) : (
          <ol className="relative">
            {/* connector line, behind the avatars */}
            <span className="absolute bottom-3 left-[13px] top-3 w-px bg-border" aria-hidden="true" />
            {visibleNotes.map((note) => {
              const mine = note.author_id === currentUserId;
              const confirming = confirmDeleteId === note.id;
              return (
                <li key={note.id} className="group relative flex gap-3 py-2.5">
                  <span
                    className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-input text-[10px] font-semibold uppercase text-text-secondary ring-4 ring-bg-base"
                    aria-hidden="true"
                  >
                    {note.author_name ? initialsOf(note.author_name) : "·"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-xs">
                        <span className="font-medium text-text-primary">
                          {note.author_name ?? "Nota anterior"}
                        </span>
                        <span
                          className="text-text-tertiary"
                          title={new Date(note.created_at).toLocaleString("pt-PT")}
                        >
                          {" "}· {formatNoteDate(note.created_at)}
                        </span>
                      </p>
                      {mine && (
                        confirming ? (
                          <span className="flex shrink-0 items-center gap-3 text-[11px]">
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              disabled={isPending}
                              className="font-medium text-error hover:underline disabled:opacity-50"
                            >
                              Apagar
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-text-tertiary hover:text-text-primary"
                            >
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(note.id)}
                            aria-label="Apagar nota"
                            className="shrink-0 text-text-tertiary opacity-100 transition-all hover:text-error lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M6 6h12M9.5 6V4.5A1 1 0 0110.5 3.5h3a1 1 0 011 1V6M7.5 6v13a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        )
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                      {note.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {notes.length > VISIBLE_NOTES && (
          <button
            onClick={() => setShowAllNotes((v) => !v)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs text-text-secondary transition-colors hover:border-text-tertiary hover:text-text-primary"
          >
            {showAllNotes ? "Ver menos" : `Ver mais · ${notes.length - VISIBLE_NOTES} ${notes.length - VISIBLE_NOTES === 1 ? "nota" : "notas"}`}
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className={showAllNotes ? "rotate-180" : ""}
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
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

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

function formatNoteDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  const dayDiff = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000
  );
  if (dayDiff === 0) return `hoje, ${time}`;
  if (dayDiff === 1) return `ontem, ${time}`;
  if (dayDiff < 7) return `há ${dayDiff} dias`;
  return d.toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
}
