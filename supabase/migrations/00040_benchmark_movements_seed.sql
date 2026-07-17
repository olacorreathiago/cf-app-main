-- Seed monostructural (endurance) and gymnastics capacity benchmarks.
-- Endurance: classic run/row distances, scored by time.
-- Gymnastics: max unbroken reps tests, scored by reps.

INSERT INTO public.benchmark_wods (slug, name, category, type, score_type, description, movements, time_cap_minutes) VALUES

-- ───────────────── ENDURANCE — RUN ─────────────────

('run-100m', '100 m Run', 'endurance', 'For Time',
 'time', '100 m sprint for time',
 '[{"name":"Run","distance_m":100}]', NULL),

('run-200m', '200 m Run', 'endurance', 'For Time',
 'time', '200 m sprint for time',
 '[{"name":"Run","distance_m":200}]', NULL),

('run-400m', '400 m Run', 'endurance', 'For Time',
 'time', '400 m run for time',
 '[{"name":"Run","distance_m":400}]', NULL),

('run-600m', '600 m Run', 'endurance', 'For Time',
 'time', '600 m run for time',
 '[{"name":"Run","distance_m":600}]', NULL),

('run-800m', '800 m Run', 'endurance', 'For Time',
 'time', '800 m run for time',
 '[{"name":"Run","distance_m":800}]', NULL),

('run-1000m', '1 000 m Run', 'endurance', 'For Time',
 'time', '1 000 m run for time',
 '[{"name":"Run","distance_m":1000}]', NULL),

('run-1-mile', '1 Mile Run', 'endurance', 'For Time',
 'time', '1 mile (1 609 m) run for time',
 '[{"name":"Run","distance_m":1609}]', NULL),

('run-5k', '5 km Run', 'endurance', 'For Time',
 'time', '5 km run for time',
 '[{"name":"Run","distance_m":5000}]', NULL),

('run-10k', '10 km Run', 'endurance', 'For Time',
 'time', '10 km run for time',
 '[{"name":"Run","distance_m":10000}]', NULL),

-- ───────────────── ENDURANCE — ROW ─────────────────

('row-500m', '500 m Row', 'endurance', 'For Time',
 'time', '500 m row for time',
 '[{"name":"Row","distance_m":500}]', NULL),

('row-1000m', '1 000 m Row', 'endurance', 'For Time',
 'time', '1 000 m row for time',
 '[{"name":"Row","distance_m":1000}]', NULL),

('row-2000m', '2 000 m Row', 'endurance', 'For Time',
 'time', '2 000 m row for time',
 '[{"name":"Row","distance_m":2000}]', NULL),

('row-5000m', '5 000 m Row', 'endurance', 'For Time',
 'time', '5 000 m row for time',
 '[{"name":"Row","distance_m":5000}]', NULL),

-- ───────────────── GYMNASTICS — MAX UNBROKEN ─────────────────

('max-pull-ups', 'Max Pull-ups', 'gymnastics', 'Custom',
 'reps', 'Max unbroken Pull-ups (kipping allowed) — record total reps',
 '[{"name":"Pull-up"}]', NULL),

('max-strict-pull-ups', 'Max Strict Pull-ups', 'gymnastics', 'Custom',
 'reps', 'Max unbroken strict Pull-ups — record total reps',
 '[{"name":"Strict Pull-up"}]', NULL),

('max-c2b-pull-ups', 'Max Chest-to-Bar Pull-ups', 'gymnastics', 'Custom',
 'reps', 'Max unbroken Chest-to-Bar Pull-ups — record total reps',
 '[{"name":"Chest-to-Bar Pull-up"}]', NULL),

('max-toes-to-bar', 'Max Toes-to-Bar', 'gymnastics', 'Custom',
 'reps', 'Max unbroken Toes-to-Bar — record total reps',
 '[{"name":"Toes-to-Bar"}]', NULL),

('max-bar-muscle-ups', 'Max Bar Muscle-ups', 'gymnastics', 'Custom',
 'reps', 'Max unbroken Bar Muscle-ups — record total reps',
 '[{"name":"Bar Muscle-up"}]', NULL),

('max-ring-muscle-ups', 'Max Ring Muscle-ups', 'gymnastics', 'Custom',
 'reps', 'Max unbroken Ring Muscle-ups — record total reps',
 '[{"name":"Ring Muscle-up"}]', NULL),

('max-hspu', 'Max Handstand Push-ups', 'gymnastics', 'Custom',
 'reps', 'Max unbroken Handstand Push-ups (kipping allowed) — record total reps',
 '[{"name":"Handstand Push-up"}]', NULL),

('max-strict-hspu', 'Max Strict Handstand Push-ups', 'gymnastics', 'Custom',
 'reps', 'Max unbroken strict Handstand Push-ups — record total reps',
 '[{"name":"Strict Handstand Push-up"}]', NULL),

('max-push-ups', 'Max Push-ups', 'gymnastics', 'Custom',
 'reps', 'Max unbroken Push-ups — record total reps',
 '[{"name":"Push-up"}]', NULL),

('max-ring-dips', 'Max Ring Dips', 'gymnastics', 'Custom',
 'reps', 'Max unbroken Ring Dips — record total reps',
 '[{"name":"Ring Dip"}]', NULL),

('max-double-unders', 'Max Double-unders', 'gymnastics', 'Custom',
 'reps', 'Max unbroken Double-unders — record total reps',
 '[{"name":"Double-under"}]', NULL),

('max-wall-balls', 'Max Wall Balls', 'gymnastics', 'Custom',
 'reps', 'Max unbroken Wall Balls (9/6 kg) — record total reps',
 '[{"name":"Wall Ball","rx_weight":"9 kg / 6 kg"}]', NULL),

('max-pistols', 'Max Pistols', 'gymnastics', 'Custom',
 'reps', 'Max unbroken alternating Pistols — record total reps',
 '[{"name":"Pistol"}]', NULL)

ON CONFLICT (slug) DO NOTHING;
