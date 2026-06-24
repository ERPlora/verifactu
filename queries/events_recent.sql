-- Eventos VeriFactu recientes (más nuevos primero, máx. 8) para el widget timeline.
-- Runtime inyecta :hub_id. Datos reales de verifactu_event (log append-only).
SELECT id, event_type AS title, message AS description, timestamp, severity AS status
FROM verifactu_event
WHERE hub_id = :hub_id AND is_deleted = 0
ORDER BY timestamp DESC
LIMIT 8;
