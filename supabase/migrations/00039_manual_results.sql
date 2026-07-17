-- Manual benchmark results: athletes can log a result achieved outside a class
-- (e.g. Karen done at home) for viewing/comparison in the PRs screen.
--
-- Global benchmark manual entry: wod_id NULL, box_id NULL, benchmark_slug set.
-- Box-custom benchmark manual entry: wod_id set, box_id set, class_id NULL.
-- is_manual = true marks rows registered outside a class.

ALTER TABLE public.wod_results ALTER COLUMN wod_id DROP NOT NULL;
ALTER TABLE public.wod_results ALTER COLUMN box_id DROP NOT NULL;

ALTER TABLE public.wod_results
  ADD COLUMN IF NOT EXISTS benchmark_slug text REFERENCES public.benchmark_wods(slug) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false;

-- Every result must point at a box WOD or a global benchmark
ALTER TABLE public.wod_results
  ADD CONSTRAINT wod_results_target_check CHECK (wod_id IS NOT NULL OR benchmark_slug IS NOT NULL);

CREATE INDEX IF NOT EXISTS wod_results_user_benchmark_idx
  ON public.wod_results (user_id, benchmark_slug);

-- RLS: the existing insert policy requires box_id IN my_box_ids(), which blocks
-- global manual rows (box_id IS NULL). Allow them explicitly.
CREATE POLICY "athlete can insert manual global result"
  ON public.wod_results FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_manual
    AND box_id IS NULL
    AND benchmark_slug IS NOT NULL
  );

-- Benchmark library: explicit score type so the app knows which input to show
-- for manual entry (time / weight / reps) without a linked box WOD.
ALTER TABLE public.benchmark_wods
  ADD COLUMN IF NOT EXISTS score_type public.score_type;

UPDATE public.benchmark_wods SET score_type = CASE
  WHEN type = 'For Time' THEN 'time'::public.score_type
  WHEN type = 'For Load' THEN 'weight'::public.score_type
  ELSE 'reps'::public.score_type
END
WHERE score_type IS NULL;

-- New benchmark categories for monostructural and gymnastics capacity tests.
-- (Seeded in the next migration — new enum values cannot be used in the same
-- transaction that creates them.)
ALTER TYPE public.wod_category ADD VALUE IF NOT EXISTS 'endurance';
ALTER TYPE public.wod_category ADD VALUE IF NOT EXISTS 'gymnastics';
