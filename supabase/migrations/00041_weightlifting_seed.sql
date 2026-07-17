-- Complete the weightlifting benchmark catalog with all CrossFit barbell lifts.
-- Existing entries (from 00004): back-squat-1rm, front-squat-1rm, deadlift-1rm,
-- clean-1rm, clean-and-jerk-1rm, snatch-1rm, overhead-squat-1rm,
-- shoulder-press-1rm, push-press-1rm. This adds the remaining variants.
-- Requires 00039 (benchmark_wods.score_type).

INSERT INTO public.benchmark_wods (slug, name, category, type, score_type, description, movements, time_cap_minutes) VALUES

-- ───────────────── CLEAN VARIANTS ─────────────────

('power-clean-1rm', 'Power Clean 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Power Clean',
 '[{"name":"Power Clean"}]', NULL),

('hang-clean-1rm', 'Hang Clean 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Hang Clean (squat)',
 '[{"name":"Hang Clean"}]', NULL),

('hang-power-clean-1rm', 'Hang Power Clean 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Hang Power Clean',
 '[{"name":"Hang Power Clean"}]', NULL),

-- ───────────────── SNATCH VARIANTS ─────────────────

('power-snatch-1rm', 'Power Snatch 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Power Snatch',
 '[{"name":"Power Snatch"}]', NULL),

('hang-snatch-1rm', 'Hang Snatch 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Hang Snatch (squat)',
 '[{"name":"Hang Snatch"}]', NULL),

('hang-power-snatch-1rm', 'Hang Power Snatch 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Hang Power Snatch',
 '[{"name":"Hang Power Snatch"}]', NULL),

('muscle-snatch-1rm', 'Muscle Snatch 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Muscle Snatch',
 '[{"name":"Muscle Snatch"}]', NULL),

('snatch-balance-1rm', 'Snatch Balance 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Snatch Balance',
 '[{"name":"Snatch Balance"}]', NULL),

-- ───────────────── JERK VARIANTS ─────────────────

('push-jerk-1rm', 'Push Jerk 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Push Jerk',
 '[{"name":"Push Jerk"}]', NULL),

('split-jerk-1rm', 'Split Jerk 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Split Jerk',
 '[{"name":"Split Jerk"}]', NULL),

-- ───────────────── PRESSES & OTHER LIFTS ─────────────────

('bench-press-1rm', 'Bench Press 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Bench Press',
 '[{"name":"Bench Press"}]', NULL),

('sumo-deadlift-1rm', 'Sumo Deadlift 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Sumo Deadlift',
 '[{"name":"Sumo Deadlift"}]', NULL),

('thruster-1rm', 'Thruster 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Thruster (from the rack or full squat clean thruster)',
 '[{"name":"Thruster"}]', NULL),

('cluster-1rm', 'Cluster 1RM', 'weightlifting', 'For Load',
 'weight', 'Establish a 1 rep max Cluster (squat clean into thruster)',
 '[{"name":"Cluster"}]', NULL)

ON CONFLICT (slug) DO NOTHING;
