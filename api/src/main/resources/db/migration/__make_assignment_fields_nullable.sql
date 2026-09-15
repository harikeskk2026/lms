-- V8__make_assignment_fields_nullable.sql
-- Make assignment fields nullable to support draft status saving without dates or description

ALTER TABLE assignments ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE assignments ALTER COLUMN due_date DROP NOT NULL;
ALTER TABLE assignments ALTER COLUMN publish_time DROP NOT NULL;
ALTER TABLE assignments ALTER COLUMN close_time DROP NOT NULL;
ALTER TABLE assignments ALTER COLUMN description DROP NOT NULL;
