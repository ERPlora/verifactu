# VeriFactu — Screens

The module contributes five tabs to the hub navigation: **Records**, **Contingency**, **Events**,
**Recovery** and **Settings**.

## Records

Every billing record with its transmission status (`verifactu.records.list`, 50 rows per page).
Requires `verifactu.view_verifactu` — an employee can read this.

- **Search** by sequence number, invoice number or issuer name.
- **Sort and filter** by sequence, invoice number, invoice date, record type, invoice type, issuer
  tax id and name, base, tax and total amounts, status, transmission timestamp, retry count, AEAT
  receipt code (CSV) or generation timestamp.

Open a record for its full detail: the invoice fields, the hash chain (its own hash and the
previous one), the delivery fingerprint — `transmission_id` (the fiscal cell's
`Idempotency-Key`, NOT always the record id: an automatic re-anchor presents the same record
under `{id}-rechain-{anchor}`) and `xml_sha256` (the digest of the bytes that travelled, shown
in full so support can compare it byte-for-byte with the cell's log) — and the AEAT response:
code, message, CSV and QR (verifactu#86).

### How a record normally appears

You do not create records by hand. Issuing an invoice emits an event, the module ingests it, builds
the record, chains it, signs it and **transmits it immediately**. There is no "transmit later"
setting — an active module always emits.

If there is no certificate available, the record stays `pending`. If the network fails, it goes to
the contingency queue.

### Transmit a record

Available when a record has not been sent. It archives the XML **before opening the network** — if the
XML cannot be stored, nothing is transmitted — then signs and posts it to the AEAT. Requires
`verifactu.transmit_verifactu`.

### The QR on a sale document

`verifactu.records.by_invoice` returns the record of a given invoice — its QR, its CSV and its status
— which is what lets the sale document print the validation QR.

## Contingency

Records waiting to be retransmitted (`verifactu.contingency.list`, 50 rows per page). Requires
`verifactu.view_verifactu`.

- **Filter** by record, priority, queue time, attempts, last attempt, last error, next attempt or
  status.

Priorities are 1 (high), 2 (normal) and 3 (low). Statuses are `pending`, `retrying`, `failed`,
`cancelled`.

### Retry now

Forces a retransmission attempt instead of waiting for the scheduled drain. Requires
`verifactu.manage_verifactu`.

### Cancel a queued record — heavily guarded

Cancelling is only allowed when the linked record is **already registered at the AEAT**
(`accepted`, which includes *accepted with errors*). In **any** other state — pending, transmitted,
rejected, error, retry — the whole transaction is **rolled back**, event included.

The reason is that a generated record that is never transmitted is exactly the orphan the AEAT rules
forbid. The fix for a problem record is to retry or to correct it, never to discard it. Requires
`verifactu.manage_verifactu`.

## Events

The append-only audit log of everything that happened (`verifactu.events.list`, 50 rows per page).
Requires `verifactu.view_verifactu`.

- **Filter** by record, event type, severity, message, details or timestamp.

Severities: `debug`, `info`, `warning`, `error`, `critical`.

This is **our** traceability, not the regulatory event registry — see [concepts.md](concepts.md).

## Recovery

The screen for the rare, serious situations.

### Validate the chain

Checks the integrity of the hash chain end to end and writes the result as an event. Requires
`verifactu.view_verifactu`; the last result is always readable from `verifactu.chain.status`.

### Query what the AEAT has

Asks the AEAT for the issuer's most recent records and stores the answer as a snapshot. Each query
**replaces** the previous snapshot. It does not touch the local chain. Requires
`verifactu.transmit_verifactu`.

### Recover the chain from the AEAT

After restoring a database backup, this asks the AEAT for the last confirmed record and re-anchors
the chain to it, so the next record continues correctly instead of forking. Requires
`verifactu.configure_verifactu` — **admin only**.

### Recover the chain manually

Continues the chain from a hash you supply — the path when migrating from another application.
Requires `verifactu.configure_verifactu`.

### Run a self-diagnostic

Validates the certificate, builds a sample hash and QR, and sends a **test** record to the AEAT
**without touching the real chain**. The last result is readable from `verifactu.diagnostics.last`.
Requires `verifactu.transmit_verifactu`.

## Settings

The module's configuration (`verifactu.config.get`, saved with `verifactu.config.save`). Requires
`verifactu.configure_verifactu` — **admin only**.

| Setting | Meaning |
|---|---|
| **Environment** | `production` or `testing`. See the one-way rule in [concepts.md](concepts.md) |
| Mode | `verifactu` |
| Software identification | The declared identity of the billing software |
| Certificate expiry | Read from the certificate |
| Retry interval, max retries | How the contingency queue behaves |

### The filing route (read-only)

The first row states **which of the two roads of ADR-0320 this hub's records take**, and it is
answered by the core query `hub.fiscal.transmission` — never derived here:

| `transmission_route` | What it means | What the screen shows |
|---|---|---|
| `own` | The hub signs and files with the business's own `.p12` | The route, and the live test enabled |
| `delegated` | ERPlora files on the business's behalf with its own certificate | The route, plus the **representation grant** (`vigente` / `pendiente` / `rechazado` / `revocado` / not signed) and the date of its last change |

Do **not** derive the route from `:has_certificate`. Since ERPlora/hub#1489 that param is
`certificate::can_transmit` — «has this hub a road?» — and answers `1` on **both** roads, so it
cannot tell them apart. A hub whose runtime does not publish the core query says «not available»
and falls back to the `:has_certificate` reading, which is the correct one on that older runtime.

The grant is **signed in Settings → Business**, not here: the runtime composes the official Anexo I
with the real legal text and a person at ERPlora reviews it. This module reflects, it does not own.

**The certificate is not configured here** either. It is uploaded in **Settings → Business** and
lives in the core. This screen only shows whether one is available — and on the delegated road it
says so is *not needed*, rather than reporting it as missing.

The **live test** («Send test») needs a certificate of the business's own, so it is disabled on the
delegated road with its reason: the diagnostic still demands the core identity (ERPlora/hub#1485).

### Secure connection to ERPlora (the machine identity)

On the **delegated** road the hub does not sign with the business's certificate — it identifies
itself to ERPlora's fiscal cell with a **machine identity**: a private key born on the hub that
**never leaves it**, plus a certificate an operator signs with the internal CA (ADR-0419), which is
offline, so a person is always in the loop.

**It is only painted on the road that uses it.** A hub holding its own `.p12` reaches the AEAT by
itself (`certificate::route_of` → `own`), never goes through the cell, and its machine identity
takes part in nothing: the section is not shown to it and the door is **not even read**
(verifactu#82). The rule is «hide it only when the core has *said* `own`» — a runtime that does not
publish `hub.fiscal.transmission` still sees it, because the unknown road counts as delegated here
and hiding it would take away the only way that hub has to enrol.

The section shows what exists and offers the one thing there is to do:

| State | What it means | The button |
|---|---|---|
| not requested | no key, no certificate | **Request the connection** |
| waiting for signature | key present, certificate not — the CSR is filed and a person has to sign it | **Check the status** |
| active | certificate installed, with room left | *(none — nothing to ask for)* |
| expiring soon | valid, under 30 days left | **Renew the connection** |
| expired | past its `notAfter`; records wait in the contingency queue | **Renew the connection** |
| not available | the hub did not answer | *(none — pressing would spend the allowance on a hub that is silent)* |

All three buttons are the **same idempotent call**, `POST /api/business/gateway-identity/enrol`
(ERPlora/hub#1457): repeating it while a request is pending does not open a second review, and once
approved it installs. The state is read from `GET /api/business/gateway-identity`.

Both are **core routes**, and the screen reaches them the way the `printing` module already does —
same origin, carrying the `X-Hub-Session` the shell keeps. The module SDK has no door for core REST
(`coreRequest` is private by design), so that coupling is confined to one function,
`ui/lib/gateway-identity.ts::gatewayFetch`: the day a proper door exists, that is the only seam to
swap.

**What this screen deliberately cannot do:** forget the identity. `DELETE …/gateway-identity` is the
operator's rotation path and it destroys the private key — a module screen must not be able to shut
a business's road to the tax authority with one press.

Every answer of the enrol door resolves to a catalogue key by its **code**, never by its sentence
(ADR-0055), and the raw code stays on screen next to the translation so support never loses which
refusal it was.

The configuration never exposes certificate bytes or passwords — only flags saying whether they are
present.

## First-run setup

VeriFactu contributes a **required** setup step: *Activa VeriFactu y sube el certificado del negocio
en Ajustes para enviar facturas a la AEAT.* It is done once the module is enabled **and** a
certificate is available, and it needs `verifactu.configure_verifactu`.

## Dashboard widgets

All need `verifactu.view_verifactu`.

| Widget | Shows | On by default |
|---|---|---|
| Pending | Records not yet confirmed by the AEAT, with a trend | yes |
| Contingency | Records sitting in the retry queue, with a severity | no |
| By status | Distribution of records per status | no |
| Events | The last AEAT communication events | no |
