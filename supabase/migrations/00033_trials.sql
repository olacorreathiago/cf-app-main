create table if not exists public.trials (
  id             uuid primary key default gen_random_uuid(),
  box_id         uuid not null references public.boxes(id) on delete cascade,
  name           text not null,
  email          text,
  phone          text,
  scheduled_for  timestamptz,
  class_id       uuid references public.classes(id) on delete set null,
  status         text not null default 'scheduled'
                   check (status in ('scheduled', 'completed', 'converted', 'lost')),
  converted_at   timestamptz,
  notes          text,
  created_at     timestamptz not null default now()
);

alter table public.trials enable row level security;

-- Staff can do everything within their box
create policy "staff_all_trials" on public.trials
  for all
  using (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.box_id = trials.box_id
        and m.role in ('owner', 'partner', 'manager', 'coach')
        and m.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.box_id = trials.box_id
        and m.role in ('owner', 'partner', 'manager', 'coach')
        and m.status = 'active'
    )
  );

create index if not exists trials_box_id_idx on public.trials (box_id);
create index if not exists trials_status_idx on public.trials (box_id, status);
