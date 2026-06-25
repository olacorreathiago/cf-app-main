import { z } from "zod";

export const boxInfoSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  address: z.string().max(300).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  website: z.string().url("URL inválido").optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export const boxOperationalSchema = z.object({
  cancellation_window_hours: z.number().int().min(0).max(168),
  booking_advance_days: z.number().int().min(1).max(60),
  default_capacity: z.number().int().min(1).max(500),
  max_waitlist: z.number().int().min(0).max(50),
  drop_in_enabled: z.boolean(),
  drop_in_price: z.number().min(0).max(999).optional().nullable(),
});

export type BoxInfoInput = z.infer<typeof boxInfoSchema>;
export type BoxOperationalInput = z.infer<typeof boxOperationalSchema>;
