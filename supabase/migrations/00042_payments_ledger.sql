-- 00042_payments_ledger.sql
-- Payments Ledger — central source of truth for all payments.
-- Applies to flows: A) drop-in, B) membership, C) platform (Zekko SaaS), D) orders (future).
--
-- NOTE: drop_ins.amount_paid and drop_ins.stripe_payment_intent_id are now DEPRECATED.
-- New code must NOT write to those columns; reads may still use them for historical data.
-- The columns are intentionally NOT removed to preserve data.

-- ── Table ──────────────────────────────────────────────────────────────────────

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),

  -- nullable: platform payments (box→Zekko) have box_id but no user_id context
  box_id              uuid references public.boxes(id) on delete restrict,

  -- nullable: drop-in from a visitor without an account
  user_id             uuid references public.profiles(id) on delete restrict,

  kind                text not null check (kind in ('drop_in', 'membership', 'order', 'platform')),

  -- Polymorphic FK: points to drop_ins.id, memberships.id, or a future orders.id.
  -- No rigid FK because it spans multiple tables; application code enforces integrity.
  reference_id        uuid,

  amount              numeric not null check (amount >= 0),
  currency            text not null default 'EUR',

  provider            text not null default 'manual' check (provider in ('manual', 'stripe', 'ifthenpay')),

  -- nullable while status = 'pending' (method chosen at payment time)
  method              text check (method in ('cash', 'mbway', 'transferencia', 'multibanco', 'card')),

  status              text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),

  -- Stripe payment_intent id or Multibanco reference (Phase 2)
  provider_payment_id text,

  -- For membership payments: which billing period this covers
  period_start        date,
  period_end          date,

  paid_at             timestamptz,
  recorded_by         uuid references public.profiles(id) on delete set null,
  notes               text,

  created_at          timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────

create index if not exists idx_payments_box_status
  on public.payments (box_id, status);

create index if not exists idx_payments_user
  on public.payments (user_id);

create index if not exists idx_payments_kind_ref
  on public.payments (kind, reference_id);

create index if not exists idx_payments_box_period
  on public.payments (box_id, period_start);

-- ── RLS ────────────────────────────────────────────────────────────────────────

alter table public.payments enable row level security;

-- Staff (owner/partner/manager/coach) of the box can read all payments for their box
drop policy if exists "Staff can read box payments" on public.payments;
create policy "Staff can read box payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.memberships m
      where m.box_id = payments.box_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'partner', 'manager', 'coach')
        and m.status = 'active'
    )
  );

-- Staff (owner/partner/manager) can insert payments for their box
drop policy if exists "Staff can insert box payments" on public.payments;
create policy "Staff can insert box payments"
  on public.payments for insert
  with check (
    exists (
      select 1 from public.memberships m
      where m.box_id = payments.box_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'partner', 'manager')
        and m.status = 'active'
    )
  );

-- Staff (owner/partner/manager) can update payments for their box
drop policy if exists "Staff can update box payments" on public.payments;
create policy "Staff can update box payments"
  on public.payments for update
  using (
    exists (
      select 1 from public.memberships m
      where m.box_id = payments.box_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'partner', 'manager')
        and m.status = 'active'
    )
  );

-- Athletes can read their own payments
drop policy if exists "Athletes can read own payments" on public.payments;
create policy "Athletes can read own payments"
  on public.payments for select
  using (user_id = auth.uid());

-- No public insert policy: drop-in payments created via supabaseAdmin in server actions.

-- ── Box payment_instructions column ────────────────────────────────────────────

alter table public.boxes add column if not exists payment_instructions text;

-- ── Update notifications type constraint to include payment types ──────────────

-- Add payment_received and payment_overdue to the notifications type constraint
-- (reserving for future use; no implementation yet)
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'class_cancelled', 'waitlist_promoted', 'class_reminder',
    'new_post', 'athlete_removed', 'class_starting', 'new_drop_in',
    'payment_received', 'payment_overdue'
  ));
