-- V8: Support PDF-authored quiz questions with free-text answer modes
-- (Short Answer / Coding / SQL) without touching existing options-based
-- question authoring or scoring behavior.

-- 1. answer_mode: every existing row was authored via options, so backfill to
--    OPTIONS before enforcing NOT NULL — current scoring/validation for those
--    rows is completely unaffected.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_mode VARCHAR(20);
UPDATE questions SET answer_mode = 'OPTIONS' WHERE answer_mode IS NULL;
ALTER TABLE questions ALTER COLUMN answer_mode SET DEFAULT 'OPTIONS';
ALTER TABLE questions ALTER COLUMN answer_mode SET NOT NULL;

-- 2. Free-text authoring fields — nullable, only populated for FREE_TEXT questions.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_answer_text TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS reference_answer TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_language VARCHAR(30);

-- 3. Student free-text/code/SQL submission per question attempt.
ALTER TABLE question_attempts ADD COLUMN IF NOT EXISTS answer_text TEXT;

-- 4. Ungraded (Coding/SQL) question count per attempt, tracked separately from
--    correct/wrong/skipped so it never distorts existing accuracy calculations.
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS ungraded_count INTEGER;
UPDATE quiz_attempts SET ungraded_count = 0 WHERE ungraded_count IS NULL;
ALTER TABLE quiz_attempts ALTER COLUMN ungraded_count SET DEFAULT 0;
ALTER TABLE quiz_attempts ALTER COLUMN ungraded_count SET NOT NULL;

-- 5. Server-side stored copy of the admin's source PDF for a PDF-created quiz.
--    Deliberately NOT served via /uploads/** (that route is permitAll) — retrieval
--    is only via a new authenticated /api/admin/quizzes/{id}/source-pdf endpoint.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_source_pdfs') THEN
    CREATE TABLE quiz_source_pdfs (
      id BIGSERIAL PRIMARY KEY,
      quiz_id BIGINT NOT NULL UNIQUE REFERENCES quizzes(id),
      original_filename VARCHAR(255) NOT NULL,
      content_type VARCHAR(100),
      file_size BIGINT NOT NULL,
      data BYTEA NOT NULL,
      uploaded_by BIGINT,
      uploaded_at TIMESTAMP NOT NULL DEFAULT now()
    );
  END IF;
END $$;
