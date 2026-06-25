-- Associate wod_results with a specific class instance.
-- Nullable so existing rows and dashboard registrations (no class context) are unaffected.
ALTER TABLE public.wod_results
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS wod_results_class_id_idx ON public.wod_results (class_id);
