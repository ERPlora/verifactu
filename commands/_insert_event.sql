-- (interno) Evento de auditoría VeriFactu (append-only). Intención del motor nativo
-- first-party (ADR-0009): record_created / transmission_success / transmission_failure…
INSERT INTO verifactu_event (
    id, hub_id, record_id, event_type, severity, message, details, timestamp,
    is_deleted, created_by, updated_by, created_at, updated_at
) VALUES (
    :event_id, :hub_id, :record_id, :event_type, :severity, :message, :details, :timestamp,
    0, :current_user_id, :current_user_id, :now, :now
);
