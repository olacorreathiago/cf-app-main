"use server";

import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { manualProvider } from "./provider-manual";
import type { Payment, PaymentMethod, PaymentStatus } from "./types";

async function assertStaffWrite(boxId: string) {
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
    .in("role", ["owner", "partner", "manager"])
    .maybeSingle();

  if (!data) throw new Error("Sem permissão.");
  return user;
}

const recordPaymentSchema = z.object({
  box_id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  kind: z.enum(["drop_in", "membership", "order", "platform"]),
  reference_id: z.string().uuid().nullable().optional(),
  amount: z.number().min(0),
  method: z.enum(["cash", "mbway", "transferencia", "multibanco", "card"]),
  period_start: z.string().nullable().optional(),
  period_end: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  slug: z.string(),
});

export async function recordPayment(input: z.infer<typeof recordPaymentSchema>) {
  const parsed = recordPaymentSchema.parse(input);
  const user = await assertStaffWrite(parsed.box_id);

  const payment = await manualProvider.createPayment({
    box_id: parsed.box_id,
    user_id: parsed.user_id,
    kind: parsed.kind,
    reference_id: parsed.reference_id,
    amount: parsed.amount,
    method: parsed.method,
    period_start: parsed.period_start,
    period_end: parsed.period_end,
    notes: parsed.notes,
  });

  await supabaseAdmin
    .from("payments")
    .update({ recorded_by: user.id })
    .eq("id", payment.id);

  revalidatePath(`/box/${parsed.slug}`);
  return { data: payment };
}

const markPaidSchema = z.object({
  payment_id: z.string().uuid(),
  box_id: z.string().uuid(),
  method: z.enum(["cash", "mbway", "transferencia", "multibanco", "card"]),
  notes: z.string().nullable().optional(),
  slug: z.string(),
});

export async function markPaymentPaid(input: z.infer<typeof markPaidSchema>) {
  const parsed = markPaidSchema.parse(input);
  const user = await assertStaffWrite(parsed.box_id);

  const payment = await manualProvider.markPaid({
    payment_id: parsed.payment_id,
    method: parsed.method,
    recorded_by: user.id,
    notes: parsed.notes,
  });

  revalidatePath(`/box/${parsed.slug}`);
  return { data: payment };
}

const cancelSchema = z.object({
  payment_id: z.string().uuid(),
  box_id: z.string().uuid(),
  slug: z.string(),
});

export async function cancelPayment(input: z.infer<typeof cancelSchema>) {
  const parsed = cancelSchema.parse(input);
  const user = await assertStaffWrite(parsed.box_id);
  const payment = await manualProvider.cancel(parsed.payment_id, user.id);
  revalidatePath(`/box/${parsed.slug}`);
  return { data: payment };
}

export async function getBoxPayments(
  boxId: string,
  filters?: {
    kind?: string;
    status?: PaymentStatus;
    periodStart?: string;
    periodEnd?: string;
  }
) {
  const supabase = await supabaseServer();
  let query = supabase
    .from("payments")
    .select("*, profiles:user_id(full_name, email, avatar_url)")
    .eq("box_id", boxId)
    .order("created_at", { ascending: false });

  if (filters?.kind) query = query.eq("kind", filters.kind);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.periodStart) query = query.gte("period_start", filters.periodStart);
  if (filters?.periodEnd) query = query.lte("period_start", filters.periodEnd);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getMemberPayments(userId: string, boxId: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .eq("box_id", boxId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Payment[];
}

export async function getMyPayments() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("payments")
    .select("*, boxes:box_id(name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getBillingData(boxId: string, year: number, month: number) {
  const supabase = await supabaseServer();
  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const [membersRes, paymentsRes, dropInPaymentsRes] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, user_id, plan_id, status, profiles:user_id(full_name, email, avatar_url), plans:plan_id(name, price, billing_interval)")
      .eq("box_id", boxId)
      .eq("role", "athlete")
      .in("status", ["active", "trial"])
      .not("plan_id", "is", null),
    supabase
      .from("payments")
      .select("*")
      .eq("box_id", boxId)
      .eq("kind", "membership")
      .gte("period_start", periodStart)
      .lt("period_start", periodEnd),
    supabase
      .from("payments")
      .select("*, profiles:user_id(full_name, email)")
      .eq("box_id", boxId)
      .eq("kind", "drop_in")
      .in("status", ["paid", "pending"])
      .gte("created_at", periodStart)
      .lt("created_at", periodEnd),
  ]);

  if (membersRes.error) throw new Error(membersRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);
  if (dropInPaymentsRes.error) throw new Error(dropInPaymentsRes.error.message);

  // Enrich drop-in payments with name/email from drop_ins table
  const dropInRefIds = (dropInPaymentsRes.data ?? [])
    .map((p) => (p as { reference_id: string | null }).reference_id)
    .filter(Boolean) as string[];

  let dropInInfoMap: Record<string, { name: string | null; email: string | null }> = {};
  if (dropInRefIds.length > 0) {
    const { data: dropInRows } = await supabaseAdmin
      .from("drop_ins")
      .select("id, name, email")
      .in("id", dropInRefIds);
    for (const d of dropInRows ?? []) {
      dropInInfoMap[d.id] = { name: d.name, email: d.email };
    }
  }

  const enrichedDropInPayments = (dropInPaymentsRes.data ?? []).map((p) => {
    const refId = (p as { reference_id: string | null }).reference_id;
    const info = refId ? dropInInfoMap[refId] : null;
    const profiles = (p as { profiles: { full_name: string | null; email: string | null } | null }).profiles;
    return {
      ...p,
      drop_in_name: info?.name ?? profiles?.full_name ?? null,
      drop_in_email: info?.email ?? profiles?.email ?? null,
    };
  });

  return {
    members: membersRes.data,
    payments: paymentsRes.data as Payment[],
    dropInPayments: enrichedDropInPayments,
  };
}

export async function upsertMembershipPayment(input: {
  box_id: string;
  user_id: string;
  membership_id: string;
  amount: number;
  method: PaymentMethod;
  period_start: string;
  period_end: string;
  slug: string;
}) {
  const user = await assertStaffWrite(input.box_id);

  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("box_id", input.box_id)
    .eq("user_id", input.user_id)
    .eq("kind", "membership")
    .eq("period_start", input.period_start)
    .maybeSingle();

  if (existing) {
    await manualProvider.markPaid({
      payment_id: existing.id,
      method: input.method,
      recorded_by: user.id,
    });
  } else {
    const payment = await manualProvider.createPayment({
      box_id: input.box_id,
      user_id: input.user_id,
      kind: "membership",
      reference_id: input.membership_id,
      amount: input.amount,
      method: input.method,
      period_start: input.period_start,
      period_end: input.period_end,
    });
    await supabaseAdmin
      .from("payments")
      .update({ recorded_by: user.id })
      .eq("id", payment.id);
  }

  revalidatePath(`/box/${input.slug}`);
  return { success: true };
}

export async function createDropInPayment(input: {
  box_id: string;
  user_id?: string | null;
  drop_in_id: string;
  amount: number;
}) {
  const payment = await manualProvider.createPayment({
    box_id: input.box_id,
    user_id: input.user_id,
    kind: "drop_in",
    reference_id: input.drop_in_id,
    amount: input.amount,
  });
  return payment;
}

export async function getDropInPayment(dropInId: string) {
  const { data } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("kind", "drop_in")
    .eq("reference_id", dropInId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as Payment | null;
}
