-- Último resultado de la prueba en vivo (evento `diagnostic` que escribe el handler
-- run_diagnostics): estado del certificado, huella/QR de muestra y respuesta de la AEAT.
-- Runtime inyecta :hub_id. La UI (panel de prueba en Ajustes) lee `details` (JSON) y lo pinta.
SELECT id, severity, message, details, timestamp
FROM verifactu_event
WHERE hub_id = :hub_id AND is_deleted = 0 AND event_type = 'diagnostic'
ORDER BY timestamp DESC
LIMIT 1;
