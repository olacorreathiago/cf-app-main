"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createDropInPublic } from "@/lib/box/drop-in-actions";

type UpcomingClass = { id: string; name: string; starts_at: string; capacity: number };

interface Props {
  boxId: string;
  slug: string;
  prefill: { name: string | null; email: string | null; nickname: string | null } | null;
  isLoggedIn: boolean;
  upcomingClasses: UpcomingClass[];
  dropInPrice: number | null;
  paymentInstructions: string | null;
}

function groupByDate(classes: UpcomingClass[]) {
  const groups: { date: string; classes: UpcomingClass[] }[] = [];
  for (const cls of classes) {
    const dateKey = new Date(cls.starts_at).toLocaleDateString("pt-PT", {
      weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
    });
    const existing = groups.find((g) => g.date === dateKey);
    if (existing) existing.classes.push(cls);
    else groups.push({ date: dateKey, classes: [cls] });
  }
  return groups;
}

export function DropInRegisterForm({ boxId, slug, prefill, isLoggedIn, upcomingClasses, dropInPrice, paymentInstructions }: Props) {
  const pathname = usePathname();
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [nickname, setNickname] = useState(prefill?.nickname ?? "");
  const [classId, setClassId] = useState(upcomingClasses[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const groups = groupByDate(upcomingClasses);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) { setError("Seleciona uma aula."); return; }
    setError(null);

    startTransition(async () => {
      const res = await createDropInPublic({
        boxId,
        slug,
        name: name.trim(),
        email: email.trim(),
        nickname: nickname.trim() || undefined,
        classId,
      });
      if (res.error) { setError(res.error); return; }
      setSuccess(true);
    });
  }

  if (success) {
    const hasPrice = dropInPrice != null && dropInPrice > 0;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M4 13l6 6L22 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-text-primary">Pedido enviado!</h2>
            <p className="text-sm text-text-tertiary">
              O staff da box vai confirmar o teu drop-in em breve. Receberás um email de confirmação.
            </p>
          </div>
        </div>

        {hasPrice && (
          <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Pagamento</p>
              <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-[10px] font-medium text-warning">Pendente</span>
            </div>
            <p className="text-lg font-semibold text-text-primary">{dropInPrice!.toFixed(2)} €</p>
            {paymentInstructions && (
              <div className="rounded-xl bg-bg-input p-3">
                <p className="text-xs font-medium text-text-secondary mb-1">Instruções de pagamento</p>
                <p className="text-sm text-text-primary whitespace-pre-line">{paymentInstructions}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (upcomingClasses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center">
        <p className="text-sm text-text-tertiary">Sem aulas disponíveis para drop-in nos próximos 7 dias.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Login prompt for non-authenticated visitors */}
      {!isLoggedIn && (
        <div className="rounded-2xl border border-border bg-bg-card p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">Já tens conta? Entra para pré-preencher os teus dados.</p>
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className="shrink-0 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-black hover:opacity-90 transition-opacity"
          >
            Entrar
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Nome completo *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="O teu nome"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Email *</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="email@exemplo.pt"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Nickname <span className="text-text-tertiary font-normal">(opcional)</span>
            </label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="@handle ou nome de atleta"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-3">
          <p className="text-xs font-medium text-text-secondary">Escolhe a aula *</p>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div key={group.date} className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/70 px-1 capitalize">
                  {group.date}
                </p>
                {group.classes.map((cls) => {
                  const selected = classId === cls.id;
                  const time = new Date(cls.starts_at).toLocaleTimeString("pt-PT", {
                    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
                  });
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setClassId(cls.id)}
                      className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-all text-left ${
                        selected
                          ? "border-accent bg-accent/5 text-text-primary"
                          : "border-border bg-bg-input text-text-secondary hover:border-accent/40 hover:text-text-primary"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{cls.name}</p>
                        <p className="text-xs text-text-tertiary">{time}</p>
                      </div>
                      {selected && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 ml-2">
                          <path d="M2 7l3.5 3.5L12 3" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending || !classId}
          className="w-full rounded-2xl bg-accent py-3.5 text-base font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "A enviar…" : "Pedir drop-in"}
        </button>

        <p className="text-center text-xs text-text-tertiary">
          O teu drop-in ficará pendente até confirmação da box.
        </p>
      </form>
    </div>
  );
}
