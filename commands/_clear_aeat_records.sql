-- (interno) Marca como borrados los registros AEAT previos de este emisor antes de volcar el
-- nuevo snapshot de consulta (cada consulta reemplaza al anterior). Intención del motor nativo
-- first-party (ADR-0009). Runtime inyecta :hub_id/:now/:current_user_id.
UPDATE verifactu_aeat_record
SET is_deleted = 1, deleted_at = :now, updated_by = :current_user_id, updated_at = :now
WHERE hub_id = :hub_id AND issuer_nif = :issuer_nif AND is_deleted = 0;
