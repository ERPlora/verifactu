-- VeriFactu · migración 003 (SQLite): identidad del OBLIGADO TRIBUTARIO (emisor).
--
-- Distinción clave VeriFactu:
--   * PRODUCTOR del software (SistemaInformatico) = ERPlora, fijo → software_* (no editable).
--   * OBLIGADO TRIBUTARIO (ObligadoEmision) = la empresa/autónomo que emite las facturas (el
--     cliente que usa el Hub), el NIF que representa el certificado. Es lo que la AEAT valida.
-- En registros reales el obligado llega de la factura (invoice). Estos campos guardan el obligado
-- del hub para el ENVÍO DE PRUEBA (diagnóstico) y como valor por defecto.
ALTER TABLE verifactu_config ADD COLUMN issuer_nif  TEXT NOT NULL DEFAULT '';
ALTER TABLE verifactu_config ADD COLUMN issuer_name TEXT NOT NULL DEFAULT '';
