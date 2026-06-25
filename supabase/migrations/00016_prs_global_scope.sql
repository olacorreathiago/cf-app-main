-- PRs now have two scopes:
-- Global: box_id IS NULL, benchmark_slug set → travels with the athlete across boxes
-- Box-custom: box_id set, benchmark_slug IS NULL → scoped to the box

ALTER TABLE prs ALTER COLUMN box_id DROP NOT NULL;
ALTER TABLE prs ADD COLUMN IF NOT EXISTS benchmark_slug text REFERENCES benchmark_wods(slug);

-- Drop previous indexes from migration 00015 (being replaced)
DROP INDEX IF EXISTS prs_user_box_movement_unit_rx_key;
DROP INDEX IF EXISTS prs_global_unique;
DROP INDEX IF EXISTS prs_box_unique;

-- Global PRs: unique per (user, benchmark, unit, rx) — no box
CREATE UNIQUE INDEX prs_global_unique
  ON prs (user_id, benchmark_slug, unit, rx)
  WHERE box_id IS NULL AND benchmark_slug IS NOT NULL;

-- Box-custom PRs: unique per (user, box, movement, unit, rx)
CREATE UNIQUE INDEX prs_box_unique
  ON prs (user_id, box_id, movement, unit, rx)
  WHERE box_id IS NOT NULL;
