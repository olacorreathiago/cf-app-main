import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WeeklyGrid } from "./weekly-grid";
import type { ClassTemplate, BoxSettings } from "@/types";

export const metadata: Metadata = { title: "Horário" };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SchedulePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name, settings")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/dashboard");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .in("role", ["owner", "partner", "manager"])
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const [{ data: templates }] = await Promise.all([
    supabase
      .from("class_templates")
      .select("*")
      .eq("box_id", box.id)
      .order("weekday")
      .order("start_time"),
  ]);

  const settings = (box.settings as BoxSettings) ?? {};
  const modalities = settings.modalities ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">Agenda semanal</h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          Templates de aulas recorrentes. Clica num template para editar.
        </p>
      </div>

      {modalities.length === 0 && (
        <div className="mb-5 rounded-xl border border-border bg-bg-card px-4 py-3 flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-tertiary">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-text-secondary">
            Define as{" "}
            <a href={`/box/${slug}/settings`} className="underline hover:text-text-primary transition-colors">
              modalidades da box
            </a>{" "}
            nas Definições para as seleccionar ao criar templates.
          </p>
        </div>
      )}

      <WeeklyGrid
        boxId={box.id}
        templates={(templates ?? []) as ClassTemplate[]}
        modalities={modalities}
      />
    </main>
  );
}
