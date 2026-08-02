"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { reopenBox } from "@/lib/box/closure-actions";

export function ReopenBanner({ boxId, deletedAt }: { boxId: string; deletedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function handleReopen() {
    startTransition(async () => {
      const result = await reopenBox(boxId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Box reaberta.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-error/30 bg-error/5 px-5 py-3">
      <p className="text-sm text-text-primary">
        Box encerrada a {format(new Date(deletedAt), "d 'de' MMMM yyyy", { locale: pt })} —
        podes reabrir dentro de 30 dias.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleReopen}
          disabled={pending}
          className="rounded-full bg-error px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "A reabrir…" : "Reabrir"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs text-text-tertiary hover:text-text-secondary"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
