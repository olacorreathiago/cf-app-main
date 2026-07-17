export type PaymentKind = "drop_in" | "membership" | "order" | "platform";
export type PaymentMethod = "cash" | "mbway" | "transferencia" | "multibanco" | "card";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";
export type PaymentProvider = "manual" | "stripe" | "ifthenpay";

export interface Payment {
  id: string;
  box_id: string | null;
  user_id: string | null;
  kind: PaymentKind;
  reference_id: string | null;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  method: PaymentMethod | null;
  status: PaymentStatus;
  provider_payment_id: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreatePaymentInput {
  box_id: string;
  user_id?: string | null;
  kind: PaymentKind;
  reference_id?: string | null;
  amount: number;
  currency?: string;
  method?: PaymentMethod | null;
  period_start?: string | null;
  period_end?: string | null;
  notes?: string | null;
}

export interface MarkPaidInput {
  payment_id: string;
  method: PaymentMethod;
  recorded_by: string;
  notes?: string | null;
}
