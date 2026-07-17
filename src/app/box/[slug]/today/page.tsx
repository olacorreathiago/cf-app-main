import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCoachTodayData } from "@/lib/box/coach-today-actions";
import { ClassCardClient } from "./class-card-client";


export const metadata: Metadata = { title: "Hoje" };

export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ open?: string }>;
}

export default async function CoachTodayPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { open: openClassId } = await searchParams;
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/athlete");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .in("role", ["owner", "partner", "manager", "coach"])
    .maybeSingle();

  if (!membership) redirect("/athlete");

  const [classes, coachMemberships] = await Promise.all([
    getCoachTodayData(box.id),
    supabaseAdmin
      .from("memberships")
      .select("user_id, profiles(id, full_name)")
      .eq("box_id", box.id)
      .eq("status", "active")
      .in("role", ["owner", "partner", "manager", "coach"]),
  ]);

  type Coach = { id: string; full_name: string | null };
  const coaches: Coach[] = (coachMemberships.data ?? [])
    .map((m) => {
      const p = m.profiles as unknown as { id: string; full_name: string | null } | null;
      if (!p) return null;
      return { id: p.id, full_name: p.full_name };
    })
    .filter((c): c is Coach => c !== null);

  const today = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-7 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase text-text-primary">{today}</h1>
          <p className="label-caps mt-1 text-text-tertiary">
            {classes.length === 0
              ? "Sem aulas hoje"
              : `${classes.length} aula${classes.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href={`/box/${slug}/schedule`}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-text-tertiary hover:text-text-primary"
        >
          Ver agenda completa
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6h6M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-bg-card px-5 py-12 text-center space-y-3">
          <p className="text-sm text-text-tertiary">Sem aulas publicadas hoje</p>
          <Link
            href={`/box/${slug}/classes`}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-text-tertiary hover:text-text-primary"
          >
            Publicar aulas
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="6" width="2.5" height="4" rx="1" stroke="currentColor" strokeWidth="1.35" />
              <rect x="12.5" y="6" width="2.5" height="4" rx="1" stroke="currentColor" strokeWidth="1.35" />
              <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => (
            <ClassCardClient
              key={cls.id}
              cls={cls}
              slug={slug}
              boxId={box.id}
              coaches={coaches}
              autoOpenCheckIn={openClassId === cls.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
