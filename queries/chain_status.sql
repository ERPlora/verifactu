-- Último resultado de validación de la cadena (evento chain_validated / chain_error que escribe
-- el handler validate_chain). Runtime inyecta :hub_id. La UI lo muestra como estado de integridad.
SELECT id, event_type, severity, message, details, timestamp
FROM verifactu_event
WHERE hub_id = :hub_id AND is_deleted = 0
  AND event_type IN ('chain_validated', 'chain_error')
ORDER BY timestamp DESC
LIMIT 1;
