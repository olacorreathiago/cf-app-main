"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getBillingData, upsertMembershipPayment, markPaymentPaid } from "@/lib/payments/actions";
import type { Payment, PaymentMethod } from "@/lib/payments/types";
import { suspendMember } from "@/lib/box/member-actions";

interface BillingData {
  members: unknown[];
  payments: Payment[];
  dropInPayments: unknown[];
}

interface Props {
  boxId: string;
  slug: string;
  initialYear: number;
  initialMonth: number;
  initialData: BillingData;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  mbway: "MB Way",
  transferencia: "Transferência",
  multibanco: "Multibanco",
  card: "Cartão",
};

function periodStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function periodEnd(year: number, month: number) {
  const next = month === 12 ? 1 : month + 1;
  const nextY = month === 12 ? year + 1 : year;
  return `${nextY}-${String(next).padStart(2, "0")}-01`;
}

export function BillingClient({ boxId, slug, initialYear, initialMonth, initialData }: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [data, setData] = useState<BillingData>(initialData);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [payingMemberId, setPayingMemberId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("mbway");
  const [confirmSuspendId, setConfirmSuspendId] = useState<string | null>(null);
  const [payingDropInId, setPayingDropInId] = useState<string | null>(null);
  const [dropInPayMethod, setDropInPayMethod] = useState<PaymentMethod>("mbway");

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const isPastMonth = new Date(year, month - 1) < new Date(now.getFullYear(), now.getMonth());

  async function navigate(dir: -1 | 1) {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
    setLoading(true);
    setPayingMemberId(null);
    try {
      const newData = await getBillingData(boxId, y, m);
      setData(newData);
    } catch {
      toast.error("Erro ao carregar dados.");
    }
    setLoading(false);
  }

  function memberUserId(m: unknown): string {
    return (m as { user_id: string }).user_id;
  }

  function memberPlan(m: unknown): { name: string; price: number; billing_interval: string } | null {
    return (m as { plans: { name: string; price: number; billing_interval: string } | null }).plans;
  }

  function memberProfile(m: unknown): { full_name: string | null; email: string | null; avatar_url: string | null } | null {
    return (m as { profiles: { full_name: string | null; email: string | null; avatar_url: string | null } | null }).profiles;
  }

  function memberId(m: unknown): string {
    return (m as { id: string }).id;
  }

  function getMemberPayment(userId: string): Payment | undefined {
    return data.payments.find((p) => p.user_id === userId);
  }

  function getMemberStatus(userId: string): "paid" | "pending" | "overdue" {
    const payment = getMemberPayment(userId);
    if (payment?.status === "paid") return "paid";
    if (isPastMonth || isCurrentMonth) return "overdue";
    return "pending";
  }

  function handleMarkPaid(member: unknown) {
    const plan = memberPlan(member);
    if (!plan) return;
    const uid = memberUserId(member);
    const mid = memberId(member);
    setPayingMemberId(null);
    const optimisticPayment: Payment = {
      id: crypto.randomUUID(),
      box_id: boxId,
      user_id: uid,
      kind: "membership",
      reference_id: mid,
      amount: plan.price,
      currency: "EUR",
      provider: "manual",
      method: payMethod,
      status: "paid",
      provider_payment_id: null,
      period_start: periodStart(year, month),
      period_end: periodEnd(year, month),
      paid_at: new Date().toISOString(),
      recorded_by: null,
      notes: null,
      created_at: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      payments: [...prev.payments.filter((p) => p.user_id !== uid), optimisticPayment],
    }));

    startTransition(async () => {
      try {
        await upsertMembershipPayment({
          box_id: boxId,
          user_id: uid,
          membership_id: mid,
          amount: plan.price,
          method: payMethod,
          period_start: periodStart(year, month),
          period_end: periodEnd(year, month),
          slug,
        });
        toast.success("Pagamento registado.");
      } catch {
        toast.error("Erro ao registar pagamento.");
        setData((prev) => ({
          ...prev,
          payments: prev.payments.filter((p) => p.id !== optimisticPayment.id),
        }));
      }
    });
  }

  const totalReceived = data.payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = data.members
    .filter((m) => getMemberStatus(memberUserId(m)) !== "paid")
    .reduce((sum: number, m) => sum + (memberPlan(m)?.price ?? 0), 0);
  const dropInPaid = data.dropInPayments.filter((p) => (p as Payment).status === "paid");
  const dropInPending = data.dropInPayments.filter((p) => (p as Payment).status === "pending");
  const dropInTotal = data.dropInPayments.reduce((sum: number, p) => sum + (p as Payment).amount, 0);

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-tertiary transition-colors hover:text-text-primary"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-text-primary capitalize">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button
          onClick={() => navigate(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-tertiary transition-colors hover:text-text-primary"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-1">Recebido</p>
          <p className="text-xl font-bold text-success tabular-nums">{totalReceived.toFixed(2)} €</p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-1">Pendente</p>
          <p className="text-xl font-bold text-warning tabular-nums">{totalPending.toFixed(2)} €</p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary mb-1">Drop-ins</p>
          <p className="text-xl font-bold text-text-primary tabular-nums">{dropInTotal.toFixed(2)} €</p>
        </div>
      </div>

      {/* Members billing table */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60 mb-3 px-1">
          Mensalidades · {data.members.length} membro{data.members.length !== 1 ? "s" : ""} com plano
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-bg-card px-4 py-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-border" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded bg-border" />
                    <div className="h-2.5 w-20 rounded bg-border" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : data.members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-bg-card px-6 py-12 text-center">
            <p className="text-sm text-text-tertiary">Sem membros com plano ativo neste mês.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
            {data.members.map((member) => {
              const profile = memberProfile(member);
              const plan = memberPlan(member);
              const uid = memberUserId(member);
              const mid = memberId(member);
              const status = getMemberStatus(uid);
              const payment = getMemberPayment(uid);
              const name = profile?.full_name ?? profile?.email ?? "—";
              const isPaying = payingMemberId === mid;

              return (
                <div key={mid} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-accent/15 flex items-center justify-center text-sm font-semibold text-accent shrink-0">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                      <p className="text-xs text-text-tertiary truncate">
                        {plan?.name ?? "—"} · {plan?.price.toFixed(2)} €
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                          status === "paid" && "bg-success/10 text-success",
                          status === "pending" && "bg-warning/10 text-warning",
                          status === "overdue" && "bg-error/10 text-error"
                        )}
                      >
                        {status === "paid" ? "Pago" : status === "overdue" ? "Em atraso" : "Pendente"}
                      </span>
                      {status !== "paid" && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPayingMemberId(isPaying ? null : mid)}
                            className="rounded-lg bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
                          >
                            Marcar pago
                          </button>
                          {status === "overdue" && confirmSuspendId !== mid && (
                            <button
                              type="button"
                              onClick={() => setConfirmSuspendId(mid)}
                              className="rounded-lg bg-error/10 px-2.5 py-1 text-[11px] font-medium text-error transition-colors hover:bg-error/20"
                            >
                              Suspender
                            </button>
                          )}
                          {confirmSuspendId === mid && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => {
                                  setConfirmSuspendId(null);
                                  startTransition(async () => {
                                    try {
                                      await suspendMember(mid, boxId, slug);
                                      setData((prev) => ({
                                        ...prev,
                                        members: prev.members.filter((m2) => memberId(m2) !== mid),
                                      }));
                                      toast.success("Membro suspenso.");
                                    } catch {
                                      toast.error("Erro ao suspender.");
                                    }
                                  });
                                }}
                                className="rounded-lg bg-error px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmSuspendId(null)}
                                className="text-[11px] text-text-tertiary"
                              >
                                Não
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {status === "paid" && payment?.method && (
                        <span className="text-[10px] text-text-tertiary">
                          {METHOD_LABELS[payment.method] ?? payment.method}
                        </span>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isPaying && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 ml-12 rounded-xl border border-border bg-bg-input p-3 space-y-2.5">
                          <p className="text-xs font-medium text-text-secondary">Método de pagamento</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(["cash", "mbway", "transferencia", "multibanco", "card"] as PaymentMethod[]).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setPayMethod(m)}
                                className={cn(
                                  "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                                  payMethod === m
                                    ? "bg-accent text-black"
                                    : "bg-bg-card border border-border text-text-secondary hover:text-text-primary"
                                )}
                              >
                                {METHOD_LABELS[m]}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleMarkPaid(member)}
                              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
                            >
                              Confirmar pagamento
                            </button>
                            <button
                              type="button"
                              onClick={() => setPayingMemberId(null)}
                              className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drop-ins pending */}
      {dropInPending.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60 mb-3 px-1">
            Drop-ins pendentes · {dropInPending.length}
          </p>
          <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
            {dropInPending.map((raw) => {
              const p = raw as Payment & { drop_in_name: string | null; drop_in_email: string | null };
              const isPaying = payingDropInId === p.id;
              const label = p.drop_in_name ?? p.drop_in_email ?? "Visitante";
              return (
                <div key={p.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {label}
                      </p>
                      {p.drop_in_email && p.drop_in_name && (
                        <p className="text-[10px] text-text-tertiary truncate">{p.drop_in_email}</p>
                      )}
                      <p className="text-xs text-text-tertiary">
                        {new Date(p.created_at).toLocaleDateString("pt-PT")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-text-primary tabular-nums">
                        {p.amount.toFixed(2)} €
                      </span>
                      <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-[10px] font-medium text-warning">
                        Pendente
                      </span>
                      <button
                        type="button"
                        onClick={() => setPayingDropInId(isPaying ? null : p.id)}
                        className="rounded-lg bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent transition-colors hover:bg-accent/20"
                      >
                        Registar
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isPaying && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 rounded-xl border border-border bg-bg-input p-3 space-y-2.5">
                          <p className="text-xs font-medium text-text-secondary">Método de pagamento</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(["cash", "mbway", "transferencia", "multibanco", "card"] as PaymentMethod[]).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setDropInPayMethod(m)}
                                className={cn(
                                  "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                                  dropInPayMethod === m
                                    ? "bg-accent text-black"
                                    : "bg-bg-card border border-border text-text-secondary hover:text-text-primary"
                                )}
                              >
                                {METHOD_LABELS[m]}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => {
                                setPayingDropInId(null);
                                startTransition(async () => {
                                  try {
                                    await markPaymentPaid({
                                      payment_id: p.id,
                                      box_id: boxId,
                                      method: dropInPayMethod,
                                      slug,
                                    });
                                    setData((prev) => ({
                                      ...prev,
                                      dropInPayments: prev.dropInPayments.map((dp) =>
                                        (dp as Payment).id === p.id
                                          ? { ...(dp as Payment), status: "paid" as const, method: dropInPayMethod, paid_at: new Date().toISOString() }
                                          : dp
                                      ),
                                    }));
                                    toast.success("Pagamento registado.");
                                  } catch {
                                    toast.error("Erro ao registar pagamento.");
                                  }
                                });
                              }}
                              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-black disabled:opacity-50"
                            >
                              Confirmar pagamento
                            </button>
                            <button
                              type="button"
                              onClick={() => setPayingDropInId(null)}
                              className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drop-ins paid */}
      {dropInPaid.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60 mb-3 px-1">
            Drop-ins pagos · {dropInPaid.length}
          </p>
          <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
            {dropInPaid.map((raw) => {
              const p = raw as Payment & { drop_in_name: string | null; drop_in_email: string | null };
              const label = p.drop_in_name ?? p.drop_in_email ?? "Visitante";
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {label}
                    </p>
                    {p.drop_in_email && p.drop_in_name && (
                      <p className="text-[10px] text-text-tertiary truncate">{p.drop_in_email}</p>
                    )}
                    <p className="text-xs text-text-tertiary">
                      {new Date(p.paid_at ?? p.created_at).toLocaleDateString("pt-PT")}
                      {p.method && ` · ${METHOD_LABELS[p.method] ?? p.method}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-text-primary tabular-nums">
                      {p.amount.toFixed(2)} €
                    </span>
                    <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-medium text-success">
                      Pago
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
