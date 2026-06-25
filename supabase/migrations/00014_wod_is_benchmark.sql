-- WODs can be marked as benchmarks by the manager.
-- Only benchmark WODs track PRs in the prs table.
ALTER TABLE wods ADD COLUMN IF NOT EXISTS is_benchmark boolean NOT NULL DEFAULT false;

-- WODs linked to the benchmark catalog (Girls/Heroes/etc.) are benchmarks by default.
UPDATE wods SET is_benchmark = true WHERE benchmark_slug IS NOT NULL;
