import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getBoxClosureSummary } from "@/lib/box/closure-actions";
import { CloseBoxScreen } from "./close-box-screen";

export const metadata: Metadata = { title: "Encerrar Box" };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CloseBoxPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name, deleted_at")
    .eq("slug", slug)
    .single();
  if (!box) redirect("/athlete");
  if (box.deleted_at) redirect(`/box/${slug}/settings`);

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .eq("role", "owner")
    .maybeSingle();
  if (!membership) redirect(`/box/${slug}/settings`);

  const summary = await getBoxClosureSummary(box.id);

  return <CloseBoxScreen slug={slug} boxId={box.id} summary={summary} />;
}
