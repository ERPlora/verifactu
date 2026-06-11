-- (interno) Encola (o re-programa) un registro en la cola de contingencia. Intención del
-- motor nativo first-party (ADR-0009). Una entrada por registro (índice único en
-- record_id): el ON CONFLICT actualiza intento/backoff calculados por el motor
-- (5,10,20,40,60 min cap — WASM-TODO.md §5).
INSERT INTO verifactu_contingencyqueue (
    id, hub_id, record_id, priority, queued_at, attempts,
    last_attempt_at, last_error, next_attempt_at, status,
    is_deleted, created_by, updated_by, created_at, updated_at
) VALUES (
    :queue_id, :hub_id, :record_id, :priority, :now, :attempts,
    :last_attempt_at, :last_error, :next_attempt_at, :queue_status,
    0, :current_user_id, :current_user_id, :now, :now
)
ON CONFLICT(record_id) DO UPDATE SET
    attempts        = excluded.attempts,
    last_attempt_at = excluded.last_attempt_at,
    last_error      = excluded.last_error,
    next_attempt_at = excluded.next_attempt_at,
    status          = excluded.status,
    updated_by      = :current_user_id,
    updated_at      = :now;
