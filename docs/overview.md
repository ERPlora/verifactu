# VeriFactu — Overview

## What this module does

VeriFactu is the Spanish fiscal compliance layer (RD 1007/2023). Every time an invoice is issued, it
builds the corresponding **billing record**, links it to the previous one with a SHA-256 hash chain,
signs it with the business certificate and **transmits it to the AEAT** over mutual TLS. If the AEAT
is unreachable it queues the record in a **contingency queue** and keeps retrying.

It also validates that the chain is intact, queries the AEAT for what it has on record, and can
recover the chain after a database restore.

## What this module does NOT do

- **It does not issue invoices.** `invoice` does that; this module reacts to it.
- **It does not compute tax.** The amounts arrive already decided.
- **It does not hold the certificate.** The business `.p12` is a **core** resource: this module's
  own Configuration screen (*My certificate* tab, hub#1847) uploads it through the core's
  business-certificate door, but the bytes and the password never cross into the module or leave
  the core.
- **It does not keep an event registry in the regulatory sense.** ERPlora is **VERI\*FACTU only**, and
  the AEAT states that the event registry is required only for non-verifiable systems. The module's
  own event log is our own traceability, voluntary, and does not make the product dual-mode.
- **It does not delete or annul an invoice.** Nothing here can undo a sale — see
  [concepts.md](concepts.md).

## Modules it connects to

**Depends on `invoice`** — installing VeriFactu installs it.

**Events it listens to**

| Event | Runs | Produces |
|---|---|---|
| `invoice.created` (F1–F3) | `verifactu.records.ingest_invoice` | A **RegistroAlta** |
| `invoice.rectified` (R1–R5) | `verifactu.records.ingest_invoice` | A **RegistroAlta** with negative amounts |

Both go to the same command, because in the Spanish model a rectifying invoice is also declared as an
*alta*. Ingestion is idempotent.

**Events it emits**

| Event | When |
|---|---|
| `verifactu.record.created` | a billing record is generated and signed |
| `verifactu.record.transmitted` | a record is sent to the AEAT |
| `verifactu.contingency.retried` / `.cancelled` / `.processed` | the contingency queue moves |
| `verifactu.config.changed` | the configuration is saved |
| `verifactu.chain.validated` / `.recovered` | the chain is checked or re-anchored |
| `verifactu.aeat.queried` | the AEAT is queried for its records |
| `verifactu.diagnostic.run` | a self-diagnostic runs |

## A scheduled task runs every 5 minutes

`process_contingency` drains the contingency queue: it retries the pending records in priority order,
applying an exponential backoff of 5, 10, 20, 40 and 60 minutes.

## It is a native engine, not a downloadable sandbox module

The fiscal and network engine is a **first-party native plugin compiled into the runtime**, not a
downloadable WASM handler. Chained SHA-256 hashing, PKCS#12 signing, mutual-TLS transmission and SOAP
XML exceed what the sandbox can do, and this is compliance-critical code. The module's SQL and its
screens are ordinary.

Its access is still **gated by user consent**: it declares two capabilities — **certificate** (use
the hub's certificate to sign and transmit; the private key never leaves the hub) and **network**
(`https://*.aeat.es`). Both are granted in Settings → Permissions and are **denied by default**.

## The vocabulary

| Concept | Meaning |
|---|---|
| **Record** | One billing record sent, or to be sent, to the AEAT |
| **Chain** | The SHA-256 links between consecutive records |
| **Environment** | `production` or `testing` — **two separate, parallel chains** |
| **Contingency** | The retry queue for records that could not be transmitted |
| **CSV** | The receipt code the AEAT returns for an accepted record |
| **Anchor** | The last confirmed record, from which the chain continues |

Record types: `alta`, `anulacion`. Invoice types: F1–F3, R1–R5. Record statuses: `pending`,
`transmitted`, `accepted`, `rejected`, `error`, `retry`.
