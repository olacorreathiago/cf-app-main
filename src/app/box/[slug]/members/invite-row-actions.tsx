"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { revokeInvite, resendInvite } from "@/lib/box/member-actions";

interface Props {
  inviteId: string;
  boxId: string;
  slug: string;
  expired: boolean;
}

export function InviteRowActions({ inviteId, boxId, slug, expired }: Props) {
  const [isPending, startTransition] = useTransition();

  if (expired) {
    return (
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try { await resendInvite(inviteId, boxId, slug); toast.success("Convite reenviado."); }
            catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
          })
        }
        className="text-xs font-medium text-accent hover:underline underline-offset-4 transition-colors disabled:opacity-50"
      >
        {isPending ? "…" : "Reenviar"}
      </button>
    );
  }

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try { await revokeInvite(inviteId, boxId, slug); toast.success("Convite revogado."); }
          catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Erro"); }
        })
      }
      className="text-xs text-error hover:underline underline-offset-4 transition-colors disabled:opacity-50"
    >
      {isPending ? "…" : "Revogar"}
    </button>
  );
}
