-- Drop type check constraints by querying pg_constraint (name-agnostic)
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%type%'
  loop
    execute format('alter table public.notifications drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('class_cancelled', 'waitlist_promoted', 'class_reminder', 'new_post', 'athlete_removed'));

-- Same for notification_preferences
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.notification_preferences'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%type%'
  loop
    execute format('alter table public.notification_preferences drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.notification_preferences
  add constraint notification_preferences_type_check
  check (type in ('class_cancelled', 'waitlist_promoted', 'new_post', 'athlete_removed'));
