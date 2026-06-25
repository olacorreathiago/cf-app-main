-- =============================================================================
-- 00004_wods_rls.sql
-- WOD module: enums, benchmark library, wods/wod_results/prs tables + RLS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUM CHANGES
-- -----------------------------------------------------------------------------

-- wod_type: rename Strength→For Load, add Tabata, remove Chipper
-- PostgreSQL cannot rename or delete enum values — we recreate the type.
-- Safeguard: cascade drops dependent columns, re-added below.

ALTER TABLE public.wods   DROP COLUMN IF EXISTS type;
ALTER TABLE public.wods   DROP COLUMN IF EXISTS score_type; -- doesn't exist yet, safety

DROP TYPE IF EXISTS public.wod_type CASCADE;
CREATE TYPE public.wod_type AS ENUM (
  'AMRAP',
  'For Time',
  'For Load',
  'EMOM',
  'Tabata',
  'Custom'
);

-- score_type: add 'distance' (metres / calories)
ALTER TABLE public.wod_results DROP COLUMN IF EXISTS score_type; -- doesn't exist yet, safety
DROP TYPE IF EXISTS public.score_type CASCADE;
CREATE TYPE public.score_type AS ENUM (
  'time',
  'reps',
  'weight',
  'rounds+reps',
  'distance'
);

-- wod_category: new enum
DROP TYPE IF EXISTS public.wod_category CASCADE;
CREATE TYPE public.wod_category AS ENUM (
  'girls',
  'heroes',
  'notables',
  'games',
  'weightlifting',
  'original'
);

-- -----------------------------------------------------------------------------
-- 2. BENCHMARK_WODS — platform-level library (no box_id, no RLS isolation)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.benchmark_wods (
  slug             text PRIMARY KEY,
  name             text NOT NULL,
  category         public.wod_category NOT NULL,
  type             public.wod_type NOT NULL,
  description      text,
  movements        jsonb NOT NULL DEFAULT '[]',
  time_cap_minutes int,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Everyone can read the benchmark library; only super_admin can write (via service role)
ALTER TABLE public.benchmark_wods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read benchmarks"
  ON public.benchmark_wods FOR SELECT
  USING (true);

-- -----------------------------------------------------------------------------
-- 3. SEED — classic benchmark WODs
-- -----------------------------------------------------------------------------

INSERT INTO public.benchmark_wods (slug, name, category, type, description, movements, time_cap_minutes) VALUES

-- GIRLS
('fran',    'Fran',    'girls', 'For Time',
 '21-15-9 reps for time of: Thrusters (43/30 kg) and Pull-ups',
 '[{"name":"Thruster","rx_weight":"43 kg / 30 kg"},{"name":"Pull-up"}]', NULL),

('helen',   'Helen',   'girls', 'For Time',
 '3 rounds for time of: 400 m Run, 21 Kettlebell Swings (24/16 kg), 12 Pull-ups',
 '[{"name":"Run","distance_m":400},{"name":"Kettlebell Swing","rx_weight":"24 kg / 16 kg"},{"name":"Pull-up"}]', NULL),

('grace',   'Grace',   'girls', 'For Time',
 '30 Clean & Jerks for time (61/43 kg)',
 '[{"name":"Clean & Jerk","rx_weight":"61 kg / 43 kg"}]', NULL),

('diane',   'Diane',   'girls', 'For Time',
 '21-15-9 reps for time of: Deadlifts (102/70 kg) and Handstand Push-ups',
 '[{"name":"Deadlift","rx_weight":"102 kg / 70 kg"},{"name":"Handstand Push-up"}]', NULL),

('chelsea', 'Chelsea', 'girls', 'EMOM',
 'Every minute on the minute for 30 minutes: 5 Pull-ups, 10 Push-ups, 15 Air Squats',
 '[{"name":"Pull-up"},{"name":"Push-up"},{"name":"Air Squat"}]', 30),

('angie',   'Angie',   'girls', 'For Time',
 'For time: 100 Pull-ups, 100 Push-ups, 100 Sit-ups, 100 Air Squats',
 '[{"name":"Pull-up"},{"name":"Push-up"},{"name":"Sit-up"},{"name":"Air Squat"}]', NULL),

('barbara', 'Barbara', 'girls', 'For Time',
 '5 rounds for time: 20 Pull-ups, 30 Push-ups, 40 Sit-ups, 50 Air Squats — 3 min rest between rounds',
 '[{"name":"Pull-up"},{"name":"Push-up"},{"name":"Sit-up"},{"name":"Air Squat"}]', NULL),

('cindy',   'Cindy',   'girls', 'AMRAP',
 'AMRAP in 20 minutes: 5 Pull-ups, 10 Push-ups, 15 Air Squats',
 '[{"name":"Pull-up"},{"name":"Push-up"},{"name":"Air Squat"}]', 20),

('elizabeth','Elizabeth','girls','For Time',
 '21-15-9 reps for time of: Squat Cleans (61/43 kg) and Ring Dips',
 '[{"name":"Squat Clean","rx_weight":"61 kg / 43 kg"},{"name":"Ring Dip"}]', NULL),

('kelly',   'Kelly',   'girls', 'For Time',
 '5 rounds for time: 400 m Run, 30 Box Jumps (61/51 cm), 30 Wall Balls (9/6 kg)',
 '[{"name":"Run","distance_m":400},{"name":"Box Jump","rx_weight":"61 cm / 51 cm"},{"name":"Wall Ball","rx_weight":"9 kg / 6 kg"}]', NULL),

('isabel',  'Isabel',  'girls', 'For Time',
 '30 Snatches for time (61/43 kg)',
 '[{"name":"Snatch","rx_weight":"61 kg / 43 kg"}]', NULL),

('jackie',  'Jackie',  'girls', 'For Time',
 'For time: 1 000 m Row, 50 Thrusters (20/15 kg), 30 Pull-ups',
 '[{"name":"Row","distance_m":1000},{"name":"Thruster","rx_weight":"20 kg / 15 kg"},{"name":"Pull-up"}]', NULL),

('karen',   'Karen',   'girls', 'For Time',
 '150 Wall Balls for time (9/6 kg)',
 '[{"name":"Wall Ball","rx_weight":"9 kg / 6 kg"}]', NULL),

('linda',   'Linda',   'girls', 'For Time',
 '10-9-8-7-6-5-4-3-2-1 reps for time: Deadlift (1.5× BW), Bench Press (BW), Clean (0.75× BW)',
 '[{"name":"Deadlift"},{"name":"Bench Press"},{"name":"Clean"}]', NULL),

('mary',    'Mary',    'girls', 'AMRAP',
 'AMRAP in 20 minutes: 5 Handstand Push-ups, 10 Pistols (alternating), 15 Pull-ups',
 '[{"name":"Handstand Push-up"},{"name":"Pistol"},{"name":"Pull-up"}]', 20),

('nancy',   'Nancy',   'girls', 'For Time',
 '5 rounds for time: 400 m Run, 15 Overhead Squats (43/30 kg)',
 '[{"name":"Run","distance_m":400},{"name":"Overhead Squat","rx_weight":"43 kg / 30 kg"}]', NULL),

('amanda',  'Amanda',  'girls', 'For Time',
 '9-7-5 reps for time of: Muscle-ups and Squat Snatches (61/43 kg)',
 '[{"name":"Muscle-up"},{"name":"Squat Snatch","rx_weight":"61 kg / 43 kg"}]', NULL),

-- HEROES
('murph',   'Murph',   'heroes', 'For Time',
 'For time (with 20/14 kg vest): 1 mile Run, 100 Pull-ups, 200 Push-ups, 300 Air Squats, 1 mile Run — partition the pull-ups, push-ups and squats as needed.',
 '[{"name":"Run","distance_m":1609},{"name":"Pull-up"},{"name":"Push-up"},{"name":"Air Squat"},{"name":"Run","distance_m":1609}]', NULL),

('dt',      'DT',      'heroes', 'For Time',
 '5 rounds for time: 12 Deadlifts (70/47 kg), 9 Hang Power Cleans, 6 Push Jerks',
 '[{"name":"Deadlift","rx_weight":"70 kg / 47 kg"},{"name":"Hang Power Clean"},{"name":"Push Jerk"}]', NULL),

('jason',   'Jason',   'heroes', 'For Time',
 '100 Muscle-ups for time',
 '[{"name":"Muscle-up"}]', NULL),

('ryan',    'Ryan',    'heroes', 'For Time',
 '5 rounds for time: 7 Muscle-ups, 21 Burpees',
 '[{"name":"Muscle-up"},{"name":"Burpee"}]', NULL),

('loredo',  'Loredo',  'heroes', 'For Time',
 '6 rounds for time: 24 Air Squats, 24 Push-ups, 24 Walking Lunges, 400 m Run',
 '[{"name":"Air Squat"},{"name":"Push-up"},{"name":"Walking Lunge"},{"name":"Run","distance_m":400}]', NULL),

('michael', 'Michael', 'heroes', 'For Time',
 '3 rounds for time: 800 m Run, 50 Back Extensions, 50 Sit-ups',
 '[{"name":"Run","distance_m":800},{"name":"Back Extension"},{"name":"Sit-up"}]', NULL),

('josh',    'Josh',    'heroes', 'For Time',
 '21-15-9 reps for time of: Overhead Squats (48/34 kg) and Burpees',
 '[{"name":"Overhead Squat","rx_weight":"48 kg / 34 kg"},{"name":"Burpee"}]', NULL),

-- NOTABLES
('fight-gone-bad', 'Fight Gone Bad', 'notables', 'For Time',
 '3 rounds of 1 min at each station with 1 min rest: Wall Balls (9 kg), Sumo Deadlift High Pull (35 kg), Box Jump (51 cm), Push Press (35 kg), Row (calories) — score is total reps',
 '[{"name":"Wall Ball","rx_weight":"9 kg"},{"name":"Sumo Deadlift High Pull","rx_weight":"35 kg"},{"name":"Box Jump","rx_weight":"51 cm"},{"name":"Push Press","rx_weight":"35 kg"},{"name":"Row"}]', NULL),

('filthy-fifty', 'Filthy Fifty', 'notables', 'For Time',
 'For time: 50 Box Jumps, 50 Jumping Pull-ups, 50 Kettlebell Swings, 50 Walking Lunges, 50 Knees-to-Elbows, 50 Push Press (20 kg), 50 Back Extensions, 50 Wall Balls, 50 Burpees, 50 Double-unders',
 '[{"name":"Box Jump"},{"name":"Jumping Pull-up"},{"name":"Kettlebell Swing"},{"name":"Walking Lunge"},{"name":"Knees-to-Elbows"},{"name":"Push Press"},{"name":"Back Extension"},{"name":"Wall Ball"},{"name":"Burpee"},{"name":"Double-under"}]', NULL),

('the-seven', 'The Seven', 'notables', 'For Time',
 '7 rounds for time: 7 Handstand Push-ups, 7 Thrusters (50/35 kg), 7 Knees-to-Elbows, 7 Deadlifts (102/70 kg), 7 Burpees, 7 Kettlebell Swings (32 kg), 7 Pull-ups',
 '[{"name":"Handstand Push-up"},{"name":"Thruster"},{"name":"Knees-to-Elbows"},{"name":"Deadlift"},{"name":"Burpee"},{"name":"Kettlebell Swing"},{"name":"Pull-up"}]', NULL),

-- WEIGHTLIFTING
('back-squat-1rm',  'Back Squat 1RM',  'weightlifting', 'For Load',
 'Establish a 1 rep max Back Squat',
 '[{"name":"Back Squat"}]', NULL),

('front-squat-1rm', 'Front Squat 1RM', 'weightlifting', 'For Load',
 'Establish a 1 rep max Front Squat',
 '[{"name":"Front Squat"}]', NULL),

('deadlift-1rm',    'Deadlift 1RM',    'weightlifting', 'For Load',
 'Establish a 1 rep max Deadlift',
 '[{"name":"Deadlift"}]', NULL),

('clean-1rm',       'Clean 1RM',       'weightlifting', 'For Load',
 'Establish a 1 rep max Clean',
 '[{"name":"Clean"}]', NULL),

('clean-and-jerk-1rm', 'Clean & Jerk 1RM', 'weightlifting', 'For Load',
 'Establish a 1 rep max Clean & Jerk',
 '[{"name":"Clean & Jerk"}]', NULL),

('snatch-1rm',      'Snatch 1RM',      'weightlifting', 'For Load',
 'Establish a 1 rep max Snatch',
 '[{"name":"Snatch"}]', NULL),

('overhead-squat-1rm', 'Overhead Squat 1RM', 'weightlifting', 'For Load',
 'Establish a 1 rep max Overhead Squat',
 '[{"name":"Overhead Squat"}]', NULL),

('shoulder-press-1rm', 'Shoulder Press 1RM', 'weightlifting', 'For Load',
 'Establish a 1 rep max Shoulder Press',
 '[{"name":"Shoulder Press"}]', NULL),

('push-press-1rm',  'Push Press 1RM',  'weightlifting', 'For Load',
 'Establish a 1 rep max Push Press',
 '[{"name":"Push Press"}]', NULL),

-- GAMES (selections from CrossFit Games)
('open-11-1', '11.1 Open', 'games', 'AMRAP',
 'AMRAP in 10 minutes: 30 Double-unders, 15 Power Snatches (35/25 kg)',
 '[{"name":"Double-under"},{"name":"Power Snatch","rx_weight":"35 kg / 25 kg"}]', 10),

('open-12-1', '12.1 Open', 'games', 'AMRAP',
 'AMRAP in 7 minutes: Burpees',
 '[{"name":"Burpee"}]', 7),

('open-13-1', '13.1 Open', 'games', 'AMRAP',
 'AMRAP in 17 minutes: 40 Burpees, 30 Snatches (35/25 kg), 30 Burpees, 30 Snatches (60/43 kg), 20 Burpees, 30 Snatches (75/52 kg), 10 Burpees, max Snatches (100/70 kg)',
 '[{"name":"Burpee"},{"name":"Snatch"}]', 17)

ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. WODS TABLE — add new columns (type already dropped above, re-add)
-- -----------------------------------------------------------------------------

ALTER TABLE public.wods
  ADD COLUMN IF NOT EXISTS type          public.wod_type     NOT NULL DEFAULT 'Custom',
  ADD COLUMN IF NOT EXISTS category      public.wod_category NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS benchmark_slug text REFERENCES public.benchmark_wods(slug) ON DELETE SET NULL;

-- Restore score_type column on wod_results (was dropped above via CASCADE)
ALTER TABLE public.wod_results
  ADD COLUMN IF NOT EXISTS score_type public.score_type NOT NULL DEFAULT 'time';

-- -----------------------------------------------------------------------------
-- 5. INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS wods_box_id_idx            ON public.wods (box_id);
CREATE INDEX IF NOT EXISTS wods_scheduled_for_idx     ON public.wods (scheduled_for);
CREATE INDEX IF NOT EXISTS wods_published_at_idx      ON public.wods (published_at);
CREATE INDEX IF NOT EXISTS wods_benchmark_slug_idx    ON public.wods (benchmark_slug);
CREATE INDEX IF NOT EXISTS wod_results_wod_id_idx     ON public.wod_results (wod_id);
CREATE INDEX IF NOT EXISTS wod_results_user_id_idx    ON public.wod_results (user_id);
CREATE INDEX IF NOT EXISTS prs_user_id_idx            ON public.prs (user_id);
CREATE INDEX IF NOT EXISTS prs_movement_idx           ON public.prs (user_id, movement);

-- -----------------------------------------------------------------------------
-- 6. RLS — WODS
-- Staff: full CRUD on their box's wods
-- Athletes: read only published wods of their box
-- -----------------------------------------------------------------------------

ALTER TABLE public.wods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can view all wods"
  ON public.wods FOR SELECT
  USING (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

CREATE POLICY "athletes can view published wods"
  ON public.wods FOR SELECT
  USING (
    published_at IS NOT NULL
    AND box_id IN (SELECT public.my_box_ids())
  );

CREATE POLICY "staff can insert wods"
  ON public.wods FOR INSERT
  WITH CHECK (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

CREATE POLICY "staff can update wods"
  ON public.wods FOR UPDATE
  USING  (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'))
  WITH CHECK (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

CREATE POLICY "staff can delete wods"
  ON public.wods FOR DELETE
  USING (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

-- -----------------------------------------------------------------------------
-- 7. RLS — WOD_RESULTS
-- Athletes: insert and view own results
-- Staff: view all results in their box
-- -----------------------------------------------------------------------------

ALTER TABLE public.wod_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athlete can insert own result"
  ON public.wod_results FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND box_id IN (SELECT public.my_box_ids())
  );

CREATE POLICY "athlete can view own results"
  ON public.wod_results FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "staff can view box results"
  ON public.wod_results FOR SELECT
  USING (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

CREATE POLICY "athlete can update own result"
  ON public.wod_results FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "athlete can delete own result"
  ON public.wod_results FOR DELETE
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 8. RLS — PRS
-- Athletes: insert and view own PRs
-- Staff: view all PRs in their box
-- -----------------------------------------------------------------------------

ALTER TABLE public.prs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athlete can insert own pr"
  ON public.prs FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND box_id IN (SELECT public.my_box_ids())
  );

CREATE POLICY "athlete can view own prs"
  ON public.prs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "staff can view box prs"
  ON public.prs FOR SELECT
  USING (public.has_box_role(box_id, 'owner', 'partner', 'manager', 'coach'));

CREATE POLICY "athlete can update own pr"
  ON public.prs FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
