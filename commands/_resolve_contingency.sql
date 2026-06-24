-- (interno) Saca un registro de la cola de contingencia tras transmitirse con éxito (o si la
-- entrada quedó obsoleta porque el registro ya está aceptado). Intención del motor nativo
-- first-party (ADR-0009, handlers transmit_one / process_contingency_queue). Runtime inyecta
-- :hub_id/:now/:current_user_id.
UPDATE verifactu_contingencyqueue
SET status = 'sent', is_deleted = 1, deleted_at = :now, updated_by = :current_user_id, updated_at = :now
WHERE record_id = :record_id AND hub_id = :hub_id AND is_deleted = 0;
