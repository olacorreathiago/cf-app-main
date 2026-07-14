create table public.notification_preferences (
  user_id    uuid references auth.users not null,
  box_id     uuid references public.boxes not null,
  type       text not null check (type in ('class_cancelled', 'waitlist_promoted', 'new_post')),
  in_app     boolean not null default true,
  email      boolean not null default true,
  primary key (user_id, box_id, type)
);

alter table public.notification_preferences enable row level security;

create policy "users manage own preferences"
  on public.notification_preferences
  for all
  using (user_id = auth.uid());
