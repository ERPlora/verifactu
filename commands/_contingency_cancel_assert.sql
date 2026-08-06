-- Assert for the cancel guard (verifactu#27): the cancel is only valid if the guarded
-- UPDATE actually applied (entry 'cancelled' with updated_at = :now — :now pins THIS
-- command run). A missing entry, or one whose linked record the AEAT does not have yet,
-- leaves EXISTS=0, violates the CHECK (ok = 1) of verifactu__gate and rolls back the
-- whole transaction.
INSERT INTO verifactu__gate (gate, ok)
SELECT 'contingency_cancel_requires_accepted_record',
       CASE WHEN EXISTS (SELECT 1 FROM verifactu_contingencyqueue
               WHERE id = :queue_id AND hub_id = :hub_id
                 AND status = 'cancelled' AND updated_at = :now) THEN 1 ELSE 0 END;
