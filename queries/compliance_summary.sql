-- Resumen de cumplimiento VeriFactu (singleton, una fila). Runtime inyecta :hub_id.
-- Cuenta registros pendientes de envío/confirmación a la AEAT (estados no terminales
-- exitosos): pending | retry | error | rejected. trend = 'down' si 0 pendientes (bien),
-- 'up' si hay pendientes (requiere atención). Datos reales de verifactu_record.
SELECT
  COUNT(*) AS pending_count,
  CASE WHEN COUNT(*) = 0 THEN 'down' ELSE 'up' END AS trend
FROM verifactu_record
WHERE hub_id = :hub_id
  AND is_deleted = 0
  AND status IN ('pending', 'retry', 'error', 'rejected');
