-- Resumen de la cola de contingencia VeriFactu (singleton, una fila). Runtime inyecta :hub_id.
-- Cuenta registros aún en cola (pending | retrying). severity = 'danger' si hay alguno,
-- 'success' si la cola está vacía. Datos reales de verifactu_contingencyqueue.
SELECT
  COUNT(*) AS queued_count,
  CASE WHEN COUNT(*) = 0 THEN 'success' ELSE 'danger' END AS severity
FROM verifactu_contingencyqueue
WHERE hub_id = :hub_id
  AND is_deleted = 0
  AND status IN ('pending', 'retrying');
