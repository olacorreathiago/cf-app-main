-- =============================================================================
-- 00024_drop_orphan_tables.sql
-- Drop tables that were created directly in Supabase and are not used anywhere
-- in the application. Suspension is handled via memberships.status = 'suspended'.
-- =============================================================================

drop table if exists public.suspended_days cascade;
drop table if exists public.athlete_boxes cascade;
