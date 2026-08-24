-- Verifactu · 014 — verifactu#55: una rectificativa GUARDA la factura que rectifica.
--
-- POR QUÉ. El envío DIFERIDO —registro encadenado sin certificado y remitido a mano después—
-- reconstruye el sobre de la AEAT desde LA FILA (`SELECT * FROM verifactu_record`), no desde la
-- factura. El motor nativo ya entrega estos siete campos a `verifactu._insert_record`
-- (hub#1023), y la tabla no tenía dónde ponerlos: el sobre salía válido pero ANÓNIMO —sin
-- `FacturasRectificadas`—, que es justo el bloque con el que Hacienda casa la devolución con la
-- venta que corrige.
--
-- Calcado de `005_substitution.sql`, que hace lo mismo para la sustitución (F3 →
-- `FacturasSustituidas`). Mismo tipo de dato del XSD (`IDFacturaARType`), mismo motivo: es un
-- SNAPSHOT fiscal, para que contingencia y reintento reconstruyan el mismo XML sin releer la
-- factura. Vacío en los registros que no rectifican nada, que son casi todos.
--
-- Los cuatro identificadores son `TEXT NOT NULL DEFAULT ''` como los `substitutes_*`. El binder
-- del runtime pasa NULL por los opcionales omitidos y NO aplica los DEFAULT de columna, así que
-- `_insert_record` los envuelve en `COALESCE(:campo, '')` — sin eso, una venta corriente dejaría
-- de encadenar.
--
-- ⚠️ Los tres `rectified_*` son NULLABLE A PROPÓSITO, sin `DEFAULT 0`. En `ImporteRectificacion`
-- la diferencia entre «no hay importe» y «el importe es cero» es la diferencia entre no declarar
-- el bloque y declararle a Hacienda que se rectifica una base de cero euros (hub#324). Un
-- `DEFAULT 0` convertiría toda rectificativa en una sustitutiva de base cero.
--
-- Aditiva y sin tocar el pasado: los registros ya encadenados son INMUTABLES por RD 1007/2023.
-- Las columnas nacen vacías en ellos y ni la huella ni la cadena las miran — `record_hash` se
-- calcula en el motor sobre una lista cerrada de campos que no incluye ninguno de estos siete.
--
-- Numeración: la `011` es un HUECO PERMANENTE. La migración de verifactu#53 nació ahí y se
-- renumeró a `013` al rebasarse sobre `main`, porque `011` quedaba por debajo de la `012` que la
-- flota ya había aplicado. Rellenar el hueco reintroduciría esa misma divergencia de orden.
ALTER TABLE verifactu_record ADD COLUMN rectifies_number TEXT NOT NULL DEFAULT '';
ALTER TABLE verifactu_record ADD COLUMN rectifies_date TEXT NOT NULL DEFAULT '';
ALTER TABLE verifactu_record ADD COLUMN rectifies_nif TEXT NOT NULL DEFAULT '';
ALTER TABLE verifactu_record ADD COLUMN rectification_type TEXT NOT NULL DEFAULT '';
ALTER TABLE verifactu_record ADD COLUMN rectified_base_amount INTEGER;
ALTER TABLE verifactu_record ADD COLUMN rectified_tax_amount INTEGER;
ALTER TABLE verifactu_record ADD COLUMN rectified_surcharge_amount INTEGER;
