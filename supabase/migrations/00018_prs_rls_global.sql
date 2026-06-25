-- Fix RLS policies on prs to allow global PRs (box_id IS NULL)
-- Global PRs travel with the athlete across boxes; box_id = null identifies them.
-- The old policies used box_id IN (my_box_ids()) which returns NULL (falsy) for null box_id,
-- silently blocking all global PR inserts and reads.

DROP POLICY IF EXISTS "prs_select_box_member" ON public.prs;
DROP POLICY IF EXISTS "prs_insert_own"        ON public.prs;
DROP POLICY IF EXISTS "prs_update_own"        ON public.prs;

-- SELECT: own global PRs (box_id IS NULL) OR box PRs from boxes the user belongs to
CREATE POLICY "prs_select_own"
  ON public.prs FOR SELECT
  USING (
    user_id = auth.uid()
    AND (box_id IS NULL OR box_id IN (SELECT public.my_box_ids()))
  );

-- INSERT: own row, global (box_id null) or within user's boxes
CREATE POLICY "prs_insert_own"
  ON public.prs FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (box_id IS NULL OR box_id IN (SELECT public.my_box_ids()))
  );

-- UPDATE: own rows only
CREATE POLICY "prs_update_own"
  ON public.prs FOR UPDATE
  USING (user_id = auth.uid());
