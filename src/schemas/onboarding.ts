import { z } from "zod";

export const createBoxSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(80),
  slug: z
    .string()
    .min(2, "O slug deve ter pelo menos 2 caracteres")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
  city: z.string().min(2, "A cidade é obrigatória").max(80),
  phone: z.string().max(20).optional(),
});

export type CreateBoxValues = z.infer<typeof createBoxSchema>;

export const athleteOnboardingSchema = z.object({
  fullName: z
    .string()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(80, "Nome demasiado longa"),
  nickname: z.string().max(30, "Alcunha demasiado longa").optional(),
  gender: z.enum(["male", "female"]).nullable().optional(),
});

export type AthleteOnboardingValues = z.infer<typeof athleteOnboardingSchema>;

export const professionalOnboardingSchema = z.object({
  fullName: z
    .string()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(80, "Nome demasiado longo"),
  professionalId: z
    .string()
    .min(1, "A cédula profissional é obrigatória")
    .max(30, "Cédula demasiado longa"),
  phone: z
    .string()
    .min(9, "Contacto inválido")
    .max(20, "Contacto demasiado longo"),
  gender: z.enum(["male", "female"]).nullable().optional(),
});

export type ProfessionalOnboardingValues = z.infer<typeof professionalOnboardingSchema>;
