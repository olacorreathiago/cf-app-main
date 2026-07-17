import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPlans } from "@/lib/box/plan-actions";
import { PlansClient } from "./plans-client";

export const metadata: Metadata = { title: "Planos" };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PlansPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/athlete");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .in("role", ["owner", "partner"])
    .maybeSingle();

  if (!membership) redirect(`/box/${slug}`);

  const plans = await getPlans(box.id);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:py-12">
      <div className="mb-8">
        <p className="label-caps text-text-tertiary mb-1">Financeiro</p>
        <h1 className="font-display text-3xl uppercase text-text-primary">Planos</h1>
      </div>

      <PlansClient plans={plans} boxId={box.id} slug={slug} />
    </div>
  );
}
