-- =============================================================================
-- 00003_class_templates.sql
-- Adds draft status, class templates, and schedule generation support
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Add 'draft' to class_status enum
-- (PostgreSQL requires adding values with ALTER TYPE)
-- -----------------------------------------------------------------------------
ALTER TYPE public.class_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'scheduled';

-- -----------------------------------------------------------------------------
-- class_templates — recurring weekly schedule blueprints
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_templates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id           uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  name             text NOT NULL,              -- ex: "CrossFit", "Open Gym"
  weekday          int  NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sun … 6=Sat
  start_time       time NOT NULL,              -- ex: '07:00'
  duration_minutes int  NOT NULL DEFAULT 60,
  capacity         int  NOT NULL DEFAULT 20,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Extend classes table
-- -----------------------------------------------------------------------------
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.class_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_special  boolean NOT NULL DEFAULT false;

-- Partial unique index: one instance per template per starts_at timestamp.
-- Since a template has a fixed start_time, the same template on the same day
-- always produces the same starts_at, so this prevents duplicates without
-- requiring a timezone-dependent expression (which would be non-immutable).
CREATE UNIQUE INDEX IF NOT EXISTS classes_template_starts_uidx
  ON public.classes (template_id, starts_at)
  WHERE template_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- RLS — class_templates
-- Mirrors the pattern used on other box-scoped tables.
-- -----------------------------------------------------------------------------
ALTER TABLE public.class_templates ENABLE ROW LEVEL SECURITY;

-- Staff (owner/partner/manager/coach) can read templates of their box
CREATE POLICY "staff can view class templates"
  ON public.class_templates FOR SELECT
  USING (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

-- Only owner/partner/manager can create/update/delete templates
CREATE POLICY "managers can insert class templates"
  ON public.class_templates FOR INSERT
  WITH CHECK (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

CREATE POLICY "managers can update class templates"
  ON public.class_templates FOR UPDATE
  USING  (public.has_box_role(box_id, 'owner', 'partner', 'manager'))
  WITH CHECK (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

CREATE POLICY "managers can delete class templates"
  ON public.class_templates FOR DELETE
  USING (public.has_box_role(box_id, 'owner', 'partner', 'manager'));
