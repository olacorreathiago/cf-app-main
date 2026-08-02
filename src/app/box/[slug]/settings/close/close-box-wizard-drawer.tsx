"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DrawerShell, PrimaryButton } from "@/components/shared";
import { closeBox, type BoxClosureSummary } from "@/lib/box/closure-actions";
import { DEFAULT_CLOSURE_MESSAGE } from "@/lib/box/closure-constants";

const MESSAGE_MAX = 500;

interface Props {
  open: boolean;
  onClose: () => void;
  slug: string;
  boxId: string;
  summary: BoxClosureSummary;
}

export function CloseBoxWizardDrawer({ open, onClose, slug, boxId, summary }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const previewMessage = message.trim() || DEFAULT_CLOSURE_MESSAGE;
  const nameMatches = confirmName.trim() === summary.boxName;

  function handleClose() {
    if (submitting) return;
    setMessage("");
    setConfirmName("");
    onClose();
  }

  async function handleConfirm() {
    if (!nameMatches) return;
    setSubmitting(true);
    const result = await closeBox({ boxId, message, confirmName });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Box encerrada.");
    router.push(`/box/${slug}/settings`);
    router.refresh();
  }

  return (
    <DrawerShell
      open={open}
      onClose={handleClose}
      widthClassName="lg:w-[480px]"
      header={
        <>
          <p className="label-caps text-text-tertiary mb-1">Encerrar box</p>
          <h2 className="font-display text-2xl leading-tight text-text-primary">
            {summary.boxName}
          </h2>
        </>
      }
      footer={
        <PrimaryButton
          onClick={handleConfirm}
          disabled={!nameMatches || submitting}
          loading={submitting}
          className="bg-error text-white hover:bg-error/90 disabled:bg-error/40"
        >
          Encerrar box e desassociar {summary.activeMemberCount} membro{summary.activeMemberCount === 1 ? "" : "s"}
        </PrimaryButton>
      }
    >
      <div className="space-y-6">
        {/* Resumo */}
        <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
          <SummaryRow label="Membros desassociados" value={String(summary.activeMemberCount)} />
          <SummaryRow label="Pagamentos pendentes" value={String(summary.pendingPaymentsCount)} />
          <SummaryRow
            label="Aulas futuras canceladas"
            value={String(summary.upcomingClassesWithBookingsCount)}
          />
        </div>

        {/* Comunicado */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="closure-message" className="text-sm font-medium text-text-secondary">
              Comunicado (opcional)
            </label>
            <span className="text-xs text-text-tertiary">
              {message.length}/{MESSAGE_MAX}
            </span>
          </div>
          <textarea
            id="closure-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
            rows={4}
            placeholder={DEFAULT_CLOSURE_MESSAGE}
            className="w-full rounded-xl border border-border bg-bg-input px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none transition-shadow duration-150 focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
          />
          <p className="text-xs text-text-tertiary">
            Fica visível no histórico dos atletas. Vazio usa o texto padrão.
          </p>
        </div>

        {/* Preview */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-text-secondary">Pré-visualização</p>
          <div className="rounded-2xl border border-border bg-bg-input px-4 py-3.5 space-y-1">
            <p className="text-sm font-medium text-text-primary">
              Box encerrada — {summary.boxName}
            </p>
            <p className="text-sm text-text-secondary">{previewMessage}</p>
          </div>
        </div>

        {/* Confirmação por escrita do nome */}
        <div className="space-y-1.5">
          <label htmlFor="confirm-name" className="text-sm font-medium text-text-secondary">
            Escreve <span className="font-semibold text-text-primary">{summary.boxName}</span> para confirmar
          </label>
          <input
            id="confirm-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={summary.boxName}
            className="w-full rounded-xl border border-border bg-bg-input px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none transition-shadow duration-150 focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>
      </div>
    </DrawerShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-text-primary tabular-nums">{value}</span>
    </div>
  );
}
