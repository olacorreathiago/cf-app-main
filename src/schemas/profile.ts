import { z } from "zod";

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  nickname: z.string().max(40).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  height_cm: z
    .number({ error: "Altura inválida" })
    .int()
    .min(80)
    .max(260)
    .optional()
    .nullable(),
  nationality: z.string().max(60).optional().or(z.literal("")),
  tax_id: z.string().max(20).optional().or(z.literal("")),
  emergency_contact: z.string().max(100).optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
