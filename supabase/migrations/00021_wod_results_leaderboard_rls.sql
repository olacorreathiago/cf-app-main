-- Migration 00021: allow athletes to view box leaderboard results
-- Athletes can only see their own results currently (breaks leaderboard).
-- Add a policy that lets any active box member see results of members
-- who have leaderboard_visible = true AND gender set.

CREATE POLICY "athletes can view leaderboard results"
  ON public.wod_results FOR SELECT
  USING (
    box_id IN (SELECT public.my_box_ids())
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = wod_results.user_id
        AND leaderboard_visible = true
        AND gender IS NOT NULL
    )
  );
