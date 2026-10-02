"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelAccountDeletion } from "@/lib/account/deletion-actions";

export function RecoverAccountButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await cancelAccountDeletion();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Conta recuperada.");
      // Hard navigation: the client router cache may still hold the earlier
      // /athlete → /athlete/deleted redirect and bounce us back here.
      window.location.assign("/athlete");
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "A recuperar…" : "Recuperar conta"}
    </button>
  );
}
