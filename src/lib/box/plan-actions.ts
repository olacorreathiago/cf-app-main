"use server";

import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function assertManager(boxId: string) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", boxId)
    .in("role", ["owner", "partner"])
    .maybeSingle();

  if (!data) throw new Error("Sem permissão.");
  return user;
}

export interface Plan {
  id: string;
  box_id: string;
  name: string;
  price: number;
  billing_interval: "monthly" | "annual";
  classes_per_week: number | null;
  active: boolean;
  created_at: string;
  _member_count?: number;
}

export async function getPlans(boxId: string): Promise<Plan[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("box_id", boxId)
    .order("active", { ascending: false })
    .order("name");

  if (error) throw new Error(error.message);

  const { data: counts } = await supabase
    .from("memberships")
    .select("plan_id")
    .eq("box_id", boxId)
    .eq("role", "athlete")
    .in("status", ["active", "trial"])
    .not("plan_id", "is", null);

  const countMap: Record<string, number> = {};
  for (const m of counts ?? []) {
    if (m.plan_id) countMap[m.plan_id] = (countMap[m.plan_id] ?? 0) + 1;
  }

  return (data ?? []).map((p) => ({
    ...p,
    _member_count: countMap[p.id] ?? 0,
  })) as Plan[];
}

const createPlanSchema = z.object({
  box_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  billing_interval: z.enum(["monthly", "annual"]),
  classes_per_week: z.number().int().min(1).nullable(),
  slug: z.string(),
});

export async function createPlan(input: z.infer<typeof createPlanSchema>) {
  const parsed = createPlanSchema.parse(input);
  await assertManager(parsed.box_id);

  const { data, error } = await supabaseAdmin
    .from("plans")
    .insert({
      box_id: parsed.box_id,
      name: parsed.name,
      price: parsed.price,
      billing_interval: parsed.billing_interval,
      classes_per_week: parsed.classes_per_week,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/box/${parsed.slug}/plans`);
  return { data: data as Plan };
}

const updatePlanSchema = z.object({
  id: z.string().uuid(),
  box_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  price: z.number().min(0),
  billing_interval: z.enum(["monthly", "annual"]),
  classes_per_week: z.number().int().min(1).nullable(),
  slug: z.string(),
});

export async function updatePlan(input: z.infer<typeof updatePlanSchema>) {
  const parsed = updatePlanSchema.parse(input);
  await assertManager(parsed.box_id);

  const { error } = await supabaseAdmin
    .from("plans")
    .update({
      name: parsed.name,
      price: parsed.price,
      billing_interval: parsed.billing_interval,
      classes_per_week: parsed.classes_per_week,
    })
    .eq("id", parsed.id)
    .eq("box_id", parsed.box_id);

  if (error) return { error: error.message };
  revalidatePath(`/box/${parsed.slug}/plans`);
  return {};
}

export async function togglePlanActive(planId: string, boxId: string, active: boolean, slug: string) {
  await assertManager(boxId);

  if (!active) {
    const { count } = await supabaseAdmin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", planId)
      .eq("box_id", boxId)
      .in("status", ["active", "trial"]);

    if ((count ?? 0) > 0) {
      return { error: `Este plano tem ${count} membro(s) associado(s). Será desativado mas os membros mantêm o plano.` };
    }
  }

  const { error } = await supabaseAdmin
    .from("plans")
    .update({ active })
    .eq("id", planId)
    .eq("box_id", boxId);

  if (error) return { error: error.message };
  revalidatePath(`/box/${slug}/plans`);
  return {};
}

export async function deletePlan(planId: string, boxId: string, slug: string) {
  await assertManager(boxId);

  const { count } = await supabaseAdmin
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", planId)
    .eq("box_id", boxId)
    .in("status", ["active", "trial"]);

  if ((count ?? 0) > 0) {
    return { error: "Não é possível eliminar um plano com membros associados. Desativa-o em vez disso." };
  }

  const { error } = await supabaseAdmin
    .from("plans")
    .delete()
    .eq("id", planId)
    .eq("box_id", boxId);

  if (error) return { error: error.message };
  revalidatePath(`/box/${slug}/plans`);
  return {};
}

export async function assignPlan(
  membershipId: string,
  planId: string | null,
  boxId: string,
  slug: string
) {
  await assertManager(boxId);

  const { error } = await supabaseAdmin
    .from("memberships")
    .update({ plan_id: planId })
    .eq("id", membershipId)
    .eq("box_id", boxId);

  if (error) return { error: error.message };
  revalidatePath(`/box/${slug}`);
  return {};
}
