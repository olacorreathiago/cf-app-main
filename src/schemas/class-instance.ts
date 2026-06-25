import { z } from "zod";

export const specialClassSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  duration_minutes: z.number().int().min(15).max(300),
  capacity: z.number().int().min(1).max(500),
  coach_id: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const publishClassSchema = z.object({
  coach_id: z.string().uuid("Coach é obrigatório"),
  capacity: z.number().int().min(1).max(500),
});

export const cancelClassSchema = z.object({
  cancellation_reason: z.string().min(1, "Motivo é obrigatório").max(500),
});

export type SpecialClassInput = z.infer<typeof specialClassSchema>;
export type PublishClassInput = z.infer<typeof publishClassSchema>;
export type CancelClassInput = z.infer<typeof cancelClassSchema>;
