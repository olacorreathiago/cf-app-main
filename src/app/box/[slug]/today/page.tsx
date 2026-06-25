import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getCoachTodayData } from "@/lib/box/coach-today-actions";
import { ClassCardClient } from "./class-card-client";
import { RefreshButton } from "./refresh-button";

export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CoachTodayPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/dashboard");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .in("role", ["owner", "partner", "manager", "coach"])
    .maybeSingle();

  if (!membership) redirect("/dashboard");

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
    <div className="mx-auto w-full max-w-xl px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary capitalize">{today}</h1>
          <p className="text-sm text-text-tertiary">
            {classes.length === 0
              ? "Sem aulas hoje"
              : `${classes.length} aula${classes.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <RefreshButton />
      </div>

      {classes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-bg-card p-8 text-center">
          <p className="text-sm text-text-tertiary">Sem aulas publicadas para hoje.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => (
            <ClassCardClient key={cls.id} cls={cls} slug={slug} boxId={box.id} coaches={coaches} />
          ))}
        </div>
      )}
    </div>
  );
}
