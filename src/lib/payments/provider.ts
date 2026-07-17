import type {
  CreatePaymentInput,
  MarkPaidInput,
  Payment,
} from "./types";

export interface PaymentProviderAdapter {
  createPayment(input: CreatePaymentInput): Promise<Payment>;

  markPaid(input: MarkPaidInput): Promise<Payment>;

  cancel(paymentId: string, cancelledBy: string): Promise<Payment>;

  refund(paymentId: string, refundedBy: string): Promise<Payment>;
}
