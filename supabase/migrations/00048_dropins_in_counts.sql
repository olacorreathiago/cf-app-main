-- 00048_dropins_in_counts.sql
-- Confirmed drop-ins never counted toward a class's confirmed_count nor
-- showed up in the attendee roster — both RPCs only looked at `bookings`.
-- This let a class be overbooked past capacity (bookClass()'s own capacity
-- check relies on get_class_booking_counts) and made a member's own paid
-- drop-in invisible in the class detail drawer, even though the dashboard
-- (which reads `drop_ins` directly) showed it as confirmed.

create or replace function public.get_class_booking_counts(p_class_ids uuid[])
returns table (
  class_id       uuid,
  confirmed_count int,
  waitlist_count  int
)
language sql
security definer
stable
set search_path = public
as $$
  select
    class_id,
    sum(confirmed)::int as confirmed_count,
    sum(waitlist)::int  as waitlist_count
  from (
    select
      b.class_id,
      (b.status = 'confirmed')::int as confirmed,
      (b.status = 'waitlist')::int  as waitlist
    from public.bookings b
    where b.class_id = any(p_class_ids)
      and b.status != 'cancelled'
    union all
    select
      d.class_id,
      1 as confirmed,
      0 as waitlist
    from public.drop_ins d
    where d.class_id = any(p_class_ids)
      and d.status = 'confirmed'
  ) counts
  group by class_id;
$$;

create or replace function public.get_class_attendees(p_class_id uuid)
returns table (
  user_id    uuid,
  full_name  text,
  nickname   text,
  avatar_url text
)
language sql
security definer
stable
set search_path = public
as $$
  select user_id, full_name, nickname, avatar_url
  from (
    select
      b.created_at as sort_ts,
      b.user_id,
      p.full_name,
      p.nickname,
      p.avatar_url
    from public.bookings b
    join public.profiles p on p.id = b.user_id
    where b.class_id = p_class_id
      and b.status = 'confirmed'
    union all
    select
      d.created_at as sort_ts,
      d.id as user_id,
      d.name as full_name,
      d.nickname,
      null::text as avatar_url
    from public.drop_ins d
    where d.class_id = p_class_id
      and d.status = 'confirmed'
  ) t
  order by sort_ts;
$$;
