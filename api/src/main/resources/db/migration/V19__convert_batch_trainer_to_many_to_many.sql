-- V19: Convert Batch-Trainer relationship from one-to-many (batches.trainer_id)
-- to many-to-many via a batch_trainers join table.

-- 1. Create the join table
CREATE TABLE IF NOT EXISTS batch_trainers (
    batch_id BIGINT NOT NULL,
    trainer_id BIGINT NOT NULL,
    PRIMARY KEY (batch_id, trainer_id),
    CONSTRAINT fk_batch_trainers_batch FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    CONSTRAINT fk_batch_trainers_trainer FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_batch_trainers_trainer ON batch_trainers(trainer_id);
CREATE INDEX IF NOT EXISTS idx_batch_trainers_batch ON batch_trainers(batch_id);

-- 2. Backfill existing single-trainer assignments into the join table
INSERT INTO batch_trainers (batch_id, trainer_id)
SELECT id, trainer_id FROM batches WHERE trainer_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Drop any legacy FK constraint on batches.trainer_id (none exist in the
-- baseline schema - trainer_id was a plain Hibernate-managed column with no
-- DB-level FK - but this mirrors the V5 pattern defensively in case one was
-- added out-of-band on some environment).
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
        WHERE tc.table_name = 'batches'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'trainer_id'
    ) LOOP
        EXECUTE 'ALTER TABLE batches DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- 4. Drop the legacy single-trainer column
ALTER TABLE batches DROP COLUMN IF EXISTS trainer_id CASCADE;
