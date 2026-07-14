-- Make user_id nullable (drop-ins can be from non-account visitors)
alter table public.drop_ins alter column user_id drop not null;

-- Add missing fields
alter table public.drop_ins
  add column if not exists name      text,
  add column if not exists email     text,
  add column if not exists nickname  text,
  add column if not exists notes     text,
  add column if not exists checked_in boolean not null default false;

-- Add new_drop_in to notifications type constraint
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%type%'
  loop
    execute format('alter table public.notifications drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'class_cancelled', 'waitlist_promoted', 'class_reminder',
    'new_post', 'athlete_removed', 'class_starting', 'new_drop_in'
  ));
