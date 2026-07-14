import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Aula Experimental" };

interface Props {
  params: Promise<{ slug: string; trialId: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
  });
}

export default async function TrialConfirmationPage({ params }: Props) {
  const { slug, trialId } = await params;

  const { data: box } = await supabaseAdmin
    .from("boxes")
    .select("id, name, avatar_url")
    .eq("slug", slug)
    .single();

  if (!box) notFound();

  const { data: trial } = await supabaseAdmin
    .from("trials")
    .select("id, name, scheduled_for, status, class_id, classes(name, starts_at, duration_minutes, location)")
    .eq("id", trialId)
    .eq("box_id", box.id)
    .single();

  if (!trial) notFound();

  const cls = trial.classes as unknown as {
    name: string; starts_at: string; duration_minutes: number; location: string | null;
  } | null;

  const isCancelled = trial.status === "lost";

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        {/* Box identity */}
        <div className="flex flex-col items-center gap-3 text-center">
          {box.avatar_url ? (
            <img src={box.avatar_url} alt={box.name} className="h-14 w-14 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-xl font-bold text-accent">
              {box.name.charAt(0)}
            </div>
          )}
          <p className="text-sm font-medium text-text-secondary">{box.name}</p>
        </div>

        {/* Status card */}
        <div className={`rounded-2xl border p-6 text-center space-y-2 ${
          isCancelled ? "border-error/20 bg-error/5" : "border-border bg-bg-card"
        }`}>
          {isCancelled ? (
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M4 4l14 14M18 4L4 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-base font-semibold text-text-primary">Aula cancelada</p>
              <p className="text-sm text-text-tertiary">
                Entra em contacto com a box para reagendar.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M4 11.5l5 5L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-base font-semibold text-text-primary">Confirmado!</p>
              <p className="text-sm text-text-tertiary">
                Olá <span className="font-medium text-text-secondary">{trial.name}</span>, a tua aula experimental está marcada.
              </p>
            </>
          )}
        </div>

        {/* Class details */}
        {cls && !isCancelled && (
          <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1.5L2 4.5v4.5c0 3 2.4 5.5 5.5 5.5s5.5-2.5 5.5-5.5V4.5L7.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Aula</p>
                <p className="text-sm font-medium text-text-primary">{cls.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <circle cx="7.5" cy="8" r="5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M7.5 5.5v3l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Data e hora</p>
                <p className="text-sm font-medium text-text-primary capitalize">
                  {formatDate(cls.starts_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <circle cx="7.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M2.5 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Duração</p>
                <p className="text-sm font-medium text-text-primary">{cls.duration_minutes} minutos</p>
              </div>
            </div>

            {cls.location && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 1C5.015 1 3 3.015 3 5.5c0 3.375 4.5 8.5 4.5 8.5S12 8.875 12 5.5C12 3.015 9.985 1 7.5 1z" stroke="currentColor" strokeWidth="1.3" />
                    <circle cx="7.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">Local</p>
                  <p className="text-sm font-medium text-text-primary">{cls.location}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {!isCancelled && (
          <p className="text-center text-xs text-text-tertiary px-4">
            Chega uns minutos antes. Se precisares de cancelar, contacta a box diretamente.
          </p>
        )}
      </div>
    </main>
  );
}
