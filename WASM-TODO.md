# verifactu — capacidades de host y trabajo pendiente del motor fiscal

> ⚠️ **ADR-0009 (2026-06-10) sigue vigente y ahora está verificado de punta a punta contra
> `module.json`**: el motor fiscal/red es un **plugin nativo first-party**, no un
> `handler.wasm` descargable — no existe `handler/` en este repo. La red TLS-mutua a la AEAT y
> la firma con certificado PKCS#12 exceden el sandbox WASM. Todos los `commands` fiscales llevan
> `handler.type: "native"` en el manifest, apuntando a funciones del crate
> `hub/crates/plugins/verifactu` (fuera de este repo).
>
> **Casi todas las piezas de este documento ya están implementadas** (verificado contra
> `module.json` → `commands.*.handler`, 2026-09-16). Solo queda pendiente la **8** (chequeo
> periódico de expiración del certificado): no hay `scheduled_tasks` para ella en `module.json`
> (el único que existe es `process_contingency`, cada 5 min).

El CRUD plano (config, reintento/cancelación de cola) es SQL declarativo Tier 0
(`commands/*.sql`); las lecturas en `queries/*.sql`. Lo demás es lógica fiscal/criptográfica/de
red, resuelta por el motor nativo.

> Cumplimiento RD 1007/2023 (ES): un VerifactuRecord es **inmutable** una vez emitido. La
> creación va encadenada (hash SHA-256) y atómica por (hub, emisor). VeriFactu es de **solo
> lectura** vía UI; la creación la dispara el evento `invoice.created`/`invoice.rectified` (no
> se edita a mano).

---

## 1. `create_record` — ✅ HECHO (`verifactu.records.create`, nativo `create_record`)

Encadena y sella un registro: ancla de cadena atómica por `(hub_id, issuer_nif, environment)`
con bloqueo de escritura, timestamp de generación, `record_hash = sha256(...)` sobre los campos
del contrato AEAT (`IDEmisorFactura`/`NumSerieFactura`/`FechaExpedicionFactura`/`TipoFactura`/
`CuotaTotal`/`ImporteTotal`/`Huella`/`FechaHoraHusoGenRegistro` para un alta; sin los tres
campos de importe para una anulación), QR de verificación y las intenciones de inserción
(`_insert_record`, `_insert_event`, `_enqueue_contingency` si aplica). `auto_transmit` no
existe: módulo activo = siempre se emite (ADR-0202 R3, verifactu#26).

## 2. Snapshot de la factura desde el evento — ✅ HECHO (`verifactu.records.ingest_invoice`)

El evento no basta por sí solo (trae `invoice_id`/`hub_id`/`invoice_type`/`total`); el motor
resuelve el resto (`issuer_nif`, importes, fecha…) leyendo la fila de `invoice` **por id**, la
única excepción documentada a "nunca leer la tabla de otro módulo" (ver
[concepts.md](docs/concepts.md) §"reads exactly one thing"). Idempotente por diseño: dos
ingestas de la misma factura dejan un único registro (`uq_verifactu_record`, verifactu#100).

## 3. Validación de la cadena — ✅ HECHO (`verifactu.chain.validate`, nativo `validate_chain`)

Recomputa el hash de cada fila y verifica el encadenamiento; las filas `record_type='recovery'`
son anclas de confianza. Solo lectura — no repara nada, y no re-audita importes (eso lo deciden
los `CHECK` de la tabla, [limits.md](docs/limits.md) §"What is checked before a record is
sealed"). Persiste el veredicto como evento, leído por `verifactu.chain.status`.

## 4. QR de verificación AEAT — ✅ HECHO (parte de la pieza 1)

`https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?nif=…&numserie=…&fecha=…&importe=…`.
El **render** del PNG/data-URI, si hace falta, es responsabilidad del host bajo demanda; el
motor solo calcula y guarda la URL.

## 5. Backoff exponencial de la cola — ✅ HECHO (parte de la pieza 7)

5, 10, 20, 40, 60 minutos (capado), documentado en [limits.md](docs/limits.md) §"Retry
behaviour". `contingency_retry.sql`/`contingency_cancel.sql` cubren el reintento/cancelación
manual; el backoff automático vive en `process_contingency_queue`.

## 6. Transmisión a la AEAT — ✅ HECHO (`verifactu.records.transmit`, nativo `transmit_record`)

Construye el sobre SOAP, firma con el certificado (propio) o lo remite por la celda gateway (sin
propio — ver [concepts.md](docs/concepts.md) §"exclusive roads"), parsea la respuesta AEAT
(`aeat_response_code/message/csv`) y actualiza el registro + eventos + cola de contingencia si
falla por conexión.

## 7. Procesado por lotes de la cola — ✅ HECHO (`verifactu.contingency.process`, nativo
`process_contingency_queue`, tarea programada `*/5 * * * *`)

Drena `status IN ('pending','retrying')` en orden `priority ASC, queued_at ASC`, transmite
(pieza 6), aplica backoff (pieza 5) o marca `failed` tras agotar `max_retries`.

## 8. Chequeo de expiración del certificado — ⬜ SIN IMPLEMENTAR

`module.json` no tiene ningún `scheduled_tasks` para esto (el único registrado es
`process_contingency`). Falta:

- tarea programada (diaria, p. ej. `0 8 * * *`);
- leer la expiración del certificado activo y calcular `days_until_expiry`;
- si `days <= 30`: `verifactu_event` `certificate_warning` (`severity: warning` si <30,
  `critical` si <=7 o ya caducado).

Hoy la expiración solo se **muestra** (pantalla de Configuración/Ajustes, lectura pasiva del
certificado) — nadie avisa proactivamente antes de que deje de firmar. Sin issue abierta
localizada en este repo para este punto concreto.

## 9. Recuperación de la cadena de hash — ✅ HECHO (2026-06-23, ADR-0056)

`query_aeat_records` (`verifactu.aeat.query_recent`, consulta
`ConsultaFactuSistemaFacturacion`, vuelca `verifactu_aeat_record`), `recover_from_aeat` /
`recover_manual` (`verifactu.recovery.from_aeat` / `.manual`, insertan un ancla
`record_type='recovery'`). Pantalla: `erp-verifactu-recovery`, solo admin
(`verifactu.configure_verifactu`). Desde v1.5.38 (verifactu#113) el "recuperar desde la AEAT"
enseña su confirmación en vez de dejar la pantalla en negro.

## 10. Widgets del dashboard — ✅ HECHO como widgets, no como página propia

No se añadió una entrada de navegación `dashboard` (regla: sin nav muerta que duplique
Records/Contingency/Events). En su lugar, cuatro widgets del panel del hub (`verifactu.stats.*`):
Pending, Contingency, By status, Events — ver [screens.md](docs/screens.md) §"Dashboard
widgets". Cubre el mismo agregado que se planteaba aquí, sin una vista adicional que mantener.

---

### Eventos que el módulo escucha (`module.json` → `events.listen`)

- `invoice.created` → `verifactu.records.ingest_invoice`
- `invoice.rectified` → `verifactu.records.ingest_invoice` (R1–R5, importes negativos, misma
  `RegistroAlta` — ver [concepts.md](docs/concepts.md))

### Eventos que el módulo emite

`verifactu.record.created` / `.transmitted`, `verifactu.contingency.retried` / `.cancelled` /
`.processed`, `verifactu.config.changed`, `verifactu.chain.validated` / `.recovered`,
`verifactu.aeat.queried`, `verifactu.diagnostic.run` — ver [overview.md](docs/overview.md)
§"Events it emits" (`module.json`'s own `events.emit` list is empty; the runtime emits these
without a manifest declaration).
