import { z } from "zod";

export const setSchema = z.object({
  set:    z.number().int().min(1),
  reps:   z.number().int().min(0),
  weight: z.number().min(0).optional(),
});

export const roundSchema = z.object({
  round: z.number().int().min(1),
  reps:  z.number().int().min(0),
});

export const wodResultSchema = z.object({
  wod_id:        z.string().uuid(),
  box_id:        z.string().uuid(),
  class_id:      z.string().uuid().optional().nullable(),
  score_type:    z.enum(["time", "reps", "weight", "rounds+reps", "distance", "round-best", "round-total", "round-worst", "round-reps"]),
  score_value:   z.number().nullable(),
  score_display: z.string().min(1),
  rx:            z.boolean(),
  dnf:           z.boolean().optional(),
  notes:         z.string().max(500).optional(),
  sets_data:     z.array(z.union([setSchema, roundSchema])).optional(),
});

export type WodResultInput = z.infer<typeof wodResultSchema>;
