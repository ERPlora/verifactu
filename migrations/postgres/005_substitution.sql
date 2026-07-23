-- ADR-0140: datos de la factura SUSTITUIDA para el bloque VeriFactu `FacturasSustituidas`.
-- Cuando el registro es de una F3 (factura completa en sustitución de una simplificada F2), el XML
-- de alta debe declarar la F2 sustituida con su nº+serie, fecha y NIF del emisor (XSD:
-- FacturasSustituidas/IDFacturaSustituida, tipo IDFacturaARType). Se snapshotean en el registro
-- (como el resto de campos fiscales) para que el path de contingencia/reintento reconstruya el mismo
-- XML sin volver a leer la factura. Vacío en registros normales (no F3).
ALTER TABLE verifactu_record ADD COLUMN substitutes_number TEXT NOT NULL DEFAULT '';
ALTER TABLE verifactu_record ADD COLUMN substitutes_date   TEXT NOT NULL DEFAULT '';
ALTER TABLE verifactu_record ADD COLUMN substitutes_nif    TEXT NOT NULL DEFAULT '';
