import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuthCenteredShell, AuthCard } from "@/components/shared";
import { APP_CONFIG } from "@/lib/config";

export const metadata: Metadata = { title: "Em Análise" };

async function serverSignOut() {
  "use server";
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

const STATES = {
  pending_approval: {
    badge: "bg-accent text-accent-fg",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M12.1952 12.0979C12.423 11.3962 12.8401 10.7717 13.401 10.2924C13.9618 9.81309 14.645 9.49812 15.3736 9.38251C16.1023 9.26691 16.8482 9.35494 17.5299 9.63712C18.2115 9.91929 18.8019 10.3847 19.2356 10.9815C19.6694 11.5783 19.9291 12.2832 19.9871 13.0186C20.0451 13.7541 19.8984 14.4915 19.5635 15.1488C19.2286 15.8062 18.7191 16.3577 18.0901 16.7432C17.4611 17.1287 16.7377 17.3328 15.9999 17.3328V18.6661M16.0663 22.6664V22.7997L15.9335 22.7994V22.6664H16.0663ZM17.6614 4.61172L19.2893 5.99905C19.6995 6.34857 20.2087 6.55988 20.7459 6.60274L22.8779 6.77266C24.1315 6.87269 25.1271 7.86773 25.2272 9.12124L25.3967 11.2536C25.4395 11.7908 25.6516 12.3008 26.0011 12.7109L27.3878 14.3384C28.2035 15.2955 28.2036 16.7034 27.388 17.6605L26.0012 19.2882C25.6517 19.6984 25.4399 20.2085 25.3971 20.7457L25.2265 22.8778C25.1265 24.1313 24.1323 25.1269 22.8788 25.227L20.746 25.3971C20.2089 25.44 19.6991 25.6508 19.289 26.0003L17.6614 27.3876C16.7043 28.2033 15.2956 28.2034 14.3385 27.3878L12.7109 26.0004C12.3007 25.6509 11.791 25.4397 11.2538 25.3969L9.12103 25.227C7.86752 25.1269 6.8734 24.1315 6.77337 22.878L6.6028 20.7458C6.55994 20.2087 6.34815 19.6989 5.99863 19.2888L4.61192 17.6606C3.79628 16.7035 3.7959 15.296 4.61153 14.3389L5.9995 12.7107C6.34902 12.3005 6.55877 11.7908 6.60163 11.2537L6.7722 9.12149C6.87223 7.86798 7.86922 6.87256 9.12273 6.77253L11.2532 6.60261C11.7903 6.55974 12.3003 6.34861 12.7105 5.99909L14.3386 4.61172C15.2957 3.79609 16.7043 3.79609 17.6614 4.61172Z" stroke="#1E1E1E" strokeWidth="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    ),
    title: "Perfil em análise",
    body: "Recebemos o teu pedido. A nossa equipa irá rever o teu perfil profissional e entrar em contacto em breve.",
    hint: "Tens dúvidas? A nossa equipa está disponível para ajudar.",
    showSupport: true,
  },
  rejected: {
    badge: "bg-error text-white",
    icon: (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <path d="M9 9l8 8M17 9l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    title: "Pedido não aprovado",
    body: "O teu pedido de acesso profissional não foi aprovado. Contacta o suporte para mais informações ou para submeter nova documentação.",
    hint: null,
    showSupport: true,
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

  if (profile?.approval_status === "approved") redirect("/athlete");

  const status = profile?.approval_status === "rejected" ? "rejected" : "pending_approval";
  const state = STATES[status];

  return (
    <AuthCenteredShell
      footer={
        <form action={serverSignOut}>
          <button
            type="submit"
            className="text-sm text-white/45 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
          >
            Sair da conta
          </button>
        </form>
      }
    >
      <AuthCard>
        <div className="flex flex-col items-center text-center">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${state.badge}`}>
            {state.icon}
          </div>

          <h1 className="mt-5 font-display text-2xl uppercase leading-none tracking-tight text-white">
            {state.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{state.body}</p>
          {state.hint && <p className="mt-3 text-xs text-white/40">{state.hint}</p>}

          {state.showSupport && APP_CONFIG.supportWhatsApp && (
            <a
              href={`https://wa.me/${APP_CONFIG.supportWhatsApp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-[#1EBE5A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M9 1.5A7.5 7.5 0 0 1 16.5 9c0 4.142-3.358 7.5-7.5 7.5a7.47 7.47 0 0 1-3.75-1L1.5 16.5l1.03-3.195A7.47 7.47 0 0 1 1.5 9 7.5 7.5 0 0 1 9 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.75 6.938c.15.337.563 1.162.65 1.35.087.187.037.412-.075.562-.113.15-.263.263-.263.413 0 .15.15.412.413.675.262.262.9.787 1.612.787.713 0 .9-.337 1.05-.487.15-.15.375-.188.563-.113.187.075.787.375.937.45.15.075.263.112.3.187.038.075.038.412-.112.75-.15.337-.787.637-1.125.675-.337.037-.712.05-2.213-.75C6.488 10.425 5.7 8.85 5.7 8.7c0-.15.038-.525.338-.825.3-.3.6-.3.712-.3Z" fill="currentColor" />
              </svg>
              Falar com suporte
            </a>
          )}
        </div>
      </AuthCard>
    </AuthCenteredShell>
  );
}
