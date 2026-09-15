-- V6: Standardize course duration to '<number> (days|weeks|months|years)'
--
-- Phase 1: Normalize recognized patterns
-- Phase 2: Flag unrecognized records as NULL for manual review
-- Phase 3: Verify no invalid durations remain
-- Phase 4: Add CHECK constraint


-- ============================================================
-- Phase 1a: Migrate hours → days (≤24h) or weeks (>24h)
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  num_val INTEGER;
  new_dur TEXT;
BEGIN
  FOR rec IN
    SELECT id, duration
    FROM courses
    WHERE duration IS NOT NULL
      AND duration ~* '^\d+\s*(hours?|hrs?|h)$'
  LOOP

    num_val := (regexp_match(rec.duration, '^\s*(\d+)', 'i'))[1]::INTEGER;

    IF num_val <= 24 THEN
      new_dur := CEIL(num_val::NUMERIC / 8)::INTEGER || ' days';
    ELSE
      new_dur := ROUND(num_val::NUMERIC / 40)::INTEGER || ' weeks';
    END IF;

    RAISE NOTICE
      'Course %: hours migration "%" -> "%"',
      rec.id,
      rec.duration,
      new_dur;

    UPDATE courses
    SET duration = new_dur
    WHERE id = rec.id;

  END LOOP;
END $$;


-- ============================================================
-- Phase 1b: Migrate ranges
-- Example: "6-8 weeks" → "8 weeks"
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  parts TEXT[];
  upper_val TEXT;
  unit TEXT;
  new_dur TEXT;
BEGIN
  FOR rec IN
    SELECT id, duration
    FROM courses
    WHERE duration IS NOT NULL
      AND duration ~* '^\d+\s*-\s*\d+\s*(days?|weeks?|months?|years?)$'
  LOOP

    parts := regexp_match(
      rec.duration,
      '^\s*\d+\s*-\s*(\d+)\s*(days?|weeks?|months?|years?)$',
      'i'
    );

    upper_val := parts[1];
    unit := LOWER(parts[2]);

    -- Normalize singular to plural
    IF unit NOT LIKE '%s' THEN
      unit := unit || 's';
    END IF;

    new_dur := upper_val || ' ' || unit;

    RAISE NOTICE
      'Course %: range migration "%" -> "%"',
      rec.id,
      rec.duration,
      new_dur;

    UPDATE courses
    SET duration = new_dur
    WHERE id = rec.id;

  END LOOP;
END $$;


-- ============================================================
-- Phase 1c: Normalize singular to plural and casing
-- Example: "1 day" → "1 days"
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  num_val TEXT;
  unit TEXT;
  new_dur TEXT;
BEGIN
  FOR rec IN
    SELECT id, duration
    FROM courses
    WHERE duration IS NOT NULL
      AND duration ~* '^\d+\s+(day|week|month|year)$'
  LOOP

    num_val := (
      regexp_match(
        rec.duration,
        '^\s*(\d+)',
        'i'
      )
    )[1];

    unit := LOWER(
      (
        regexp_match(
          rec.duration,
          '\d+\s+([a-zA-Z]+)',
          'i'
        )
      )[1]
    );

    -- Normalize singular to plural
    IF unit NOT LIKE '%s' THEN
      unit := unit || 's';
    END IF;

    new_dur := num_val || ' ' || unit;

    IF new_dur != rec.duration THEN

      RAISE NOTICE
        'Course %: singular normalization "%" -> "%"',
        rec.id,
        rec.duration,
        new_dur;

      UPDATE courses
      SET duration = new_dur
      WHERE id = rec.id;

    END IF;

  END LOOP;
END $$;


-- ============================================================
-- Phase 1d: Normalize casing for already-plural forms
-- Example: "12 WEEKS" → "12 weeks"
-- ============================================================

UPDATE courses
SET duration = LOWER(duration)
WHERE duration IS NOT NULL
  AND duration ~* '^\d+\s+(days|weeks|months|years)$'
  AND duration != LOWER(duration);


-- ============================================================
-- IMPORTANT FIX:
-- Allow NULL durations before Phase 2.
--
-- Phase 2 intentionally sets unrecognized durations to NULL
-- for manual review.
-- ============================================================

ALTER TABLE courses
  ALTER COLUMN duration DROP NOT NULL;


-- ============================================================
-- Phase 2: Flag unrecognized durations as NULL
-- for manual review
-- ============================================================

DO $$
DECLARE
  rec RECORD;
BEGIN

  FOR rec IN
    SELECT id, duration
    FROM courses
    WHERE duration IS NOT NULL
      AND duration !~ '^\d+\s+(days|weeks|months|years)$'
  LOOP

    RAISE NOTICE
      'Course %: UNKNOWN duration "%" set to NULL for manual review',
      rec.id,
      rec.duration;

    UPDATE courses
    SET duration = NULL
    WHERE id = rec.id;

  END LOOP;

END $$;


-- ============================================================
-- Phase 3: Verify
-- Abort if any non-null duration is invalid
-- ============================================================

DO $$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM courses
    WHERE duration IS NOT NULL
      AND duration !~ '^[1-9][0-9]* (days|weeks|months|years)$'
  ) THEN

    RAISE EXCEPTION
      'Migration failed: invalid durations still exist after normalization';

  END IF;

END $$;


-- ============================================================
-- Phase 4: Add CHECK constraint
--
-- NULL is allowed because unrecognized records are flagged
-- for manual review.
-- ============================================================

ALTER TABLE courses
  ADD CONSTRAINT chk_courses_duration_standard
  CHECK (
    duration IS NULL
    OR duration ~ '^[1-9][0-9]* (days|weeks|months|years)$'
  );