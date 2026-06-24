-- Distribución de registros VeriFactu por estado (una fila por estado). Runtime inyecta :hub_id.
-- Alimenta un bar-list de cumplimiento. Datos reales de verifactu_record.
SELECT status AS label, COUNT(*) AS total
FROM verifactu_record
WHERE hub_id = :hub_id AND is_deleted = 0
GROUP BY status
ORDER BY total DESC;
