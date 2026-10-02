-- 00047_consistency.sql
-- Consistency (fase 1): recorde mensal + meta semanal. Tudo o resto é
-- derivado à leitura a partir de bookings + classes — ver docs/CONSISTENCY_FLOW.md.

-- Só a meta que o atleta escolheu à mão. Sem linha = meta proposta pelo sistema.
create table if not exists public.athlete_weekly_goals (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  box_id        uuid not null references public.boxes(id) on delete cascade,
  weekly_target int  not null check (weekly_target between 1 and 14),
  updated_at    timestamptz not null default now(),
  primary key (user_id, box_id)
);

alter table public.athlete_weekly_goals enable row level security;

drop policy if exists "athlete_weekly_goals_select_own" on public.athlete_weekly_goals;
create policy "athlete_weekly_goals_select_own"
  on public.athlete_weekly_goals for select
  using (user_id = auth.uid());

drop policy if exists "athlete_weekly_goals_insert_own" on public.athlete_weekly_goals;
create policy "athlete_weekly_goals_insert_own"
  on public.athlete_weekly_goals for insert
  with check (user_id = auth.uid());

drop policy if exists "athlete_weekly_goals_update_own" on public.athlete_weekly_goals;
create policy "athlete_weekly_goals_update_own"
  on public.athlete_weekly_goals for update
  using (user_id = auth.uid());

drop policy if exists "athlete_weekly_goals_delete_own" on public.athlete_weekly_goals;
create policy "athlete_weekly_goals_delete_own"
  on public.athlete_weekly_goals for delete
  using (user_id = auth.uid());

-- O recorde é atribuído uma vez e nunca revogado — não pode ser derivado,
-- ao contrário de tudo o resto. Escrita só pelo service role (é atribuição,
-- não input do utilizador), mesmo padrão de gamification_points.
create table if not exists public.athlete_monthly_records (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  box_id        uuid not null references public.boxes(id) on delete cascade,
  best_sessions int  not null check (best_sessions > 0),
  best_year     int  not null,
  best_month    int  not null check (best_month between 1 and 12),
  achieved_at   timestamptz not null default now(),
  primary key (user_id, box_id)
);

alter table public.athlete_monthly_records enable row level security;

drop policy if exists "athlete_monthly_records_select_own" on public.athlete_monthly_records;
create policy "athlete_monthly_records_select_own"
  on public.athlete_monthly_records for select
  using (user_id = auth.uid());

-- Notificação de check-in ("presença de X registada").
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'class_cancelled', 'waitlist_promoted', 'class_reminder',
    'new_post', 'athlete_removed', 'class_starting', 'new_drop_in',
    'payment_received', 'payment_overdue', 'box_closed', 'consistency_checkin'
  ));
