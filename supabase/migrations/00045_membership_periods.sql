-- 00045_membership_periods.sql
-- Soft member removal + period tracking.
--
-- removeMember() used to hard-delete the membership row. That lost the
-- athlete's tenure history (created_at, notes, role) on re-invite, and
-- broke a subtler thing: a removed-then-rejoined athlete would have their
-- old paid months resurface as if continuous, with no way to tell "was
-- actually a member" from "wasn't". This migration:
--   1. Makes removal a status flip (removed_at/removed_by) instead of a delete.
--   2. Adds membership_periods — one row per contiguous stint — so billing
--      history can tell the difference between "member, unpaid" (overdue)
--      and "not a member that month" (gap, nothing shown).
-- Only staff removal (removed_at) opens/closes a period. Suspension and
-- box closure keep today's behavior unchanged — they don't touch periods,
-- see the trigger below for why.

alter table public.memberships add column if not exists removed_at timestamptz;
alter table public.memberships add column if not exists removed_by uuid references public.profiles(id);

create table if not exists public.membership_periods (
  id            uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists membership_periods_membership_id_idx
  on public.membership_periods (membership_id);
create index if not exists membership_periods_open_idx
  on public.membership_periods (membership_id) where ended_at is null;

alter table public.membership_periods enable row level security;

drop policy if exists "membership_periods_select_staff" on public.membership_periods;
create policy "membership_periods_select_staff"
  on public.membership_periods for select
  using (
    exists (
      select 1 from public.memberships m
      where m.id = membership_periods.membership_id
        and public.has_box_role(m.box_id, 'owner', 'partner', 'manager')
    )
  );

-- Backfill: one open-ended period per existing membership, anchored at
-- created_at. Gaps from removals that already happened under the old
-- hard-delete behavior can't be reconstructed — this only prevents new
-- gaps going forward.
insert into public.membership_periods (membership_id, started_at, ended_at)
select id, created_at, null
from public.memberships m
where not exists (
  select 1 from public.membership_periods mp where mp.membership_id = m.id
);

-- ── Triggers: keep membership_periods in sync ───────────────────────────────

create or replace function public.membership_period_on_insert()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('active', 'trial') then
    insert into public.membership_periods (membership_id, started_at) values (new.id, now());
  end if;
  return new;
end;
$$;

drop trigger if exists memberships_period_on_insert on public.memberships;
create trigger memberships_period_on_insert
  after insert on public.memberships
  for each row execute procedure public.membership_period_on_insert();

create or replace function public.membership_period_on_update()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    -- Staff removal → close the open period.
    if new.status = 'inactive' and new.removed_at is not null and old.removed_at is null then
      update public.membership_periods
        set ended_at = now()
        where membership_id = old.id and ended_at is null;
    end if;

    -- Re-included after a staff removal (via the same upsert every
    -- invite/join path already uses) → open a fresh period, clear the
    -- removal marker. Reactivating from 'suspended' does NOT match this
    -- branch on purpose: suspension never closed a period, so there's
    -- nothing to reopen — today's behavior for that path is unchanged.
    if old.status = 'inactive' and old.removed_at is not null and new.status in ('active', 'trial') then
      insert into public.membership_periods (membership_id, started_at) values (new.id, now());
      new.removed_at := null;
      new.removed_by := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists memberships_period_on_update on public.memberships;
create trigger memberships_period_on_update
  before update on public.memberships
  for each row execute procedure public.membership_period_on_update();
