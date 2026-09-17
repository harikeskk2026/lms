-- Remove HYBRID as a batch mode. Only ONLINE and OFFLINE remain.
--
-- Existing HYBRID batches are converted to ONLINE: this preserves their
-- ability to keep scheduling online meetings/classes going forward (which
-- MeetingLinkServiceImpl only allows for ONLINE batches — a HYBRID->OFFLINE
-- mapping would silently take that capability away). No attendance,
-- DailyClass, or MeetingLink data is touched by this migration — only the
-- batches.mode column and its CHECK constraint change.
UPDATE batches SET mode = 'ONLINE' WHERE mode = 'HYBRID';

DO $$
DECLARE
  existing_constraint text;
BEGIN
  SELECT con.conname INTO existing_constraint
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
  WHERE rel.relname = 'batches'
    AND con.contype = 'c'
    AND att.attname = 'mode';

  IF existing_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE batches DROP CONSTRAINT %I', existing_constraint);
  END IF;

  ALTER TABLE batches ADD CONSTRAINT batches_mode_check
    CHECK (mode IN ('ONLINE', 'OFFLINE'));
END $$;
