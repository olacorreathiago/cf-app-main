-- Add emergency contact field to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact text;
