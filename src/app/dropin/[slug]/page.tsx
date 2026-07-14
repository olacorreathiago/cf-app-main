import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { DropInRegisterForm } from "./drop-in-register-form";

export const metadata: Metadata = { title: "Drop-in" };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DropInPublicPage({ params }: Props) {
  const { slug } = await params;

  const { data: box } = await supabaseAdmin
    .from("boxes")
    .select("id, name, slug, logo_url, drop_in_enabled, drop_in_price")
    .eq("slug", slug)
    .single();

  if (!box) notFound();

  const dropInEnabled = (box as unknown as { drop_in_enabled: boolean }).drop_in_enabled;
  if (!dropInEnabled) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg-base px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-card border border-border">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 3C8 3 3 8 3 14s5 11 11 11 11-5 11-11S20 3 14 3zm0 6v5m0 4v.5" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-text-primary">{box.name}</h1>
          <p className="text-sm text-text-tertiary">Drop-ins não estão disponíveis nesta box de momento.</p>
        </div>
      </main>
    );
  }

  // Check if user is already logged in — pre-fill data
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let prefill: { name: string | null; email: string | null; nickname: string | null } | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, nickname")
      .eq("id", user.id)
      .single();
    prefill = {
      name: profile?.full_name ?? null,
      email: user.email ?? null,
      nickname: (profile as unknown as { nickname: string | null } | null)?.nickname ?? null,
    };
  }

  // Upcoming classes (next 7 days)
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 86_400_000);
  const svNow = now.toLocaleString("sv", { timeZone: "Europe/Lisbon" });
  const nowIso = svNow.replace(" ", "T") + "Z";

  const { data: upcomingClasses } = await supabaseAdmin
    .from("classes")
    .select("id, name, starts_at, capacity")
    .eq("box_id", box.id)
    .eq("status", "scheduled")
    .gte("starts_at", nowIso)
    .lte("starts_at", in7days.toISOString())
    .not("name", "ilike", "%open gym%")
    .not("name", "ilike", "%open box%")
    .order("starts_at");

  const dropInPrice = (box as unknown as { drop_in_price: number | null }).drop_in_price;

  return (
    <main className="flex min-h-screen items-start justify-center bg-bg-base px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Box header */}
        <div className="text-center space-y-3">
          {(box as unknown as { logo_url: string | null }).logo_url ? (
            <img
              src={(box as unknown as { logo_url: string }).logo_url}
              alt={box.name}
              className="mx-auto h-16 w-16 rounded-2xl object-cover border border-border"
            />
          ) : (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-2xl font-bold text-accent border border-border">
              {box.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-text-primary">{box.name}</h1>
            <p className="text-sm text-text-tertiary">Registo de drop-in</p>
          </div>
          {dropInPrice != null && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-4 py-1.5 text-sm font-medium text-text-primary">
              {dropInPrice === 0 ? "Entrada gratuita" : `${dropInPrice.toFixed(2)} € / sessão`}
            </div>
          )}
        </div>

        <DropInRegisterForm
          boxId={box.id}
          slug={slug}
          prefill={prefill}
          isLoggedIn={!!user}
          upcomingClasses={upcomingClasses ?? []}
        />
      </div>
    </main>
  );
}
