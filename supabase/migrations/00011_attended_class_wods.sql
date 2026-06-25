-- Returns WODs (including unpublished) for classes the calling user attended.
-- SECURITY DEFINER bypasses the "athletes can view published wods" RLS policy.
drop function if exists public.get_attended_class_wods(uuid[]);
create or replace function public.get_attended_class_wods(p_class_ids uuid[])
returns table (
  class_id            uuid,
  wod_id              uuid,
  title               text,
  type                text,
  category            text,
  score_type          text,
  description         text,
  movements           jsonb,
  time_cap_minutes    int,
  scaling_notes       text,
  result_sets         int,
  result_reps_per_set int
)
language sql
security definer
stable
as $$
  select
    unnested.class_id,
    w.id                  as wod_id,
    w.title,
    w.type::text,
    w.category::text,
    w.score_type::text,
    w.description,
    w.movements,
    w.time_cap_minutes,
    w.scaling_notes,
    w.result_sets,
    w.result_reps_per_set
  from (
    select c.id as class_id, unnest(c.wod_ids) as wod_uuid
    from public.classes c
    where c.id = any(p_class_ids)
  ) unnested
  join public.wods w on w.id = unnested.wod_uuid;
$$;

grant execute on function public.get_attended_class_wods(uuid[]) to authenticated;
