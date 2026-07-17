import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getBillingData } from "@/lib/payments/actions";
import { BillingClient } from "./billing-client";

export const metadata: Metadata = { title: "Faturação" };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BillingPage({ params }: Props) {
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

  const now = new Date();
  const initialData = await getBillingData(box.id, now.getFullYear(), now.getMonth() + 1);

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:py-12">
      <div className="mb-8">
        <p className="label-caps text-text-tertiary mb-1">Financeiro</p>
        <h1 className="font-display text-3xl uppercase text-text-primary">Faturação</h1>
      </div>

      <BillingClient
        boxId={box.id}
        slug={slug}
        initialYear={now.getFullYear()}
        initialMonth={now.getMonth() + 1}
        initialData={initialData}
      />
    </div>
  );
}
