-- (interno) Inserta el registro VeriFactu calculado por el motor nativo first-party
-- (ADR-0009, hub/crates/verifactu). Solo se invoca como INTENCIÓN del handler
-- `create_record`; el runtime inyecta :hub_id/:current_user_id/:now.
-- Atomicidad de la secuencia: el índice único uq_verifactu_record_hub_seq
-- (hub_id, issuer_nif, sequence_number) cierra la ventana TOCTOU — si dos altas
-- compiten con la misma ancla, la segunda viola el índice y su transacción revierte.
INSERT INTO verifactu_record (
    id, hub_id, record_type, sequence_number, invoice_id,
    issuer_nif, issuer_name, invoice_number, invoice_date, invoice_type, description,
    base_amount, tax_rate, tax_breakdown, tax_amount, total_amount,
    previous_hash, record_hash, is_first_record, generation_timestamp,
    status, retry_count, aeat_response_code, aeat_response_message, aeat_csv,
    qr_url, qr_generated, xml_content,
    is_deleted, created_by, updated_by, created_at, updated_at
) VALUES (
    :record_id, :hub_id, :record_type, :sequence_number, :invoice_id,
    :issuer_nif, :issuer_name, :invoice_number, :invoice_date, :invoice_type, :description,
    :base_amount, :tax_rate, :tax_breakdown, :tax_amount, :total_amount,
    :previous_hash, :record_hash, :is_first_record, :generation_timestamp,
    'pending', 0, '', '', '',
    :qr_url, 1, '',
    0, :current_user_id, :current_user_id, :now, :now
);
