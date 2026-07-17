import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-bg-base text-foreground flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="label-caps text-text-tertiary">
          Sem ligação
        </p>
        <h1 className="font-display text-3xl uppercase text-text-primary mt-3">
          Estás offline
        </h1>
        <p className="text-sm text-text-secondary mt-4">
          Verifica a tua ligação à internet e tenta novamente.
        </p>
      </div>
    </div>
  );
}
