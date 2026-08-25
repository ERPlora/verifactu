-- Verifactu · 015 — verifactu#60: la regla «cuota contra su tipo» medía con una vara que la fila
-- no puede sostener, y mataba tiques LEGÍTIMOS.
--
-- QUÉ PASABA. `013` (verifactu#53, publicada en 1.5.16) exigía
-- `|quota − base × rate/100| ≤ 1,5` céntimos en cada línea del desglose, «la misma tolerancia que
-- invoice.audit». No lo era. El documento lo construye `invoice`, y `invoice` **redondea la cuota
-- POR LÍNEA y la suma** (`build_invoice`: `e.quota += main_quota`, deliberado y comentado allí;
-- ADR-0123 §4 sigue sin aplicarse ahí — ERPlora/invoice#65). El desglose que emite NO cumple
-- `cuota = base × tipo` salvo por tolerancia, y la desviación **crece con el número de líneas**:
-- hasta medio céntimo por línea, y suman. Por eso `invoice.audit` tolera UN CÉNTIMO POR LÍNEA
-- agregada (`e.lines.max(1)`), no 1,5 fijo.
--
-- Con 1,5 céntimos, un tique perfectamente legítimo moría aquí:
--
--   4 líneas de 0,50 € al 21 % → `round_half_up(10,5) = 11` cuatro veces → desglose `200 / 44`,
--   y el 21 % de 200 son 42. `invoice.audit` lo emite (tolerancia 4); el CHECK lo rechazaba.
--
-- Y no era raro: sobre 20.000 tiques simulados por celda, el porcentaje de tiques LEGÍTIMOS
-- rechazados era 5,3 % con 5 líneas al 21 % en TPV, 22,5 % con 12, y 33,2 % con 12 al 10 %. Una
-- mesa de doce perdía su registro fiscal una de cada tres veces: el `INSERT` revienta, el listener
-- `invoice.created → verifactu.records.ingest_invoice` falla, y la factura queda emitida SIN
-- registro VeriFactu.
--
-- POR QUÉ NO SE AFLOJA A «1 CÉNTIMO POR LÍNEA». Porque ese dato **no está en la fila y no puede
-- estarlo**: `verifactu_record` guarda el desglose, no el documento del que salió. La regla con
-- líneas se queda donde las líneas se pueden contar — el motor nativo, `audit_amounts`
-- (`hub/crates/verifactu/src/lib.rs`, ERPlora/hub#1180), que las lee en la MISMA lectura acotada
-- que ya hacía (ADR-0058) y tolera `líneas + 0,5` céntimos.
--
-- LO QUE SÍ PUEDE MEDIR LA TABLA, y es lo que se pone aquí: que la cuota declarada **no se aleje de
-- lo que su tipo justifica más que ese mismo importe, más un céntimo** — es decir, que no lo
-- DOBLE. Es row-local, no necesita saber nada del documento, y:
--
--   · es inofensiva para el redondeo por línea, y no de palabra: `|Σq − Σe| ≤ 0,5 × líneas`, y se
--     comprobó por fuerza bruta que `≤ |e| + 1` en las **420.000** combinaciones legítimas de
--     (tipo de IVA o de recargo × base de línea 1…3000 × 1…200 líneas). Cero falsos rechazos;
--   · sigue cazando el caso que abrió verifactu#53: 99,99 € de cuota sobre una base de 5,45 € al
--     21 %, donde el tipo justifica 1,14 €;
--   · deja pasar, a propósito, los descuadres del orden del redondeo. Ésos son del motor, que sabe
--     cuántas líneas hay, y de `invoice`, que sabe el bruto cobrado. Una tabla que intenta juzgar
--     lo que no puede ver acaba rechazando ventas reales, que es de lo que va esta migración.
--
-- El motor aplica **el menor de los dos techos** (`líneas + 0,5` y `|e| + 1`), así que es siempre
-- igual o más estricto que esta restricción: un registro no puede pasar su puerta para morir aquí
-- con un error crudo de Postgres.
--
-- `NOT VALID` y migración nueva por el mismo motivo que `013`: los registros ya encadenados son
-- inmutables (RD 1007/2023), y `013` ya está aplicada en la flota desde 1.5.16 — una restricción se
-- sustituye con su propia migración, no editando la que ya corrió.

ALTER TABLE verifactu_record
    DROP CONSTRAINT IF EXISTS ck_verifactu_record_quota_matches_declared_rate;

ALTER TABLE verifactu_record
    ADD CONSTRAINT ck_verifactu_record_quota_matches_declared_rate CHECK (
        record_type <> 'alta'
        OR NOT JSON_EXISTS(tax_breakdown, '$[*] ? ((@.quota - @.base * @.rate / 100).abs() > (@.base * @.rate / 100).abs() + 1 || (exists(@.surcharge_quota) && (@.surcharge_quota - @.base * @.surcharge_rate / 100).abs() > (@.base * @.surcharge_rate / 100).abs() + 1))' FALSE ON ERROR)
    ) NOT VALID;
