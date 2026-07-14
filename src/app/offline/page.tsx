import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-widest text-gray-400">
          Sem ligacao
        </p>
        <h1 className="text-3xl font-bold text-amber-300 mt-3">
          Estas offline
        </h1>
        <p className="text-sm text-gray-300 mt-4">
          Verifica a tua ligacao a internet e tenta novamente.
        </p>
      </div>
    </div>
  );
}
