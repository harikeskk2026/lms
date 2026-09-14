-- V5: Backfill active enrollments from legacy students.batch_id and drop students.batch_id column

-- 1. Ensure an enrollment exists for every student who has a legacy batch assigned
INSERT INTO enrollments (student_id, course_id, batch_id, is_active, enrolled_at)
SELECT s.id, b.course_id, s.batch_id, true, NOW()
FROM students s
JOIN batches b ON s.batch_id = b.id
WHERE s.batch_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.student_id = s.id AND e.course_id = b.course_id
);

-- 2. Backfill enrollment.batch_id from students.batch_id where enrollment has no batch assigned
UPDATE enrollments e
SET batch_id = s.batch_id
FROM students s
JOIN batches b ON s.batch_id = b.id
WHERE e.student_id = s.id
  AND e.course_id = b.course_id
  AND e.batch_id IS NULL
  AND s.batch_id IS NOT NULL;

-- 3. Drop all foreign key constraints referencing batches from students table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'students' 
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'batch_id'
    ) LOOP
        EXECUTE 'ALTER TABLE students DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- 4. Drop the column batch_id from students table
ALTER TABLE students DROP COLUMN IF EXISTS batch_id CASCADE;
