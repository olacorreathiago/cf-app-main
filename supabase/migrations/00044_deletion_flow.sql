-- 00044_deletion_flow.sql
-- Account deletion (profiles) + box closure (boxes) — tombstone flow.
-- Nothing is physically deleted: deleted_at marks the row, application code
-- filters it out and anonymizes personal data on purge. See docs/DELETION_FLOW.md.

-- ── profiles ─────────────────────────────────────────────────────────────────

alter table public.profiles add column if not exists deleted_at timestamptz;

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at) where deleted_at is not null;

-- Remove the auth.users → profiles cascade. Purging an account deletes the
-- auth.users row via the service role; with `on delete cascade` that would
-- cascade into profiles and then hit the `on delete restrict` FKs on
-- wods.created_by, events.created_by, orders.user_id, drop_ins.user_id and
-- payments.user_id. The anonymized profile row must survive the auth.users
-- delete, so the FK becomes a plain reference with no delete action.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id);

-- ── boxes ────────────────────────────────────────────────────────────────────

alter table public.boxes add column if not exists deleted_at timestamptz;
alter table public.boxes add column if not exists closed_by uuid references public.profiles(id);
alter table public.boxes add column if not exists closure_reason text;
alter table public.boxes add column if not exists closure_message text;

create index if not exists boxes_deleted_at_idx
  on public.boxes (deleted_at) where deleted_at is not null;

-- ── memberships ──────────────────────────────────────────────────────────────

alter table public.memberships add column if not exists status_before public.membership_status;
alter table public.memberships add column if not exists status_before_source text
  check (status_before_source in ('account_deletion', 'box_closure'));

-- ── notifications: reserve 'box_closed' ─────────────────────────────────────

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'class_cancelled', 'waitlist_promoted', 'class_reminder',
    'new_post', 'athlete_removed', 'class_starting', 'new_drop_in',
    'payment_received', 'payment_overdue', 'box_closed'
  ));

-- ── RLS: boxes ───────────────────────────────────────────────────────────────

-- Public/directory visibility must exclude closed boxes.
drop policy if exists "boxes_select_approved" on public.boxes;
create policy "boxes_select_approved"
  on public.boxes for select
  using (approval_status = 'approved' and deleted_at is null);

-- Members can always see a box they belong(ed) to, regardless of membership
-- status — needed so a closed box's own owner can see the reopen banner and
-- so athletes still see a closed box (grayed, badge) in "Minhas Boxes".
-- Previously scoped through my_box_ids(), which only returns active
-- memberships and would hide the box the moment it's closed.
drop policy if exists "boxes_select_member" on public.boxes;
create policy "boxes_select_member"
  on public.boxes for select
  using (
    id in (
      select box_id from public.memberships where user_id = auth.uid()
    )
  );

-- ── RLS: wod_results / prs ───────────────────────────────────────────────────

-- Athletes must keep reading their own results/PRs after their box closes —
-- wod_results_select_box_member / prs_select_box_member both gate through
-- my_box_ids(), which only returns active memberships and would otherwise
-- hide this history the moment the box is closed and the membership goes
-- inactive. Added as an extra permissive policy (OR'd with the existing one).
drop policy if exists "wod_results_select_own" on public.wod_results;
create policy "wod_results_select_own"
  on public.wod_results for select
  using (user_id = auth.uid());

drop policy if exists "prs_select_own" on public.prs;
create policy "prs_select_own"
  on public.prs for select
  using (user_id = auth.uid());
