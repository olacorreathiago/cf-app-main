-- Function to return confirmed/waitlist counts per class
-- SECURITY DEFINER bypasses RLS (safe: returns only aggregate counts, no PII)
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
    b.class_id,
    count(*) filter (where b.status = 'confirmed')::int as confirmed_count,
    count(*) filter (where b.status = 'waitlist')::int  as waitlist_count
  from public.bookings b
  where b.class_id = any(p_class_ids)
    and b.status != 'cancelled'
  group by b.class_id;
$$;

-- Grant execute to authenticated users
grant execute on function public.get_class_booking_counts(uuid[]) to authenticated;
