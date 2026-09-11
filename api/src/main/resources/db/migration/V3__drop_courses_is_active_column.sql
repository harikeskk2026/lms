-- Drop the is_active column from courses; the entity does not use it.
ALTER TABLE courses DROP COLUMN IF EXISTS is_active;
