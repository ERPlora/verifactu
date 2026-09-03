-- Detalle completo de un registro VeriFactu (incl. respuesta AEAT + cadena de hash).
-- Runtime inyecta :hub_id. Portado de VerifactuService.get_record / routes.record_detail.
--
-- `xml_sha256` y `transmission_id` son la huella de la ENTREGA (migración 016): el digest de los
-- bytes que viajaron y la `Idempotency-Key` con la que la celda fiscal indexa. Se seleccionan
-- aquí porque son las dos piezas con las que soporte cruza un registro de este hub con la línea
-- de log de la celda — y `transmission_id` NO siempre es el id del registro: el re-anclado
-- automático presenta el mismo registro bajo `{id}-rechain-{ancla}`.
SELECT id, sequence_number, invoice_number, invoice_date, invoice_type,
       record_type, issuer_nif, issuer_name, description,
       base_amount, tax_rate, tax_amount, total_amount,
       record_hash, previous_hash, is_first_record, generation_timestamp,
       status, transmission_timestamp, retry_count, next_retry_at,
       aeat_response_code, aeat_response_message, aeat_csv, qr_url,
       xml_storage_path, xml_sha256, transmission_id
FROM verifactu_record
WHERE id = :record_id AND hub_id = :hub_id AND is_deleted = 0
LIMIT 1;
