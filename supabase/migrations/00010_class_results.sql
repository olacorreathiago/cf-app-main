-- Allow class-level results (no WOD required).
-- wod_id becomes nullable; class_id added as optional reference.
alter table public.wod_results
  alter column wod_id drop not null;

alter table public.wod_results
  add column if not exists class_id uuid references public.classes(id) on delete set null;

create index if not exists wod_results_class_id_idx on public.wod_results (class_id);
