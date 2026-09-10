-- Mock interviews now link students via mock_interview_candidates (many-to-one).
-- The legacy single-student 'student_id' column on mock_interviews is no longer
-- mapped by the entity, so every INSERT left it NULL and violated its NOT NULL
-- constraint (HTTP 409 "conflicts with existing data"). Drop the dead column.
ALTER TABLE mock_interviews DROP CONSTRAINT IF EXISTS fkho8lj0jiv2rcl0xwkgtciatbg;
ALTER TABLE mock_interviews DROP COLUMN IF EXISTS student_id;