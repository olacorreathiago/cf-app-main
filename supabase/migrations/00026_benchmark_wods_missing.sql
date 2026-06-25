-- Add missing benchmark WODs from the CrossFit benchmark catalog (Girls + Heroes).
-- Existing slugs are left untouched via ON CONFLICT DO NOTHING.

INSERT INTO public.benchmark_wods (slug, name, category, type, description, movements, time_cap_minutes) VALUES

-- ───────────────── GIRLS ─────────────────

('annie', 'Annie', 'girls', 'For Time',
 '50-40-30-20-10 reps for time: Double-unders, Sit-ups',
 '[{"name":"Double-under"},{"name":"Sit-up"}]', NULL),

('eva', 'Eva', 'girls', 'For Time',
 '5 rounds for time: 800 m Run, 30 Kettlebell Swings (32/22 kg), 30 Pull-ups',
 '[{"name":"Run","distance_m":800},{"name":"Kettlebell Swing","rx_weight":"32 kg / 22 kg"},{"name":"Pull-up"}]', NULL),

('lynne', 'Lynne', 'girls', 'Custom',
 '5 rounds for max reps (no time limit between sets): Bodyweight Bench Press, Pull-ups — record total reps',
 '[{"name":"Bench Press"},{"name":"Pull-up"}]', NULL),

('nicole', 'Nicole', 'girls', 'AMRAP',
 'AMRAP in 20 minutes: 400 m Run, max Pull-ups — record total pull-up reps',
 '[{"name":"Run","distance_m":400},{"name":"Pull-up"}]', 20),

-- ───────────────── HEROES ─────────────────

('abbate', 'Abbate', 'heroes', 'For Time',
 'For time: 1 mile Run, 21 Clean & Jerks (70/50 kg), 800 m Run, 21 Clean & Jerks, 1 mile Run',
 '[{"name":"Run","distance_m":1609},{"name":"Clean & Jerk","rx_weight":"70 kg / 50 kg"},{"name":"Run","distance_m":800},{"name":"Clean & Jerk","rx_weight":"70 kg / 50 kg"},{"name":"Run","distance_m":1609}]', NULL),

('badger', 'Badger', 'heroes', 'For Time',
 '3 rounds for time: 30 Squat Cleans (43/30 kg), 30 Pull-ups, 800 m Run',
 '[{"name":"Squat Clean","rx_weight":"43 kg / 30 kg"},{"name":"Pull-up"},{"name":"Run","distance_m":800}]', NULL),

('bradley', 'Bradley', 'heroes', 'For Time',
 '10 rounds for time: 100 m Sprint, 10 Pull-ups, 100 m Sprint, 10 Burpees — rest 30 seconds between rounds',
 '[{"name":"Run","distance_m":100},{"name":"Pull-up"},{"name":"Run","distance_m":100},{"name":"Burpee"}]', NULL),

('bradshaw', 'Bradshaw', 'heroes', 'For Time',
 '10 rounds for time: 3 Handstand Push-ups, 6 Deadlifts (102/70 kg), 12 Pull-ups, 24 Double-unders',
 '[{"name":"Handstand Push-up"},{"name":"Deadlift","rx_weight":"102 kg / 70 kg"},{"name":"Pull-up"},{"name":"Double-under"}]', NULL),

('bulger', 'Bulger', 'heroes', 'For Time',
 '10 rounds for time: 150 m Run, 7 Chest-to-Bar Pull-ups, 7 Front Squats (61/43 kg), 7 Handstand Push-ups',
 '[{"name":"Run","distance_m":150},{"name":"Chest-to-Bar Pull-up"},{"name":"Front Squat","rx_weight":"61 kg / 43 kg"},{"name":"Handstand Push-up"}]', NULL),

('daniel', 'Daniel', 'heroes', 'For Time',
 'For time: 50 Pull-ups, 400 m Run, 21 Thrusters (43/30 kg), 800 m Run, 21 Thrusters, 400 m Run, 50 Pull-ups',
 '[{"name":"Pull-up"},{"name":"Run","distance_m":400},{"name":"Thruster","rx_weight":"43 kg / 30 kg"},{"name":"Run","distance_m":800},{"name":"Thruster","rx_weight":"43 kg / 30 kg"},{"name":"Run","distance_m":400},{"name":"Pull-up"}]', NULL),

('donny', 'Donny', 'heroes', 'For Time',
 '21-15-9-9-15-21 reps for time: Deadlifts (102/70 kg), Burpees',
 '[{"name":"Deadlift","rx_weight":"102 kg / 70 kg"},{"name":"Burpee"}]', NULL),

('hortman', 'Hortman', 'heroes', 'AMRAP',
 'AMRAP in 45 minutes: 800 m Run, 80 Air Squats, 8 Muscle-ups',
 '[{"name":"Run","distance_m":800},{"name":"Air Squat"},{"name":"Muscle-up"}]', 45),

('jared', 'Jared', 'heroes', 'For Time',
 '4 rounds for time: 800 m Run, 40 Pull-ups, 70 Push-ups',
 '[{"name":"Run","distance_m":800},{"name":"Pull-up"},{"name":"Push-up"}]', NULL),

('jt', 'JT', 'heroes', 'For Time',
 '21-15-9 reps for time: Handstand Push-ups, Ring Dips, Push-ups',
 '[{"name":"Handstand Push-up"},{"name":"Ring Dip"},{"name":"Push-up"}]', NULL),

('manion', 'Manion', 'heroes', 'For Time',
 '7 rounds for time: 400 m Run, 29 Back Squats (61/43 kg)',
 '[{"name":"Run","distance_m":400},{"name":"Back Squat","rx_weight":"61 kg / 43 kg"}]', NULL),

('nate', 'Nate', 'heroes', 'AMRAP',
 'AMRAP in 20 minutes: 2 Muscle-ups, 4 Handstand Push-ups, 8 Kettlebell Swings (32/22 kg)',
 '[{"name":"Muscle-up"},{"name":"Handstand Push-up"},{"name":"Kettlebell Swing","rx_weight":"32 kg / 22 kg"}]', 20),

('rahoi', 'Rahoi', 'heroes', 'AMRAP',
 'AMRAP in 12 minutes: 12 Box Jumps (61/51 cm), 6 Thrusters (43/30 kg), 6 Bar-facing Burpees',
 '[{"name":"Box Jump","rx_weight":"61 cm / 51 cm"},{"name":"Thruster","rx_weight":"43 kg / 30 kg"},{"name":"Bar-facing Burpee"}]', 12),

('randy', 'Randy', 'heroes', 'For Time',
 '75 Power Snatches for time (34/24 kg)',
 '[{"name":"Power Snatch","rx_weight":"34 kg / 24 kg"}]', NULL)

ON CONFLICT (slug) DO NOTHING;
