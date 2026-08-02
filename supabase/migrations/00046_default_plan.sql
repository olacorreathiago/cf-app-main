-- 00046_default_plan.sql
-- Box-level default plan. New members joining (via invite link, accepted
-- email invite, or direct add) get this plan automatically so they always
-- have a plan_id — without one, bookClass() applies no classes_per_week
-- limit at all, letting an unassigned "ghost" member book unlimited
-- classes with nothing billed. The manager still has to correct the plan
-- to the real one afterwards; this is just a safe non-null fallback until
-- the box has real self-service plan selection at signup.

alter table public.boxes add column if not exists default_plan_id uuid references public.plans(id) on delete set null;
