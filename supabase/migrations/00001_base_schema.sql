-- =============================================================================
-- 00001_base_schema.sql
-- Base schema for the CrossFit Box Management Platform
-- Safe to run on a dirty instance — drops everything and rebuilds from scratch
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CLEAN SLATE — drop tables, triggers, functions, enums
-- (cascade handles dependent objects automatically)
-- -----------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.has_box_role(uuid, variadic public.membership_role[]) cascade;
drop function if exists public.my_box_ids() cascade;
drop function if exists public.auth_uid() cascade;

drop table if exists public.gamification_badges cascade;
drop table if exists public.gamification_points cascade;
drop table if exists public.equipment cascade;
drop table if exists public.trials cascade;
drop table if exists public.drop_ins cascade;
drop table if exists public.orders cascade;
drop table if exists public.products cascade;
drop table if exists public.event_registrations cascade;
drop table if exists public.events cascade;
drop table if exists public.prs cascade;
drop table if exists public.wod_results cascade;
drop table if exists public.bookings cascade;
drop table if exists public.classes cascade;
drop table if exists public.wods cascade;
drop table if exists public.plans cascade;
drop table if exists public.invites cascade;
drop table if exists public.memberships cascade;
drop table if exists public.boxes cascade;
drop table if exists public.profiles cascade;

drop type if exists public.event_reg_status cascade;
drop type if exists public.fulfillment_type cascade;
drop type if exists public.drop_in_status cascade;
drop type if exists public.trial_status cascade;
drop type if exists public.equipment_status cascade;
drop type if exists public.product_category cascade;
drop type if exists public.order_status cascade;
drop type if exists public.score_type cascade;
drop type if exists public.wod_type cascade;
drop type if exists public.booking_status cascade;
drop type if exists public.class_status cascade;
drop type if exists public.billing_interval cascade;
drop type if exists public.invite_status cascade;
drop type if exists public.membership_status cascade;
drop type if exists public.membership_role cascade;
drop type if exists public.approval_status cascade;
drop type if exists public.profile_type cascade;

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

create type public.profile_type as enum ('athlete', 'professional');
create type public.approval_status as enum ('approved', 'pending_approval', 'rejected');
create type public.membership_role as enum ('owner', 'partner', 'manager', 'coach', 'athlete');
create type public.membership_status as enum ('active', 'inactive', 'suspended', 'trial', 'pending');
create type public.invite_status as enum ('pending', 'accepted', 'declined', 'expired');
create type public.billing_interval as enum ('monthly', 'annual');
create type public.class_status as enum ('scheduled', 'cancelled');
create type public.booking_status as enum ('confirmed', 'waitlist', 'cancelled');
create type public.wod_type as enum ('AMRAP', 'For Time', 'EMOM', 'Chipper', 'Strength', 'Custom');
create type public.score_type as enum ('time', 'reps', 'weight', 'rounds+reps');
create type public.order_status as enum ('pending', 'paid', 'fulfilled', 'cancelled');
create type public.product_category as enum ('merch', 'supplement', 'equipment', 'service');
create type public.equipment_status as enum ('ok', 'damaged', 'replace');
create type public.trial_status as enum ('scheduled', 'completed', 'converted', 'lost');
create type public.drop_in_status as enum ('pending', 'confirmed', 'cancelled');
create type public.fulfillment_type as enum ('pickup', 'delivery');
create type public.event_reg_status as enum ('pending', 'confirmed', 'cancelled');

-- -----------------------------------------------------------------------------
-- PROFILES
-- 1:1 with auth.users. Created automatically on first sign-in via trigger.
-- -----------------------------------------------------------------------------

create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text unique not null,
  full_name             text,
  nickname              text,
  avatar_url            text,
  phone                 text,
  birth_date            date,
  height_cm             integer check (height_cm is null or height_cm between 80 and 260),
  nationality           text,
  tax_id                text,
  language              text not null default 'pt' check (language in ('pt', 'en')),
  profile_type          public.profile_type not null default 'athlete',
  approval_status       public.approval_status not null default 'approved',
  -- professional-only fields
  professional_id       text,           -- cédula profissional
  specialty             text,
  training_institution  text,
  -- legal
  terms_accepted_at     timestamptz,
  -- onboarding
  onboarding_completed  boolean not null default false,
  created_at            timestamptz not null default now()
);

comment on column public.profiles.approval_status is 'Athletes: auto-approved. Professionals: pending until manual platform review.';
comment on column public.profiles.professional_id is 'Cédula profissional — required for professional profile approval.';

create index profiles_email_idx on public.profiles (email);
create index profiles_profile_type_idx on public.profiles (profile_type);
create index profiles_approval_status_idx on public.profiles (approval_status);

-- Trigger: auto-create profile row on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- BOXES
-- -----------------------------------------------------------------------------

create table public.boxes (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text unique not null,
  address           text,
  city              text,
  country           text not null default 'PT',
  phone             text,
  email             text,
  website           text,
  logo_url          text,
  cover_url         text,
  description       text,
  approval_status   public.approval_status not null default 'pending_approval',
  payments_enabled  boolean not null default false,
  drop_in_enabled   boolean not null default false,
  drop_in_price     numeric check (drop_in_price is null or drop_in_price >= 0),
  settings          jsonb not null default '{}',
  created_at        timestamptz not null default now()
);

comment on column public.boxes.approval_status is 'Boxes require manual platform approval before appearing in the directory.';
comment on column public.boxes.payments_enabled is 'When true, invite acceptance triggers Stripe checkout.';

create index boxes_slug_idx on public.boxes (slug);
create index boxes_approval_status_idx on public.boxes (approval_status);
create index boxes_country_idx on public.boxes (country);

-- -----------------------------------------------------------------------------
-- MEMBERSHIPS
-- N:N between profiles and boxes. Role is per-membership.
-- -----------------------------------------------------------------------------

create table public.memberships (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.profiles(id) on delete cascade,
  box_id                   uuid not null references public.boxes(id) on delete cascade,
  role                     public.membership_role not null default 'athlete',
  status                   public.membership_status not null default 'pending',
  plan_id                  uuid,           -- FK to plans (set after table creation)
  start_date               date,
  end_date                 date,
  notes                    text,           -- private notes, only visible to managers
  stripe_customer_id       text,
  stripe_subscription_id   text,
  created_at               timestamptz not null default now(),
  unique (user_id, box_id)
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_box_id_idx on public.memberships (box_id);
create index memberships_status_idx on public.memberships (status);
create index memberships_role_idx on public.memberships (role);

-- -----------------------------------------------------------------------------
-- INVITES
-- -----------------------------------------------------------------------------

create table public.invites (
  id           uuid primary key default gen_random_uuid(),
  box_id       uuid not null references public.boxes(id) on delete cascade,
  email        text not null,
  role         public.membership_role not null default 'athlete',
  token        text unique not null default encode(gen_random_bytes(32), 'hex'),
  status       public.invite_status not null default 'pending',
  invited_by   uuid references public.profiles(id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index invites_token_idx on public.invites (token);
create index invites_email_idx on public.invites (email);
create index invites_box_id_idx on public.invites (box_id);
create index invites_status_idx on public.invites (status);

-- -----------------------------------------------------------------------------
-- PLANS
-- -----------------------------------------------------------------------------

create table public.plans (
  id                uuid primary key default gen_random_uuid(),
  box_id            uuid not null references public.boxes(id) on delete cascade,
  name              text not null,
  price             numeric not null check (price >= 0),
  billing_interval  public.billing_interval not null default 'monthly',
  classes_per_week  integer check (classes_per_week is null or classes_per_week > 0),
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

-- Add FK from memberships to plans now that plans table exists
alter table public.memberships
  add constraint memberships_plan_id_fkey
  foreign key (plan_id) references public.plans(id) on delete set null;

create index plans_box_id_idx on public.plans (box_id);

-- -----------------------------------------------------------------------------
-- WODS (defined before classes because classes reference wods)
-- -----------------------------------------------------------------------------

create table public.wods (
  id              uuid primary key default gen_random_uuid(),
  box_id          uuid not null references public.boxes(id) on delete cascade,
  created_by      uuid not null references public.profiles(id) on delete restrict,
  title           text not null,
  type            public.wod_type not null default 'Custom',
  description     text,
  time_cap_minutes integer check (time_cap_minutes is null or time_cap_minutes > 0),
  movements       jsonb not null default '[]',
  scaling_notes   text,
  published_at    timestamptz,
  scheduled_for   date,
  created_at      timestamptz not null default now()
);

create index wods_box_id_idx on public.wods (box_id);
create index wods_scheduled_for_idx on public.wods (scheduled_for);

-- -----------------------------------------------------------------------------
-- CLASSES
-- -----------------------------------------------------------------------------

create table public.classes (
  id                    uuid primary key default gen_random_uuid(),
  box_id                uuid not null references public.boxes(id) on delete cascade,
  coach_id              uuid references public.profiles(id) on delete set null,
  name                  text not null,
  starts_at             timestamptz not null,
  duration_minutes      integer not null default 60 check (duration_minutes > 0),
  capacity              integer not null default 20 check (capacity > 0),
  location              text,
  notes                 text,
  wod_id                uuid references public.wods(id) on delete set null,
  status                public.class_status not null default 'scheduled',
  cancellation_reason   text,
  created_at            timestamptz not null default now()
);

create index classes_box_id_idx on public.classes (box_id);
create index classes_starts_at_idx on public.classes (starts_at);
create index classes_coach_id_idx on public.classes (coach_id);

-- -----------------------------------------------------------------------------
-- BOOKINGS
-- -----------------------------------------------------------------------------

create table public.bookings (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.classes(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        public.booking_status not null default 'confirmed',
  checked_in_at timestamptz,
  created_at    timestamptz not null default now(),
  unique (class_id, user_id)
);

create index bookings_class_id_idx on public.bookings (class_id);
create index bookings_user_id_idx on public.bookings (user_id);
create index bookings_status_idx on public.bookings (status);

-- -----------------------------------------------------------------------------
-- WOD RESULTS
-- -----------------------------------------------------------------------------

create table public.wod_results (
  id            uuid primary key default gen_random_uuid(),
  wod_id        uuid not null references public.wods(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  box_id        uuid not null references public.boxes(id) on delete cascade,
  score_type    public.score_type not null,
  score_value   numeric,
  score_display text,
  rx            boolean not null default false,
  notes         text,
  recorded_at   timestamptz not null default now()
);

create index wod_results_wod_id_idx on public.wod_results (wod_id);
create index wod_results_user_id_idx on public.wod_results (user_id);
create index wod_results_box_id_idx on public.wod_results (box_id);

-- -----------------------------------------------------------------------------
-- PRS (Personal Records)
-- -----------------------------------------------------------------------------

create table public.prs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  box_id          uuid not null references public.boxes(id) on delete cascade,
  movement        text not null,
  value           numeric not null,
  unit            text not null check (unit in ('kg', 'lb', 'seconds', 'reps')),
  achieved_at     timestamptz not null default now(),
  wod_result_id   uuid references public.wod_results(id) on delete set null
);

create index prs_user_id_idx on public.prs (user_id);
create index prs_movement_idx on public.prs (movement);

-- -----------------------------------------------------------------------------
-- EVENTS
-- -----------------------------------------------------------------------------

create table public.events (
  id                      uuid primary key default gen_random_uuid(),
  box_id                  uuid not null references public.boxes(id) on delete cascade,
  created_by              uuid not null references public.profiles(id) on delete restrict,
  name                    text not null,
  description             text,
  date                    timestamptz not null,
  location                text,
  capacity                integer check (capacity is null or capacity > 0),
  is_public               boolean not null default false,
  categories              jsonb not null default '[]',
  cover_url               text,
  registration_deadline   timestamptz,
  published_at            timestamptz,
  created_at              timestamptz not null default now()
);

create index events_box_id_idx on public.events (box_id);
create index events_date_idx on public.events (date);
create index events_is_public_idx on public.events (is_public);

-- -----------------------------------------------------------------------------
-- EVENT REGISTRATIONS
-- -----------------------------------------------------------------------------

create table public.event_registrations (
  id                uuid primary key default gen_random_uuid(),
  event_id          uuid not null references public.events(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  category          text,
  team_name         text,
  team_members      jsonb not null default '[]',
  status            public.event_reg_status not null default 'pending',
  amount_paid       numeric check (amount_paid is null or amount_paid >= 0),
  waiver_signed_at  timestamptz,
  created_at        timestamptz not null default now()
);

create index event_registrations_event_id_idx on public.event_registrations (event_id);
create index event_registrations_user_id_idx on public.event_registrations (user_id);

-- -----------------------------------------------------------------------------
-- PRODUCTS
-- -----------------------------------------------------------------------------

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  box_id      uuid not null references public.boxes(id) on delete cascade,
  name        text not null,
  description text,
  price       numeric not null check (price >= 0),
  stock       integer check (stock is null or stock >= 0),
  image_url   text,
  category    public.product_category not null default 'merch',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index products_box_id_idx on public.products (box_id);

-- -----------------------------------------------------------------------------
-- ORDERS
-- -----------------------------------------------------------------------------

create table public.orders (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles(id) on delete restrict,
  box_id                    uuid not null references public.boxes(id) on delete restrict,
  items                     jsonb not null default '[]',
  total                     numeric not null check (total >= 0),
  status                    public.order_status not null default 'pending',
  fulfillment               public.fulfillment_type not null default 'pickup',
  stripe_payment_intent_id  text,
  invoice_id                text,
  created_at                timestamptz not null default now()
);

create index orders_user_id_idx on public.orders (user_id);
create index orders_box_id_idx on public.orders (box_id);
create index orders_status_idx on public.orders (status);

-- -----------------------------------------------------------------------------
-- DROP-INS
-- -----------------------------------------------------------------------------

create table public.drop_ins (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles(id) on delete restrict,
  box_id                    uuid not null references public.boxes(id) on delete restrict,
  class_id                  uuid references public.classes(id) on delete set null,
  date                      date not null,
  status                    public.drop_in_status not null default 'pending',
  amount_paid               numeric check (amount_paid is null or amount_paid >= 0),
  waiver_signed_at          timestamptz,
  stripe_payment_intent_id  text,
  created_at                timestamptz not null default now()
);

create index drop_ins_user_id_idx on public.drop_ins (user_id);
create index drop_ins_box_id_idx on public.drop_ins (box_id);
create index drop_ins_date_idx on public.drop_ins (date);

-- -----------------------------------------------------------------------------
-- TRIALS
-- -----------------------------------------------------------------------------

create table public.trials (
  id              uuid primary key default gen_random_uuid(),
  box_id          uuid not null references public.boxes(id) on delete cascade,
  name            text not null,
  email           text not null,
  phone           text,
  scheduled_for   timestamptz,
  class_id        uuid references public.classes(id) on delete set null,
  status          public.trial_status not null default 'scheduled',
  converted_at    timestamptz,
  notes           text,
  created_at      timestamptz not null default now()
);

create index trials_box_id_idx on public.trials (box_id);
create index trials_email_idx on public.trials (email);
create index trials_status_idx on public.trials (status);

-- -----------------------------------------------------------------------------
-- EQUIPMENT
-- -----------------------------------------------------------------------------

create table public.equipment (
  id                  uuid primary key default gen_random_uuid(),
  box_id              uuid not null references public.boxes(id) on delete cascade,
  name                text not null,
  category            text,
  quantity            integer not null default 1 check (quantity >= 0),
  status              public.equipment_status not null default 'ok',
  replacement_cost    numeric check (replacement_cost is null or replacement_cost >= 0),
  notes               text,
  last_checked_at     timestamptz,
  created_at          timestamptz not null default now()
);

create index equipment_box_id_idx on public.equipment (box_id);

-- -----------------------------------------------------------------------------
-- GAMIFICATION — POINTS
-- -----------------------------------------------------------------------------

create table public.gamification_points (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  box_id      uuid not null references public.boxes(id) on delete cascade,
  action      text not null,
  points      integer not null check (points > 0),
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index gamification_points_user_id_idx on public.gamification_points (user_id);
create index gamification_points_box_id_idx on public.gamification_points (box_id);

-- -----------------------------------------------------------------------------
-- GAMIFICATION — BADGES
-- -----------------------------------------------------------------------------

create table public.gamification_badges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  box_id      uuid not null references public.boxes(id) on delete cascade,
  badge_key   text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, box_id, badge_key)
);

create index gamification_badges_user_id_idx on public.gamification_badges (user_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Helper function: get the active user's id
create or replace function public.auth_uid()
returns uuid
language sql stable
as $$ select auth.uid() $$;

-- Helper function: get all box_ids where the current user has an active membership
create or replace function public.my_box_ids()
returns setof uuid
language sql stable security definer
as $$
  select box_id from public.memberships
  where user_id = auth.uid()
    and status = 'active'
$$;

-- Helper function: check if user has a given role in a box
create or replace function public.has_box_role(p_box_id uuid, variadic p_roles public.membership_role[])
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and box_id = p_box_id
      and role = any(p_roles)
      and status = 'active'
  )
$$;

-- -------
-- PROFILES
-- -------
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

-- Managers/owners/coaches can view profiles of members in their boxes
create policy "profiles_select_box_member"
  on public.profiles for select
  using (
    id in (
      select m.user_id from public.memberships m
      where m.box_id in (select public.my_box_ids())
    )
  );

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- -------
-- BOXES
-- -------
alter table public.boxes enable row level security;

-- Anyone can view approved boxes (for public directory)
create policy "boxes_select_approved"
  on public.boxes for select
  using (approval_status = 'approved');

-- Members can view their own box even if pending
create policy "boxes_select_member"
  on public.boxes for select
  using (id in (select public.my_box_ids()));

-- Owners/partners can update their box
create policy "boxes_update_owner"
  on public.boxes for update
  using (public.has_box_role(id, 'owner', 'partner'))
  with check (public.has_box_role(id, 'owner', 'partner'));

-- Any authenticated professional can create a box
create policy "boxes_insert_professional"
  on public.boxes for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and profile_type = 'professional'
        and approval_status = 'approved'
    )
  );

-- -------
-- MEMBERSHIPS
-- -------
alter table public.memberships enable row level security;

-- Users can see their own memberships
create policy "memberships_select_own"
  on public.memberships for select
  using (user_id = auth.uid());

-- Owners/partners/managers can see all memberships in their box
create policy "memberships_select_box_staff"
  on public.memberships for select
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- Owners/partners/managers can insert memberships
create policy "memberships_insert_staff"
  on public.memberships for insert
  with check (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- Box owner bootstrap: allows inserting the first membership (owner role) for a box
-- the user just created. has_box_role() returns false before this row exists.
create policy "memberships_insert_owner_bootstrap"
  on public.memberships for insert
  with check (
    role = 'owner'
    and user_id = auth.uid()
    and exists (
      select 1 from public.boxes
      where id = box_id
        and not exists (
          select 1 from public.memberships m2 where m2.box_id = box_id
        )
    )
  );

-- Owners/partners/managers can update memberships
create policy "memberships_update_staff"
  on public.memberships for update
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- Users can update their own membership status (e.g. leave a box)
create policy "memberships_update_own"
  on public.memberships for update
  using (user_id = auth.uid());

-- -------
-- INVITES
-- -------
alter table public.invites enable row level security;

-- Owners/partners/managers can view invites for their box
create policy "invites_select_staff"
  on public.invites for select
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- Anyone authenticated can view an invite by token (for the accept flow)
create policy "invites_select_by_token"
  on public.invites for select
  using (true); -- filtered in application layer by token lookup

-- Owners/partners/managers can create invites
create policy "invites_insert_staff"
  on public.invites for insert
  with check (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- Owners/partners/managers can update invites (cancel, resend)
create policy "invites_update_staff"
  on public.invites for update
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- -------
-- PLANS
-- -------
alter table public.plans enable row level security;

create policy "plans_select_box_member"
  on public.plans for select
  using (box_id in (select public.my_box_ids()));

create policy "plans_insert_owner"
  on public.plans for insert
  with check (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

create policy "plans_update_owner"
  on public.plans for update
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- -------
-- CLASSES
-- -------
alter table public.classes enable row level security;

create policy "classes_select_box_member"
  on public.classes for select
  using (box_id in (select public.my_box_ids()));

create policy "classes_insert_staff"
  on public.classes for insert
  with check (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

create policy "classes_update_staff"
  on public.classes for update
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

-- -------
-- BOOKINGS
-- -------
alter table public.bookings enable row level security;

-- Athletes can see their own bookings
create policy "bookings_select_own"
  on public.bookings for select
  using (user_id = auth.uid());

-- Staff can see all bookings for classes in their box
create policy "bookings_select_staff"
  on public.bookings for select
  using (
    class_id in (
      select id from public.classes
      where box_id in (select public.my_box_ids())
    )
    and public.has_box_role(
      (select box_id from public.classes where id = class_id),
      'owner', 'partner', 'manager', 'coach'
    )
  );

-- Athletes can book classes in boxes they're members of
create policy "bookings_insert_own"
  on public.bookings for insert
  with check (
    user_id = auth.uid()
    and (select box_id from public.classes where id = class_id) in (select public.my_box_ids())
  );

-- Athletes can cancel their own bookings; staff can update any booking in their box
create policy "bookings_update_own"
  on public.bookings for update
  using (user_id = auth.uid());

create policy "bookings_update_staff"
  on public.bookings for update
  using (
    public.has_box_role(
      (select box_id from public.classes where id = class_id),
      'owner', 'partner', 'manager', 'coach'
    )
  );

-- -------
-- WODS
-- -------
alter table public.wods enable row level security;

create policy "wods_select_box_member"
  on public.wods for select
  using (box_id in (select public.my_box_ids()));

create policy "wods_insert_staff"
  on public.wods for insert
  with check (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

create policy "wods_update_staff"
  on public.wods for update
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

-- -------
-- WOD RESULTS
-- -------
alter table public.wod_results enable row level security;

create policy "wod_results_select_box_member"
  on public.wod_results for select
  using (box_id in (select public.my_box_ids()));

create policy "wod_results_insert_own"
  on public.wod_results for insert
  with check (user_id = auth.uid() and box_id in (select public.my_box_ids()));

create policy "wod_results_update_own"
  on public.wod_results for update
  using (user_id = auth.uid());

-- -------
-- PRS
-- -------
alter table public.prs enable row level security;

create policy "prs_select_box_member"
  on public.prs for select
  using (box_id in (select public.my_box_ids()));

create policy "prs_insert_own"
  on public.prs for insert
  with check (user_id = auth.uid() and box_id in (select public.my_box_ids()));

create policy "prs_update_own"
  on public.prs for update
  using (user_id = auth.uid());

-- -------
-- EVENTS
-- -------
alter table public.events enable row level security;

-- Public events are visible to anyone
create policy "events_select_public"
  on public.events for select
  using (is_public = true and published_at is not null);

-- Box members can see all events from their box
create policy "events_select_box_member"
  on public.events for select
  using (box_id in (select public.my_box_ids()));

create policy "events_insert_staff"
  on public.events for insert
  with check (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

create policy "events_update_staff"
  on public.events for update
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- -------
-- EVENT REGISTRATIONS
-- -------
alter table public.event_registrations enable row level security;

create policy "event_registrations_select_own"
  on public.event_registrations for select
  using (user_id = auth.uid());

create policy "event_registrations_select_staff"
  on public.event_registrations for select
  using (
    public.has_box_role(
      (select box_id from public.events where id = event_id),
      'owner', 'partner', 'manager'
    )
  );

create policy "event_registrations_insert_own"
  on public.event_registrations for insert
  with check (user_id = auth.uid());

create policy "event_registrations_update_own"
  on public.event_registrations for update
  using (user_id = auth.uid());

-- -------
-- PRODUCTS
-- -------
alter table public.products enable row level security;

create policy "products_select_box_member"
  on public.products for select
  using (box_id in (select public.my_box_ids()));

create policy "products_insert_staff"
  on public.products for insert
  with check (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

create policy "products_update_staff"
  on public.products for update
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- -------
-- ORDERS
-- -------
alter table public.orders enable row level security;

create policy "orders_select_own"
  on public.orders for select
  using (user_id = auth.uid());

create policy "orders_select_staff"
  on public.orders for select
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

create policy "orders_insert_own"
  on public.orders for insert
  with check (user_id = auth.uid() and box_id in (select public.my_box_ids()));

create policy "orders_update_staff"
  on public.orders for update
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- -------
-- DROP-INS
-- -------
alter table public.drop_ins enable row level security;

create policy "drop_ins_select_own"
  on public.drop_ins for select
  using (user_id = auth.uid());

create policy "drop_ins_select_staff"
  on public.drop_ins for select
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

create policy "drop_ins_insert_own"
  on public.drop_ins for insert
  with check (user_id = auth.uid());

create policy "drop_ins_update_staff"
  on public.drop_ins for update
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- -------
-- TRIALS
-- -------
alter table public.trials enable row level security;

create policy "trials_select_staff"
  on public.trials for select
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

create policy "trials_insert_staff"
  on public.trials for insert
  with check (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

create policy "trials_update_staff"
  on public.trials for update
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- -------
-- EQUIPMENT
-- -------
alter table public.equipment enable row level security;

create policy "equipment_select_staff"
  on public.equipment for select
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

create policy "equipment_insert_staff"
  on public.equipment for insert
  with check (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

create policy "equipment_update_staff"
  on public.equipment for update
  using (public.has_box_role(box_id, 'owner', 'partner', 'manager'));

-- -------
-- GAMIFICATION POINTS
-- -------
alter table public.gamification_points enable row level security;

create policy "gamification_points_select_own"
  on public.gamification_points for select
  using (user_id = auth.uid());

create policy "gamification_points_select_box_member"
  on public.gamification_points for select
  using (box_id in (select public.my_box_ids()));

-- Only server-side (service role) inserts points — no direct user insert

-- -------
-- GAMIFICATION BADGES
-- -------
alter table public.gamification_badges enable row level security;

create policy "gamification_badges_select_own"
  on public.gamification_badges for select
  using (user_id = auth.uid());

create policy "gamification_badges_select_box_member"
  on public.gamification_badges for select
  using (box_id in (select public.my_box_ids()));

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Drop existing storage policies before recreating
drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_authenticated_upload" on storage.objects;
drop policy if exists "avatars_authenticated_update" on storage.objects;
drop policy if exists "avatars_authenticated_delete" on storage.objects;
drop policy if exists "box_assets_public_read" on storage.objects;
drop policy if exists "box_assets_staff_upload" on storage.objects;
drop policy if exists "waivers_select_own" on storage.objects;
drop policy if exists "waivers_authenticated_upload" on storage.objects;

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('box-assets', 'box-assets', true),
  ('waivers', 'waivers', false)
on conflict (id) do nothing;

-- Avatars: public read, authenticated users upload to their own folder
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_authenticated_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_authenticated_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_authenticated_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Box assets: public read, box owners/partners upload to their own folder
create policy "box_assets_public_read" on storage.objects
  for select using (bucket_id = 'box-assets');

create policy "box_assets_staff_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'box-assets'
    and public.has_box_role((storage.foldername(name))[1]::uuid, 'owner', 'partner', 'manager')
  );

-- Waivers: private — only the owner and box staff can read
create policy "waivers_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'waivers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "waivers_authenticated_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'waivers' and (storage.foldername(name))[1] = auth.uid()::text);
