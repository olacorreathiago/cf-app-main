-- 00049_member_notes.sql
-- Internal member notes become a timeline: one row per note instead of a
-- single text column on memberships. Each note keeps its author and date;
-- staff can only delete the notes they wrote (enforced in the server action,
-- which writes through the service role — RLS here is read-only for staff).
--
-- memberships.notes is left in place (no longer read by the app) so this
-- migration is non-destructive; the existing note is copied over as the
-- first timeline entry, with no author.

create table if not exists public.member_notes (
  id            uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  box_id        uuid not null references public.boxes(id) on delete cascade,
  author_id     uuid references public.profiles(id) on delete set null,
  body          text not null check (length(btrim(body)) > 0),
  created_at    timestamptz not null default now()
);

create index if not exists member_notes_membership_idx
  on public.member_notes (membership_id, created_at desc);

alter table public.member_notes enable row level security;

drop policy if exists "member_notes_select_staff" on public.member_notes;
create policy "member_notes_select_staff"
  on public.member_notes for select
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

-- Backfill: existing single note → first entry (dated at the membership's
-- creation, since the original edit time was never stored). Idempotent.
insert into public.member_notes (membership_id, box_id, author_id, body, created_at)
select m.id, m.box_id, null, btrim(m.notes), m.created_at
from public.memberships m
where m.notes is not null
  and btrim(m.notes) <> ''
  and not exists (select 1 from public.member_notes n where n.membership_id = m.id);
