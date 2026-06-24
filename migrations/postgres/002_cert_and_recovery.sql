-- VeriFactu · migración 002 (Postgres / Aurora). Equivalente a sqlite/002_cert_and_recovery.sql
-- (paridad mecánica, ADR-0007). Tipos del subconjunto portable "ERPlora SQL".

-- 1) Bytes del .p12 (base64) en la propia config — robusto en cloud (FS efímero de ECS).
ALTER TABLE verifactu_config ADD COLUMN IF NOT EXISTS certificate_pkcs12 TEXT NOT NULL DEFAULT '';

-- 2) Snapshot de los registros confirmados por la AEAT (servicio de consulta) — display + recovery.
CREATE TABLE IF NOT EXISTS verifactu_aeat_record (
    id              TEXT PRIMARY KEY,
    hub_id          TEXT NOT NULL,
    issuer_nif      TEXT NOT NULL,
    invoice_number  TEXT NOT NULL DEFAULT '',
    invoice_date    TEXT NOT NULL DEFAULT '',
    record_type     TEXT NOT NULL DEFAULT 'alta',
    record_hash     TEXT NOT NULL DEFAULT '',
    aeat_csv        TEXT NOT NULL DEFAULT '',
    estado          TEXT NOT NULL DEFAULT '',
    query_timestamp TEXT NOT NULL,
    is_deleted      INTEGER NOT NULL DEFAULT 0,
    deleted_at      TEXT,
    created_by      TEXT,
    updated_by      TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT
);
CREATE INDEX IF NOT EXISTS ix_verifactu_aeat_record_hub_nif ON verifactu_aeat_record (hub_id, issuer_nif, is_deleted);
CREATE INDEX IF NOT EXISTS ix_verifactu_aeat_record_hub_ts  ON verifactu_aeat_record (hub_id, query_timestamp);
