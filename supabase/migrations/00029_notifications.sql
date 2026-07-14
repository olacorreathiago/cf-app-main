create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  box_id     uuid references public.boxes not null,
  type       text not null check (type in ('class_cancelled', 'waitlist_promoted', 'class_reminder')),
  title      text not null,
  body       text,
  data       jsonb,
  read_at    timestamptz,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "users read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "users update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);
