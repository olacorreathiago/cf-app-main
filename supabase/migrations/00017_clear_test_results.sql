-- Clear all athlete results and PRs for a clean test slate
-- Run this in Supabase SQL Editor (not via migration runner if already in prod)

DELETE FROM prs;
DELETE FROM wod_results;
