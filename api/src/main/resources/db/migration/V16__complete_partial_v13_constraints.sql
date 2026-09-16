-- V16: Complete numeric-field check constraints that partial V13 variants never applied
--
-- The shared developer database was migrated with a partial V13 variant that added
-- every numeric check constraint except the syllabus_modules / syllabus_topics /
-- quiz_questions ones. The committed V13 (the exact intended migration) defines all
-- of them. This migration idempotently fills the gap so any database that applied a
-- partial V13 variant converges to the same schema as a fresh database. It is a no-op
-- on databases where committed V13 already created these constraints.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'syllabus_modules') THEN
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'syllabus_modules' AND column_name = 'duration_value')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_syllabus_modules_duration') THEN
        EXECUTE 'ALTER TABLE syllabus_modules ADD CONSTRAINT chk_syllabus_modules_duration
                 CHECK (duration_value IS NULL OR duration_value >= 1)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'syllabus_modules' AND column_name = 'order_index')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_syllabus_modules_order') THEN
        EXECUTE 'ALTER TABLE syllabus_modules ADD CONSTRAINT chk_syllabus_modules_order
                 CHECK (order_index >= 0)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'syllabus_topics' AND column_name = 'duration_hours')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_syllabus_topics_duration') THEN
        EXECUTE 'ALTER TABLE syllabus_topics ADD CONSTRAINT chk_syllabus_topics_duration
                 CHECK (duration_hours IS NULL OR duration_hours >= 1)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'syllabus_topics' AND column_name = 'order_index')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_syllabus_topics_order') THEN
        EXECUTE 'ALTER TABLE syllabus_topics ADD CONSTRAINT chk_syllabus_topics_order
                 CHECK (order_index >= 0)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'quiz_questions' AND column_name = 'order_index')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_quiz_questions_order') THEN
        EXECUTE 'ALTER TABLE quiz_questions ADD CONSTRAINT chk_quiz_questions_order
                 CHECK (order_index >= 0)';
    END IF;
END $$;