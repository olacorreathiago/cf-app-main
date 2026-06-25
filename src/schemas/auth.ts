import { z } from "zod";

export const magicLinkSchema = z.object({
  email: z
    .string()
    .min(1, "Introduz o teu email")
    .email("Email inválido"),
});

export type MagicLinkFormValues = z.infer<typeof magicLinkSchema>;
