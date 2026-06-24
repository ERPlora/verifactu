-- (interno) Inserta un registro tal cual lo devuelve el servicio de consulta de la AEAT
-- (ConsultaFactuSistemaFacturacion). Snapshot para mostrar "los últimos N de la AEAT" y para
-- respaldar la recuperación de cadena. Intención del motor nativo first-party (ADR-0009:
-- handlers query_aeat_records / recover_from_aeat). Runtime inyecta :hub_id/:now/usuario.
INSERT INTO verifactu_aeat_record (
    id, hub_id, issuer_nif, invoice_number, invoice_date, record_type,
    record_hash, aeat_csv, estado, query_timestamp,
    is_deleted, created_by, updated_by, created_at, updated_at
) VALUES (
    :rec_id, :hub_id, :issuer_nif, :invoice_number, :invoice_date, :record_type,
    :record_hash, :aeat_csv, :estado, :query_timestamp,
    0, :current_user_id, :current_user_id, :now, :now
);
