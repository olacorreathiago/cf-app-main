-- Add rx flag to prs so RX and Scaled are tracked separately
ALTER TABLE prs ADD COLUMN IF NOT EXISTS rx boolean NOT NULL DEFAULT true;

-- Add leaderboard visibility toggle to profiles (default on)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS leaderboard_visible boolean NOT NULL DEFAULT true;

-- Unique constraint: one PR per user/box/movement/unit/rx combination
-- Drop old constraint first if it exists, then recreate including rx
-- (no unique constraint existed before, so just add the new one)
CREATE UNIQUE INDEX IF NOT EXISTS prs_user_box_movement_unit_rx_key
  ON prs (user_id, box_id, movement, unit, rx);
