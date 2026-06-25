"use client";

import { useRouter } from "next/navigation";

export function RefreshButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.refresh()}
      className="flex items-center gap-1.5 rounded-xl border border-border bg-bg-card px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-input transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M13.5 8A5.5 5.5 0 112.5 4.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        <path d="M2.5 1.5v3h3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Atualizar
    </button>
  );
}
