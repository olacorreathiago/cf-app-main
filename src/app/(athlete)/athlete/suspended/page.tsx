import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Conta Suspensa" };

export default function SuspendedPage() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-16">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10 text-error">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 7v5M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-xl text-text-primary">Conta suspensa</h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            O teu acesso à box foi suspenso temporariamente. Contacta o teu coach ou gestor para reativar a tua conta.
          </p>
        </div>

        <Link
          href="/athlete/prs"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 11V7M5 11V4M8 11V6M11 11V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ver os meus PRs
        </Link>
      </div>
    </div>
  );
}
