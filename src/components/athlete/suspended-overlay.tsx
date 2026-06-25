"use client";

import { usePathname } from "next/navigation";

export function SuspendedOverlay() {
  const pathname = usePathname();

  if (pathname === "/athlete/prs") return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-md bg-bg-base/70">
      <div className="mx-6 flex max-w-sm flex-col items-center gap-4 rounded-3xl border border-border bg-bg-card px-8 py-10 text-center shadow-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10 text-error">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 7v5M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-text-primary">Conta suspensa</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            O teu acesso à box foi suspenso. Contacta o teu coach ou gestor para reativar a tua conta.
          </p>
        </div>
      </div>
    </div>
  );
}
