-- Returns display names of confirmed attendees for a class.
-- SECURITY DEFINER: bypasses RLS. Returns only names (no PII) for community transparency.
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
  select
    b.user_id,
    p.full_name,
    p.nickname,
    p.avatar_url
  from public.bookings b
  join public.profiles p on p.id = b.user_id
  where b.class_id = p_class_id
    and b.status = 'confirmed'
  order by b.created_at;
$$;

grant execute on function public.get_class_attendees(uuid) to authenticated;
