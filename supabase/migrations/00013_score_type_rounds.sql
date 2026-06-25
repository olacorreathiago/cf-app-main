-- Add two new score types for round-based timing:
--   round-best  → N rounds, each timed; result = best (or worst) round
--   round-total → N rounds, each timed; result = sum of all round times
ALTER TYPE public.score_type ADD VALUE IF NOT EXISTS 'round-best';
ALTER TYPE public.score_type ADD VALUE IF NOT EXISTS 'round-total';
ALTER TYPE public.score_type ADD VALUE IF NOT EXISTS 'round-worst';
