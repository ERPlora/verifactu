-- (interno) Aplica el resultado de un intento de transmisión a la AEAT sobre el registro.
-- Intención del motor nativo first-party (ADR-0009, handler `transmit_record`):
-- status accepted|rejected|error + respuesta AEAT (código/mensaje/CSV) + XML enviado.
UPDATE verifactu_record SET
    status                 = :status,
    transmission_timestamp = :now,
    retry_count            = retry_count + :retry_increment,
    aeat_response_code     = :aeat_response_code,
    aeat_response_message  = :aeat_response_message,
    aeat_csv               = :aeat_csv,
    xml_content            = :xml_content,
    xml_storage_path       = :xml_storage_path,
    updated_by             = :current_user_id,
    updated_at             = :now
WHERE id = :record_id AND hub_id = :hub_id AND is_deleted = 0;
