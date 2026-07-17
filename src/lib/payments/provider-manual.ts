import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PaymentProviderAdapter } from "./provider";
import type {
  CreatePaymentInput,
  MarkPaidInput,
  Payment,
} from "./types";

export const manualProvider: PaymentProviderAdapter = {
  async createPayment(input) {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .insert({
        box_id: input.box_id,
        user_id: input.user_id ?? null,
        kind: input.kind,
        reference_id: input.reference_id ?? null,
        amount: input.amount,
        currency: input.currency ?? "EUR",
        provider: "manual",
        method: input.method ?? null,
        status: input.method ? "paid" : "pending",
        paid_at: input.method ? new Date().toISOString() : null,
        period_start: input.period_start ?? null,
        period_end: input.period_end ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? "Erro ao criar pagamento.");
    return data as Payment;
  },

  async markPaid(input) {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .update({
        status: "paid",
        method: input.method,
        paid_at: new Date().toISOString(),
        recorded_by: input.recorded_by,
        notes: input.notes ?? undefined,
      })
      .eq("id", input.payment_id)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? "Erro ao registar pagamento.");
    return data as Payment;
  },

  async cancel(paymentId, cancelledBy) {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .update({
        status: "cancelled",
        recorded_by: cancelledBy,
      })
      .eq("id", paymentId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? "Erro ao cancelar pagamento.");
    return data as Payment;
  },

  async refund(paymentId, refundedBy) {
    const { data, error } = await supabaseAdmin
      .from("payments")
      .update({
        status: "refunded",
        recorded_by: refundedBy,
      })
      .eq("id", paymentId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? "Erro ao reembolsar pagamento.");
    return data as Payment;
  },
};
