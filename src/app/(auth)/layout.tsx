import { APP_CONFIG } from "@/lib/config";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100svh] text-foreground lg:flex">

      {/* Left — brand panel (desktop only) */}
      <div className="hidden lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:p-12"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 30% -10%, rgba(200,255,0,0.22) 0%, transparent 60%), #0A0A0A",
        }}
      >
        <span className="label-caps text-text-tertiary">{APP_CONFIG.name}</span>

        <div className="space-y-4">
          <p className="label-caps text-accent">Plataforma</p>
          <h2 className="font-display text-[4.5rem] leading-[0.88] text-text-primary">
            Treina.<br />Evolui.<br />Supera.
          </h2>
          <p className="max-w-sm text-base leading-relaxed text-text-secondary">
            Gestão completa para boxes de CrossFit. Aulas, WODs, métricas e comunidade — tudo num só lugar.
          </p>
        </div>

        <p className="text-sm text-text-tertiary">
          © {new Date().getFullYear()} {APP_CONFIG.name}
        </p>
      </div>

      {/* Right — form panel, vertically centered */}
      <div className="flex flex-1 flex-col lg:overflow-y-auto lg:border-l lg:border-border lg:justify-center">
        <div className="lg:mx-auto lg:w-full lg:max-w-[420px] lg:px-0">
          {children}
        </div>
      </div>

    </div>
  );
}
