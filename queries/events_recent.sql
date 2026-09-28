-- Most recent VeriFactu events (newest first, max 8) for the home widget.
-- Runtime injects :hub_id. Real data from verifactu_event (append-only log).
-- Raw columns on purpose (verifactu#139): the widget component composes the type label and the
-- sentence from `event_type` and `details.message_key` against the module catalogue, and formats
-- `timestamp` on the hub clock. `message` stays as the fallback for a key the catalogue lacks.
SELECT id, event_type, severity, message, details, timestamp
FROM verifactu_event
WHERE hub_id = :hub_id AND is_deleted = 0
ORDER BY timestamp DESC
LIMIT 8;
