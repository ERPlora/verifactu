-- (interno) Aplica el resultado de un intento de transmisión a la AEAT sobre el registro.
-- Intención del motor nativo first-party (ADR-0009, handler `transmit_record`):
-- status accepted|rejected|error + respuesta AEAT (código/mensaje/CSV) + XML enviado.
--
-- `xml_sha256` y `transmission_id` (verifactu#75) van por COALESCE contra la PROPIA columna, no
-- contra un literal, y por dos razones distintas. Una: el binder pasa NULL por cada `:param`
-- ausente y NO aplica el DEFAULT de la columna, así que un hub cuyo motor todavía no los manda
-- reventaría el NOT NULL y dejaría de presentar TODO. Dos: un intento posterior que no los
-- aporte no puede borrar el rastro forense del que sí se entregó.
UPDATE verifactu_record SET
    status                 = :status,
    transmission_timestamp = :now,
    retry_count            = retry_count + :retry_increment,
    aeat_response_code     = :aeat_response_code,
    aeat_response_message  = :aeat_response_message,
    aeat_csv               = :aeat_csv,
    xml_content            = :xml_content,
    xml_storage_path       = :xml_storage_path,
    xml_sha256             = COALESCE(:xml_sha256, xml_sha256),
    transmission_id        = COALESCE(:transmission_id, transmission_id),
    updated_by             = :current_user_id,
    updated_at             = :now
WHERE id = :record_id AND hub_id = :hub_id AND is_deleted = 0;
