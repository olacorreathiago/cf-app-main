import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { APP_CONFIG } from "@/lib/config";

async function serverSignOut() {
  "use server";
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

const STATES = {
  pending_approval: {
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="1.75" className="text-accent" />
        <path d="M18 11v7l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
      </svg>
    ),
    iconBg: "bg-accent/10 ring-accent/20",
    title: "Perfil em análise",
    body: "Recebemos o teu pedido. A nossa equipa irá rever o teu perfil profissional e entrar em contacto em breve.",
    hint: "Tens dúvidas? A nossa equipa está disponível para ajudar.",
  },
  rejected: {
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="1.75" className="text-error" />
        <path d="M13 13l10 10M23 13l-10 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-error" />
      </svg>
    ),
    iconBg: "bg-error/10 ring-error/20",
    title: "Pedido não aprovado",
    body: "O teu pedido de acesso profissional não foi aprovado. Contacta o suporte para mais informações ou para submeter nova documentação.",
    hint: null,
  },
} as const;

export default async function WaitingApprovalPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("approval_status")
    .eq("id", user.id)
    .single();

  if (profile?.approval_status === "approved") redirect("/dashboard");

  const status = profile?.approval_status === "rejected" ? "rejected" : "pending_approval";
  const state = STATES[status];

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <div className={`mb-8 flex h-20 w-20 items-center justify-center rounded-full ring-1 ${state.iconBg}`}>
        {state.icon}
      </div>

      <div className="max-w-sm space-y-3">
        <h1 className="font-display text-[2.2rem] leading-[0.95] text-text-primary">
          {state.title}
        </h1>
        <p className="text-sm leading-relaxed text-text-secondary">
          {state.body}
        </p>
        {state.hint && (
          <p className="text-xs text-text-tertiary">{state.hint}</p>
        )}
      </div>

      {APP_CONFIG.supportWhatsApp && (
        <a
          href={`https://wa.me/${APP_CONFIG.supportWhatsApp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex items-center gap-2.5 rounded-full border border-border bg-bg-card px-5 py-3 text-sm font-medium text-text-primary transition-colors duration-150 hover:border-accent/40 hover:bg-bg-card-hover"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 1.5A7.5 7.5 0 0 1 16.5 9c0 4.142-3.358 7.5-7.5 7.5a7.47 7.47 0 0 1-3.75-1L1.5 16.5l1.03-3.195A7.47 7.47 0 0 1 1.5 9 7.5 7.5 0 0 1 9 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
            <path d="M6.75 6.938c.15.337.563 1.162.65 1.35.087.187.037.412-.075.562-.113.15-.263.263-.263.413 0 .15.15.412.413.675.262.262.9.787 1.612.787.713 0 .9-.337 1.05-.487.15-.15.375-.188.563-.113.187.075.787.375.937.45.15.075.263.112.3.187.038.075.038.412-.112.75-.15.337-.787.637-1.125.675-.337.037-.712.05-2.213-.75C6.488 10.425 5.7 8.85 5.7 8.7c0-.15.038-.525.338-.825.3-.3.6-.3.712-.3Z" fill="currentColor" className="text-accent" />
          </svg>
          Falar com suporte
        </a>
      )}

      <form action={serverSignOut} className="mt-6">
        <button
          type="submit"
          className="text-sm text-text-tertiary underline-offset-4 hover:text-text-secondary hover:underline transition-colors duration-150"
        >
          Sair da conta
        </button>
      </form>
    </div>
  );
}
