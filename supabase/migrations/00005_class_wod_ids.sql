-- =============================================================================
-- 00005_class_wod_ids.sql
-- Replace classes.wod_id (single FK) with classes.wod_ids (uuid array)
-- to support multiple WOD blocks per class (e.g. Strength + Conditioning).
-- =============================================================================

-- Add the new array column
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS wod_ids uuid[] NOT NULL DEFAULT '{}';

-- Migrate existing single wod_id values into the array
UPDATE public.classes
  SET wod_ids = ARRAY[wod_id]
  WHERE wod_id IS NOT NULL;

-- Drop the old column (cascade drops any dependent index/constraint)
ALTER TABLE public.classes
  DROP COLUMN IF EXISTS wod_id;

-- Index for array containment queries (e.g. find classes that contain a given wod)
CREATE INDEX IF NOT EXISTS classes_wod_ids_gin_idx
  ON public.classes USING gin (wod_ids);
