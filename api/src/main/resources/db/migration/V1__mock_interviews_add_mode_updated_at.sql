
-- 1. Add 'mode' column safely, backfill any existing NULL rows, enforce NOT NULL, and drop temporary default
ALTER TABLE mock_interviews ADD COLUMN IF NOT EXISTS mode varchar(16) DEFAULT 'ONLINE';
UPDATE mock_interviews SET mode = 'ONLINE' WHERE mode IS NULL;
ALTER TABLE mock_interviews ALTER COLUMN mode SET NOT NULL;
ALTER TABLE mock_interviews ALTER COLUMN mode DROP DEFAULT;

-- 2. Add 'mode' check constraint safely without failing if it already exists
ALTER TABLE mock_interviews DROP CONSTRAINT IF EXISTS mock_interviews_mode_check;
ALTER TABLE mock_interviews ADD CONSTRAINT mock_interviews_mode_check CHECK (mode IN ('ONLINE', 'OFFLINE'));

-- 3. Add 'updated_at' column safely, backfill any existing NULL rows, enforce NOT NULL, and drop temporary default
ALTER TABLE mock_interviews ADD COLUMN IF NOT EXISTS updated_at timestamp(6) with time zone DEFAULT now();
UPDATE mock_interviews SET updated_at = now() WHERE updated_at IS NULL;
ALTER TABLE mock_interviews ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE mock_interviews ALTER COLUMN updated_at DROP DEFAULT;