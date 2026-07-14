import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { acceptInvite } from "@/lib/invite/actions";

export const metadata: Metadata = { title: "Convite" };

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function InvitePage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) redirect("/login");

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in → carry token to login
  if (!user) redirect(`/login?invite=${token}`);

  // Onboarding not complete → carry token through onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) {
    redirect(`/onboarding/role?invite=${token}`);
  }

  // Fetch invite details
  const { data: invite } = await supabase
    .from("invites")
    .select("box_id, role, status, expires_at, boxes(name)")
    .eq("token", token)
    .single();

  if (!invite || invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
    return <InviteError message="Este convite é inválido ou já expirou." />;
  }

  const box = invite.boxes as unknown as { name: string };

  const roleLabel: Record<string, string> = {
    athlete: "Atleta",
    coach: "Coach",
    manager: "Gestor",
    owner: "Owner",
    partner: "Sócio",
  };

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path d="M6 18h24M18 6l12 12-12 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
        </svg>
      </div>

      <div className="max-w-sm space-y-2">
        <p className="label-caps text-white/45">Convite</p>
        <h1 className="font-display text-[2rem] uppercase leading-[0.95] text-white">
          Junta-te a<br />{box.name}
        </h1>
        <p className="text-sm text-white/60">
          Foste convidado como{" "}
          <span className="font-medium text-white">
            {roleLabel[invite.role] ?? invite.role}
          </span>.
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await acceptInvite(token);
        }}
        className="mt-8 w-full max-w-xs"
      >
        <button
          type="submit"
          className="w-full rounded-full bg-accent py-4 text-sm font-semibold text-accent-fg transition-opacity duration-150 hover:opacity-90"
        >
          Aceitar convite
        </button>
      </form>
    </div>
  );
}

function InviteError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10 ring-1 ring-error/20">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.75" className="text-error" />
          <path d="M10 10l8 8M18 10l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-error" />
        </svg>
      </div>
      <div className="space-y-1">
        <h1 className="font-display text-2xl uppercase text-white">Convite inválido</h1>
        <p className="text-sm text-white/60">{message}</p>
      </div>
      <a href="/" className="text-sm text-white/45 underline-offset-4 hover:text-white/70 hover:underline transition-colors duration-150">
        Voltar ao início
      </a>
    </div>
  );
}
