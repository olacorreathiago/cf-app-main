-- ============================================================================
-- 00012_wod_result_config.sql
-- Adds result configuration to wods and detailed result storage to wod_results
-- ============================================================================

-- wods: score_type (how results are ranked), sets config for For Load
ALTER TABLE public.wods
  ADD COLUMN IF NOT EXISTS score_type        public.score_type NOT NULL DEFAULT 'reps',
  ADD COLUMN IF NOT EXISTS result_sets       int CHECK (result_sets IS NULL OR result_sets > 0),
  ADD COLUMN IF NOT EXISTS result_reps_per_set int CHECK (result_reps_per_set IS NULL OR result_reps_per_set > 0);

-- wod_results: per-set/round breakdown + DNF flag
ALTER TABLE public.wod_results
  ADD COLUMN IF NOT EXISTS sets_data jsonb,
  ADD COLUMN IF NOT EXISTS dnf       boolean NOT NULL DEFAULT false;

-- Update existing For Time wods to use score_type = 'time'
UPDATE public.wods SET score_type = 'time'       WHERE type = 'For Time' AND score_type = 'reps';
UPDATE public.wods SET score_type = 'weight'     WHERE type = 'For Load' AND score_type = 'reps';
UPDATE public.wods SET score_type = 'rounds+reps' WHERE type = 'AMRAP'  AND score_type = 'reps';
