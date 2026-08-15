# Módulo `verifactu` — cumplimiento fiscal español (AEAT)

Capa de compliance **VeriFactu** (RD 1007/2023) sobre `invoice`: genera, **firma** y **transmite** a
la AEAT el registro de facturación de cada factura, lo **encadena** por SHA-256, gestiona la **cola
de contingencia** y valida la integridad de la cadena.

> ✳️ **ERPlora es SOLO VERI\*FACTU** (ADR-0271). La tabla `verifactu_event` de este módulo **no es**
> el registro de eventos regulatorio (que solo obliga a los SIF *no verificables*): es trazabilidad
> nuestra, voluntaria, y no convierte el producto en DUAL.

> **Module id:** `verifactu`. **Depende de:** `invoice`.
> **Motor fiscal = plugin NATIVO first-party** (ADR-0009): crate Rust **horneado en el runtime**, no
> un `handler.wasm` descargable — la cadena SHA-256, la firma PKCS#12, la TLS mutua y el XML SOAP
> exceden el sandbox WASM. Su acceso está **gateado por consentimiento** (ADR-0079): capabilities
> `certificate` + `network` (`https://*.aeat.es`), default-deny.

## Documentación de usuario — [`docs/`](docs/)

Viaja **dentro** del módulo y se versiona con él: el asistente del hub (ADR-0282) la indexa por
versión instalada y cita la de TU versión, no la de la última publicada. En inglés (idioma fuente).

| Fichero | Para qué |
| ------- | -------- |
| [`docs/overview.md`](docs/overview.md) | Qué hace y qué NO hace; el vocabulario y la tarea de contingencia |
| [`docs/screens.md`](docs/screens.md) | Records / Contingency / Events / Recovery / Settings paso a paso |
| [`docs/concepts.md`](docs/concepts.md) | **Nada se anula** (rectificativa = `RegistroAlta` con importes negativos), producción y pruebas son **DOS cadenas**, el **go-live es de un solo sentido**, el certificado es del CORE |
| [`docs/limits.md`](docs/limits.md) | Rechazos reales (`verifactu.unsent_records`, `record_environment_unknown`…), backoff, permisos y diagnóstico |

## Las guardas que hay que conocer

| Guarda | Qué impide |
| ------ | ---------- |
| **R1 — go-live de un solo sentido** | Volver a `testing` con un registro de producción **aceptado**: no casa ninguna fila y el assert **revierte la transacción entera** |
| **R2 — retención** | Desactivar/desinstalar (o arrastrar en cascada) con registros sin remitir → `verifactu.unsent_records` (HTTP 409) |
| **R3 — sin `auto_transmit`** | Diferir la emisión: **módulo activo = siempre se emite** |
| **R4 — cadena por entorno** | Encadenar el primer registro de producción sobre la huella de uno de pruebas |
| **R5 — hub de demo** | Que una demo pase a `production` (clavado en el **core**, `demo_fiscal_environment_locked`) |
| **Cancelar contingencia** | Descartar un registro que la AEAT aún no tiene: solo si está `accepted` |

## Qué expone hoy

| Tipo | Nombre | Permiso |
| ---- | ------ | ------- |
| query | `verifactu.config.get` · `records.list` / `.get` / `.by_invoice` · `contingency.list` · `events.list` | `view_verifactu` |
| query | `verifactu.stats.*` (4 widgets) · `chain.status` · `diagnostics.last` · `aeat.records.list` | `view_verifactu` |
| command | `verifactu.records.create` / `.ingest_invoice` (nativo, listener) · `contingency.retry` / `.cancel` / `.process` | `manage_verifactu` |
| command | `verifactu.records.transmit` · `diagnostics.run` · `aeat.query_recent` (nativo) | `transmit_verifactu` |
| command | `verifactu.config.save` · `recovery.from_aeat` / `.manual` (nativo) | `configure_verifactu` (solo admin) |
| command | `verifactu.chain.validate` (nativo) | `view_verifactu` |
| escucha | `invoice.created` (F1–F3) · `invoice.rectified` (R1–R5) → `records.ingest_invoice` | — |
| tarea | `process_contingency` — `*/5 * * * *` (backoff 5·10·20·40·60 min) | — |
| emite | `verifactu.record.created/transmitted`, `contingency.*`, `config.changed`, `chain.*`, `aeat.queried`, `diagnostic.run` | — |

Navegación: `erp-verifactu-records`, `-contingency`, `-events`, `-recovery`, `-settings`.

## Layout

```text
module.json                   # manifest (contrato técnico) + capabilities + scheduled_tasks
migrations/postgres/          # esquema §2.5 + cadena por entorno + tabla guardia verifactu__gate
queries/*.sql                 # lecturas declarativas (:hub_id inyectado)
commands/*.sql                # escrituras declarativas (las `_` son intenciones del motor nativo)
ui/                           # Web Components (Lit/Ionic/OutfitKit)
docs/                         # documentación de usuario + corpus del asistente
```

> El motor fiscal **no vive aquí**: es un crate nativo del runtime del hub.

## Estado y trabajo abierto

El estado vive en las **Issues de este repo**, no aquí. Huecos documentados en `docs/limits.md`:
R1 **vive dentro del módulo** (se va con él) y solo cuenta `accepted`; falta el bloque
`Representante` para el certificado **delegado** (requisito **antes del primer hub delegado real**);
las contraseñas de certificado siguen **en claro**; y el «enviar prueba» standalone aún usa el emisor
propio del módulo en vez de la identidad global del hub.

Doc de arquitectura: `architecture/modules/verifactu.md` + diseño en
`architecture/saas/verifactu-gateway.md` (ADR-0202). Cargarlos antes de tocar el módulo.
