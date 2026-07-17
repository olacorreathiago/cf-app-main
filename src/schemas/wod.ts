import { z } from "zod";

export const WOD_TYPES = ["AMRAP", "For Time", "For Load", "EMOM", "Tabata", "Custom"] as const;
export const WOD_CATEGORIES = ["girls", "heroes", "notables", "games", "weightlifting", "endurance", "gymnastics", "original"] as const;
export const SCORE_TYPES = ["time", "reps", "weight", "rounds+reps", "distance", "round-best", "round-total", "round-worst", "round-reps"] as const;

export type WodType = (typeof WOD_TYPES)[number];
export type WodCategory = (typeof WOD_CATEGORIES)[number];
export type ScoreType = (typeof SCORE_TYPES)[number];

/** Default score_type for each wod_type — drives leaderboard sort direction */
export const DEFAULT_SCORE_TYPE: Record<WodType, ScoreType> = {
  AMRAP:      "rounds+reps",
  "For Time": "time",
  "For Load": "weight",
  EMOM:       "reps",
  Tabata:     "reps",
  Custom:     "reps",
};

/** true = higher is better; false = lower is better */
export const SCORE_DIRECTION: Record<ScoreType, boolean> = {
  time:           false,
  reps:           true,
  weight:         true,
  "rounds+reps":  true,
  distance:       true,
  "round-best":   false, // lower round time = better
  "round-total":  false, // lower total time = better
  "round-worst":  true,  // higher worst round = better endurance
  "round-reps":   true,  // higher total reps across rounds = better
};

export const movementSchema = z.object({
  name:           z.string().min(1),
  rx_weight:      z.string().optional(),
  scaled_weight:  z.string().optional(),
  distance_m:     z.number().int().positive().optional(),
  video_url:      z.string().url().optional(),
});

export type Movement = z.infer<typeof movementSchema>;

export const wodSchema = z.object({
  title:               z.string().min(1, "Título é obrigatório").max(200),
  type:                z.enum(WOD_TYPES),
  category:            z.enum(WOD_CATEGORIES),
  score_type:          z.enum(SCORE_TYPES),
  benchmark_slug:      z.string().nullable(),
  is_benchmark:        z.boolean(),
  description:         z.string().max(5000).nullable(),
  time_cap_minutes:    z.number().int().min(1).max(300).nullable(),
  movements:           z.array(movementSchema),
  scaling_notes:       z.string().max(3000).nullable(),
  scheduled_for:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  result_sets:         z.number().int().min(1).max(20).nullable(),
  result_reps_per_set: z.number().int().min(1).max(100).nullable(),
});

export type WodInput = z.infer<typeof wodSchema>;

export const wodResultSchema = z.object({
  wod_id:        z.string().uuid(),
  score_type:    z.enum(SCORE_TYPES),
  score_value:   z.number().positive().nullable(),
  score_display: z.string().max(50).nullable(),
  rx:            z.boolean(),
  notes:         z.string().max(1000).nullable(),
});

export type WodResultInput = z.infer<typeof wodResultSchema>;
