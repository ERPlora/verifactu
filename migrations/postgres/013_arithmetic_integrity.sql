-- Verifactu · 013 — verifactu#53: un registro aritméticamente IMPOSIBLE no se sella.
--
-- POR QUÉ. Este módulo es el último eslabón: calcula la huella SHA-256, gasta un número de
-- secuencia, encadena y encola para la AEAT. Aceptaba los importes que le dieran. Una pasada de QA
-- fiscal selló y encadenó un registro que declaraba `rate 21.0` con `tax_amount 9999` sobre
-- `base_amount 545` —99,99 € de cuota sobre una base de 5,45 €— y una F1 ordinaria de −6,00 € — los
-- dos viajaron VERBATIM al `CuotaTotal` que se remite a Hacienda.
--
-- Aguas arriba ya está tapado (sales#124, invoice#50 y su `audit()`), pero eso quita PRODUCTORES de
-- descuadres, no cierra la puerta: `verifactu.records.create` es un command público del manifest y
-- `_insert_record` inserta lo que se le pase. La guarda va en la TABLA porque el motor nativo no es
-- el único que escribe, y una restricción de tabla es la única que ninguna puerta puede saltarse.
-- El NOMBRE de la restricción es el código de dominio que ve quien la incumple.
--
-- ⚠️ La comprobación obvia NO basta: `base + cuota = total` pasa igual —`545 + 9999 = 10544` es
-- internamente consistente—. Lo que hacía falta es contrastar la cuota contra el TIPO declarado.
--
-- `NOT VALID`: los registros ya encadenados son INMUTABLES por RD 1007/2023 y no se pueden corregir
-- a posteriori — validar contra ellos abortaría el arranque del hub. Las reglas juzgan lo que llega
-- de ahora en adelante, que es donde se puede evitar el daño.
--
-- Fuera de alcance a propósito: la suma de las líneas contra la cabecera. Esa la exige `invoice`
-- (`invoice.totals_mismatch`), que es el dueño del documento, y aquí no cabe sin una función.

-- 1. La cuota de cada línea del desglose contra el tipo que la propia línea declara.
--    Tolerancia ±1 céntimo por línea de redondeo (la misma que `invoice.audit`), +0,5 porque se
--    compara contra el valor sin redondear. Cubre también el recargo de equivalencia, que va en su
--    propio par `surcharge_rate`/`surcharge_quota` (ADR-0186, invoice#21).
--    Un desglose ilegible se deja pasar aquí: no hay nada declarado que contrastar, y de ese caso
--    se ocupa la regla 2 con el tipo de la fila.
ALTER TABLE verifactu_record
    ADD CONSTRAINT ck_verifactu_record_quota_matches_declared_rate CHECK (
        record_type <> 'alta'
        OR NOT JSON_EXISTS(tax_breakdown, '$[*] ? ((@.quota - @.base * @.rate / 100).abs() > 1.5 || (exists(@.surcharge_quota) && (@.surcharge_quota - @.base * @.surcharge_rate / 100).abs() > 1.5))' FALSE ON ERROR)
    ) NOT VALID;

-- 2. Sin desglose legible (filas legacy con `'{}'` de 004, rectificativas —que lo dejan vacío— o un
--    `records.create` que no lo manda), lo único que queda es el `tax_rate` de la fila. Cuando SÍ
--    hay desglose esta regla se aparta: manda la 1, y además ahí `tax_rate` es el tipo EFECTIVO
--    (`derive_tax_rate`), que en una factura mixta o con recargo no puede explicar la cuota.
--    Tolerancia: 1 céntimo de redondeo + el error que introduce guardar el tipo efectivo con dos
--    decimales (media diezmilésima de la base). Sin ese margen una factura grande se rechazaría por
--    la precisión de su propio tipo.
--    El `strict` de `$[*]` es imprescindible: en modo lax Postgres ENVUELVE un objeto en un array,
--    así que un `'{}'` legacy PARECERÍA traer una línea y esta regla se apartaría dejando el hueco
--    abierto. En strict eso es un error, y `FALSE ON ERROR` lo convierte en «no hay desglose» —
--    que es justo la fila que hay que juzgar. Ese mismo `FALSE ON ERROR` cubre un `tax_breakdown`
--    que ni siquiera es JSON.
--    Sin castes: `base_amount` es entero y `tax_rate` viene en coma flotante, así que la
--    multiplicación ya sale en coma flotante. `NUMERIC`/`JSONB` no son del subconjunto portable
--    (ADR-0007) y `@?` lo confunde el linter con un placeholder posicional — de ahí `JSON_EXISTS`.
ALTER TABLE verifactu_record
    ADD CONSTRAINT ck_verifactu_record_quota_matches_row_rate CHECK (
        record_type <> 'alta'
        OR JSON_EXISTS(tax_breakdown, 'strict $[*]' FALSE ON ERROR)
        OR ABS(tax_amount - base_amount * tax_rate / 100) <= 1 + CEIL(ABS(base_amount) * 0.00005)
    ) NOT VALID;

-- 3. Una factura ordinaria no totaliza negativo. Un importe negativo es una RECTIFICATIVA
--    (R1…R5, emitida por `invoice.rectify`), que es el camino legal de una devolución y aquí sigue
--    pasando. «≤ 0» no, deliberadamente: un tique 100 % invitado suma 0,00 € honestamente y sigue
--    necesitando su F2 (mismo criterio que `invoice.negative_total`).
ALTER TABLE verifactu_record
    ADD CONSTRAINT ck_verifactu_record_ordinary_total_not_negative CHECK (
        record_type <> 'alta'
        OR invoice_type NOT IN ('F1', 'F2', 'F3')
        OR (total_amount >= 0 AND base_amount + tax_amount >= 0)
    ) NOT VALID;
