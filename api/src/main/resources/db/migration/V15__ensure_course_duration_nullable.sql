-- V15: Ensure courses.duration is nullable and re-assert the standard duration CHECK
--
-- V12 already dropped NOT NULL and created chk_courses_duration_standard. This migration
-- repeats both steps idempotently so any database (fresh, existing, or production with a
-- former Hibernate-driven NOT NULL column) converges to the same final nullable schema.
ALTER TABLE courses ALTER COLUMN duration DROP NOT NULL;

ALTER TABLE courses
  DROP CONSTRAINT IF EXISTS chk_courses_duration_standard;

ALTER TABLE courses
  ADD CONSTRAINT chk_courses_duration_standard
  CHECK (duration IS NULL OR duration ~ '^[1-9][0-9]* (days|weeks|months|years)$');