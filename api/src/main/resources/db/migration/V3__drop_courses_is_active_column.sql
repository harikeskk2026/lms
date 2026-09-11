-- Drop the is_active / active column from courses; the entity does not use it.
ALTER TABLE courses DROP COLUMN IF EXISTS is_active;
ALTER TABLE courses DROP COLUMN IF EXISTS active;
