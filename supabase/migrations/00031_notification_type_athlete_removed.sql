-- Add 'athlete_removed' to the notifications type constraint
alter table public.notifications
  drop constraint notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('class_cancelled', 'waitlist_promoted', 'class_reminder', 'new_post', 'athlete_removed'));

-- Add 'athlete_removed' to the notification_preferences type constraint
alter table public.notification_preferences
  drop constraint notification_preferences_type_check;

alter table public.notification_preferences
  add constraint notification_preferences_type_check
  check (type in ('class_cancelled', 'waitlist_promoted', 'new_post', 'athlete_removed'));
