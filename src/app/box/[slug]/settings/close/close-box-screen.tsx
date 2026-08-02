"use client";

import { useState } from "react";
import Link from "next/link";
import type { BoxClosureSummary } from "@/lib/box/closure-actions";
import { CloseBoxWizardDrawer } from "./close-box-wizard-drawer";

interface Props {
  slug: string;
  boxId: string;
  summary: BoxClosureSummary;
}

export function CloseBoxScreen({ slug, boxId, summary }: Props) {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <main className="mx-auto w-full max-w-lg px-5 py-16 text-center space-y-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10 text-error">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 7v5M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="space-y-2">
        <p className="label-caps text-text-tertiary">Zona de perigo</p>
        <h1 className="font-display text-2xl uppercase text-text-primary">
          Encerrar {summary.boxName}
        </h1>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed">
        Esta box tem atualmente{" "}
        <strong className="text-text-primary">
          {summary.activeMemberCount} membro{summary.activeMemberCount === 1 ? "" : "s"} ativo{summary.activeMemberCount === 1 ? "" : "s"}
        </strong>
        .
      </p>

      <div className="rounded-2xl border border-error/30 bg-error/5 px-5 py-4 text-left">
        <p className="text-sm text-text-primary leading-relaxed">
          No próximo passo, <strong>todos os membros são desassociados de uma vez</strong> —
          não é possível escolher atletas individualmente. Se quiseres tratar algum caso à
          parte, faz isso na área de Membros antes de avançar.
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="w-full rounded-full bg-error px-6 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Avançar
        </button>
        <Link
          href={`/box/${slug}/members`}
          className="w-full rounded-full border border-border bg-bg-input px-6 py-3.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          Ir para Membros
        </Link>
        <Link
          href={`/box/${slug}/settings`}
          className="text-xs text-text-tertiary underline-offset-4 hover:text-text-secondary hover:underline transition-colors duration-150"
        >
          Cancelar
        </Link>
      </div>

      <CloseBoxWizardDrawer
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        slug={slug}
        boxId={boxId}
        summary={summary}
      />
    </main>
  );
}
