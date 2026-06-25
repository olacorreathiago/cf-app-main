-- Migration 00020: add gender to profiles for leaderboard gender split

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'other'));
