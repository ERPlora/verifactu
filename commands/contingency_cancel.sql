-- Cancel a contingency queue entry (status='cancelled').
-- Runtime injects :hub_id, :current_user_id, :now. Ported from routes.cancel_queue_entry.
--
-- GUARD (verifactu#27, VeriFactu FAQ §5): a generated record is chained and REQUIRED — it
-- must reach the AEAT; discarding its retry would leave a generated-but-never-remitted
-- orphan. The UPDATE therefore only applies when the linked record is already registered
-- at the AEAT (status 'accepted', which includes AceptadoConErrores — ADR-0189). For any
-- other state it matches no row and `_contingency_cancel_assert.sql` (next in the chain)
-- violates the verifactu__gate CHECK, rolling back the whole transaction — the
-- `verifactu.contingency.cancelled` outbox event included. The correction path for a
-- record the AEAT does not have is retry/subsanation, never a discard.
UPDATE verifactu_contingencyqueue
SET status     = 'cancelled',
    updated_by = :current_user_id,
    updated_at = :now
WHERE id = :queue_id AND hub_id = :hub_id AND is_deleted = 0
  AND EXISTS (SELECT 1 FROM verifactu_record r
                WHERE r.id = verifactu_contingencyqueue.record_id
                  AND r.hub_id = :hub_id
                  AND r.is_deleted = 0
                  AND r.status = 'accepted');
