-- 00043_wod_results_late.sql
-- Tracks whether a wod_result was logged/edited on a calendar day after the
-- class it belongs to (classes.starts_at is the authoritative "result date").
-- "Tardio" results still count for leaderboard/PRs display but are excluded
-- once scoring/points exist (see src/lib/athlete/leaderboard-actions.ts).

-- ── updated_at ─────────────────────────────────────────────────────────────

alter table public.wod_results
  add column if not exists updated_at timestamptz not null default now();

-- Backfill: for existing rows, updated_at = recorded_at (best available signal).
-- Safe to run unconditionally — this only executes once, at migration time.
update public.wod_results set updated_at = recorded_at;

create or replace function public.set_wod_results_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_wod_results_updated_at on public.wod_results;
create trigger trg_wod_results_updated_at
  before update on public.wod_results
  for each row execute function public.set_wod_results_updated_at();

-- ── logged_late ────────────────────────────────────────────────────────────

alter table public.wod_results
  add column if not exists logged_late boolean not null default false;

create index if not exists idx_wod_results_class_id
  on public.wod_results (class_id);
