import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { joinBoxByToken } from "@/lib/invite/actions";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { token } = await params;

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/login?join=${token}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) {
    redirect(`/onboarding/role?join=${token}`);
  }

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name, approval_status")
    .eq("join_token", token)
    .single();

  if (!box || box.approval_status !== "approved") {
    return <JoinError message="Este link de convite é inválido ou a box ainda não está ativa." />;
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("memberships")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .maybeSingle();

  if (existing) {
    return <AlreadyMember boxName={box.name} status={existing.status} />;
  }

  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path d="M6 18c0-6.627 5.373-12 12-12s12 5.373 12 12-5.373 12-12 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-accent" />
          <path d="M18 22l4-4-4-4M22 18H10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
        </svg>
      </div>

      <div className="max-w-sm space-y-2">
        <p className="label-caps text-text-tertiary">Convite</p>
        <h1 className="font-display text-[2rem] leading-[0.95] text-text-primary">
          Junta-te a<br />{box.name}
        </h1>
        <p className="text-sm text-text-secondary">
          Vais entrar como <span className="font-medium text-text-primary">Atleta</span>.
          O teu papel pode ser alterado pelo gestor depois.
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await joinBoxByToken(token);
        }}
        className="mt-8 w-full max-w-xs"
      >
        <button
          type="submit"
          className="w-full rounded-full bg-accent py-4 text-sm font-semibold text-accent-fg transition-opacity duration-150 hover:opacity-90"
        >
          Entrar na box
        </button>
      </form>
    </div>
  );
}

function AlreadyMember({ boxName, status }: { boxName: string; status: string }) {
  const isSuspended = status === "suspended";
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.75" className="text-accent" />
          <path d="M9 14l3 3 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
        </svg>
      </div>
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-text-primary">Já és membro</h1>
        <p className="text-sm text-text-secondary">
          {isSuspended
            ? `A tua conta em ${boxName} está suspensa. Contacta o gestor.`
            : `Já fazes parte de ${boxName}.`}
        </p>
      </div>
      <a
        href="/dashboard"
        className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90"
      >
        Ir para o dashboard
      </a>
    </div>
  );
}

function JoinError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10 ring-1 ring-error/20">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.75" className="text-error" />
          <path d="M10 10l8 8M18 10l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-error" />
        </svg>
      </div>
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-text-primary">Link inválido</h1>
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
      <a href="/" className="text-sm text-text-tertiary underline-offset-4 hover:text-text-secondary hover:underline transition-colors duration-150">
        Voltar ao início
      </a>
    </div>
  );
}
