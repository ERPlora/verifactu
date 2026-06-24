-- Registro VeriFactu de una factura dada (para el QR / CSV en el documento de venta).
-- Runtime inyecta :hub_id. Devuelve el más reciente por sequence_number (por reintentos/anulación).
SELECT id, invoice_id, invoice_number, invoice_date, record_type,
       status, aeat_csv, qr_url, record_hash
FROM verifactu_record
WHERE invoice_id = :invoice_id AND hub_id = :hub_id AND is_deleted = 0
ORDER BY sequence_number DESC
LIMIT 1;
