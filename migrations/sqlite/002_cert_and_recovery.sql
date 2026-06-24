-- VeriFactu · migración 002 (SQLite): certificado en BD + soporte de recuperación de cadena.
--
-- 1) certificate_pkcs12: bytes del .p12 en base64 dentro de la propia config (no en disco).
--    Motivo: un hub cloud (ECS) tiene FS efímero — la ruta se pierde al reiniciar el
--    contenedor. Guardar los bytes en la BD lo hace robusto en cloud y local por igual.
--    El crate nativo lo lee de aquí (fallback a certificate_path por compatibilidad).
--    NOTA: hoy en claro (igual que certificate_password). El cifrado at-rest queda pendiente
--    (ADR-0016: master key / Fernet) — ver TODO del crate hub/crates/verifactu.
ALTER TABLE verifactu_config ADD COLUMN certificate_pkcs12 TEXT NOT NULL DEFAULT '';

-- 2) verifactu_aeat_record: snapshot de los registros que la AEAT tiene de este emisor,
--    obtenidos por el servicio de consulta (ConsultaFactuSistemaFacturacion). Sirve para
--    (a) mostrar "los últimos N registros de la AEAT" y (b) respaldar la recuperación de la
--    cadena tras un fallo/migración (recover_from_aeat toma el último de aquí como ancla).
--    No es la cadena local: es lo que la Agencia Tributaria ha confirmado.
CREATE TABLE IF NOT EXISTS verifactu_aeat_record (
    id              TEXT PRIMARY KEY,
    hub_id          TEXT NOT NULL,
    issuer_nif      TEXT NOT NULL,
    invoice_number  TEXT NOT NULL DEFAULT '',
    invoice_date    TEXT NOT NULL DEFAULT '',            -- ISO YYYY-MM-DD
    record_type     TEXT NOT NULL DEFAULT 'alta',        -- alta | anulacion (según AEAT)
    record_hash     TEXT NOT NULL DEFAULT '',            -- huella confirmada por la AEAT
    aeat_csv        TEXT NOT NULL DEFAULT '',            -- código seguro de verificación
    estado          TEXT NOT NULL DEFAULT '',            -- estado del registro en la AEAT
    query_timestamp TEXT NOT NULL,                        -- cuándo se consultó (ISO 8601 con huso)
    is_deleted      INTEGER NOT NULL DEFAULT 0,
    deleted_at      TEXT,
    created_by      TEXT,
    updated_by      TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT
);
CREATE INDEX IF NOT EXISTS ix_verifactu_aeat_record_hub_nif ON verifactu_aeat_record (hub_id, issuer_nif, is_deleted);
CREATE INDEX IF NOT EXISTS ix_verifactu_aeat_record_hub_ts  ON verifactu_aeat_record (hub_id, query_timestamp);
