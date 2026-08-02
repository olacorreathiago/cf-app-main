import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { RecoverAccountButton } from "./recover-account-button";

export const metadata: Metadata = { title: "Conta Agendada para Exclusão" };

export default async function DeletedAccountPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("deleted_at")
    .eq("id", user.id)
    .single();

  if (!profile?.deleted_at) redirect("/athlete");

  const purgeDate = new Date(profile.deleted_at);
  purgeDate.setDate(purgeDate.getDate() + 30);

  return (
    <div className="flex h-full items-center justify-center px-6 py-16">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-error/10 text-error">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M6 6h12M9.5 6V4.5A1 1 0 0110.5 3.5h3a1 1 0 011 1V6M7.5 6v13a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl uppercase text-text-primary">
            Conta agendada para exclusão
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            A tua conta e os teus dados pessoais serão anonimizados a{" "}
            {format(purgeDate, "d 'de' MMMM 'de' yyyy", { locale: pt })}. Até lá, podes
            recuperar a conta a qualquer momento.
          </p>
        </div>

        <RecoverAccountButton />
      </div>
    </div>
  );
}
