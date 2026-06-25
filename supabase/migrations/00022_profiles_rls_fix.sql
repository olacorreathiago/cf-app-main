-- Migration 00022: fix profiles_select_box_member RLS
-- The previous policy queried memberships directly in the USING clause,
-- which was subject to memberships RLS (users can only see own rows).
-- This caused box members to be invisible to each other on the leaderboard.
-- Fix: wrap the subquery in a SECURITY DEFINER function.

CREATE OR REPLACE FUNCTION public.my_box_member_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT m.user_id FROM public.memberships m
  WHERE m.box_id IN (SELECT public.my_box_ids())
    AND m.status = 'active'
$$;

DROP POLICY IF EXISTS "profiles_select_box_member" ON public.profiles;
CREATE POLICY "profiles_select_box_member"
  ON public.profiles FOR SELECT
  USING (id IN (SELECT public.my_box_member_ids()));
