-- Returns the user's 1-based position in the waitlist for each class
create or replace function public.get_waitlist_positions(p_user_id uuid, p_class_ids uuid[])
returns table (class_id uuid, waitlist_pos int, waitlist_total int)
language sql
security definer
stable
set search_path = public
as $$
  select
    ranked.class_id,
    ranked.waitlist_pos::int,
    totals.waitlist_total::int
  from (
    select
      class_id,
      user_id,
      row_number() over (partition by class_id order by created_at) as waitlist_pos
    from public.bookings
    where class_id = any(p_class_ids)
      and status = 'waitlist'
  ) ranked
  join (
    select class_id, count(*)::int as waitlist_total
    from public.bookings
    where class_id = any(p_class_ids)
      and status = 'waitlist'
    group by class_id
  ) totals on totals.class_id = ranked.class_id
  where ranked.user_id = p_user_id;
$$;

grant execute on function public.get_waitlist_positions(uuid, uuid[]) to authenticated;
