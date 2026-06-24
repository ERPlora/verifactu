-- Snapshot de los últimos registros que la AEAT tiene de este hub (resultado de la última
-- consulta ConsultaFactuSistemaFacturacion). Runtime inyecta :hub_id. Query de tipo lista:
-- el motor de paginación (createListController) añade ORDER BY/LIMIT. Lo alimenta el motor
-- nativo (handlers query_aeat_records / recover_from_aeat).
SELECT id, issuer_nif, invoice_number, invoice_date, record_type,
       record_hash, aeat_csv, estado, query_timestamp
FROM verifactu_aeat_record
WHERE hub_id = :hub_id AND is_deleted = 0
