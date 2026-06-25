import { z } from "zod";

export const classTemplateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  weekday: z.number().int().min(0).max(6),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  duration_minutes: z.number().int().min(15).max(300),
  capacity: z.number().int().min(1).max(500),
  active: z.boolean(),
});

export type ClassTemplateInput = z.infer<typeof classTemplateSchema>;
