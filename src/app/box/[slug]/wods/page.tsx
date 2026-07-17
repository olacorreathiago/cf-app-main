import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getBenchmarkWods, getWods } from "@/lib/box/wod-actions";
import { WodList } from "./wod-list";

export const metadata: Metadata = { title: "WODs" };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function WodsPage({ params }: Props) {
  const { slug } = await params;

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

  const [wods, benchmarks] = await Promise.all([
    getWods(box.id),
    getBenchmarkWods(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-7">
      <WodList wods={wods} benchmarks={benchmarks} boxId={box.id} />
    </main>
  );
}
