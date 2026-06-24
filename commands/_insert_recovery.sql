-- (interno) Inserta un "ancla de recuperación" en la cadena: una fila marcador con la huella
-- de un registro YA confirmado (por la AEAT o aportado manualmente), para que el SIGUIENTE
-- create_record encadene desde ella (su previous_hash = :record_hash de esta fila).
-- No se transmite (status 'accepted': ya estaba en la AEAT) y validate_chain la trata como
-- límite de confianza (no recomputa su huella). Intención del motor nativo first-party
-- (ADR-0009: handlers recover_from_aeat / recover_manual). Runtime inyecta :hub_id/:now/usuario.
INSERT INTO verifactu_record (
    id, hub_id, record_type, sequence_number, invoice_id,
    issuer_nif, issuer_name, invoice_number, invoice_date, invoice_type, description,
    base_amount, tax_rate, tax_amount, total_amount,
    previous_hash, record_hash, is_first_record, generation_timestamp,
    status, retry_count, aeat_response_code, aeat_response_message, aeat_csv,
    qr_url, qr_generated, xml_content,
    is_deleted, created_by, updated_by, created_at, updated_at
) VALUES (
    :record_id, :hub_id, 'recovery', :sequence_number, NULL,
    :issuer_nif, :issuer_name, :invoice_number, :invoice_date, 'F1', :description,
    0, 0, 0, 0,
    '', :record_hash, 0, :now,
    'accepted', 0, '', '', :aeat_csv,
    '', 0, '',
    0, :current_user_id, :current_user_id, :now, :now
);
