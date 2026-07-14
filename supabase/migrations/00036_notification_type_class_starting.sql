-- Add 'class_starting' to the notifications type constraint only
-- (staff-only notification — no user preference needed)
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
  check (type in ('class_cancelled', 'waitlist_promoted', 'class_reminder', 'new_post', 'athlete_removed', 'class_starting'));
