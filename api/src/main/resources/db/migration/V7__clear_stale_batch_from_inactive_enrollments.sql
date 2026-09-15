-- V7: Clear stale batch_id on inactive enrollments to prevent zombie batch resurrection
-- When a student is removed from a batch, their enrollment should remain active with batch=NULL.
-- Any historical inactive enrollments that still reference a batch are stale/zombie records.

UPDATE enrollments
SET batch_id = NULL
WHERE is_active = false AND batch_id IS NOT NULL;
