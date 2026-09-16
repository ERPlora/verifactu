# VeriFactu — Screens

The module contributes six tabs to the hub navigation: **Records**, **Contingency**, **Events**,
**Recovery**, **Configuration** and **Settings** (`module.json` → `navigation`, custom elements
`erp-verifactu-records` / `-contingency` / `-events` / `-recovery` / `-config` / `-settings`).
Configuration is the newest of the six (v1.5.36, hub#1847): it split the certificate, the
representation agreement and the machine identity out of Settings, which stayed short.

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

Checks the road this hub actually files on, and reports what it found. The last result is readable
from `verifactu.diagnostics.last`. Requires `verifactu.transmit_verifactu`.

It goes through `resolve_route` — the same door transmission and consult use — so it can only ever
report on the road the real filing would take (ERPlora/hub#1485), and what it does depends on which
one that is:

| Road | What the diagnostic does | What it reports |
|---|---|---|
| `own` | Builds the sample hash + QR and files a **test** record with the AEAT, **without touching the real chain** | `aeat`: the tax agency's verdict |
| `delegated` | Builds and validates the same envelope but **files nothing**, and probes the cell's `/readyz` instead | `gateway`: whether ERPlora can file right now; `aeat` stays `null` |

The delegated road does not file **on purpose**: the sample would be a real record presented with
ERPlora's Seal on the business's behalf, it would consume the Anexo I authorisation in `production`,
and a filed record cannot be undone (ADR-0189). So on that road the test **checks the way instead of
using it**.

`details.route` carries `own` / `delegated` in the core's own words, and a failure on the delegated
road is never `diagnostic_certificate_invalid`, since that business has no certificate to fix. It is
one of three verdicts, and the screen has to tell them apart because only one asks the business to
wait: `verifactu.diagnostic_issuer_nif_missing` (its own NIF is not set — ERPlora/hub#1531),
`verifactu.diagnostic_sample_record_invalid` (its own configuration does not yield a valid test
record — ERPlora/hub#1559) and `verifactu.diagnostic_gateway_unavailable` (the cell cannot file
right now).

Two of those three end in a dash and the REASON the run failed. That reason travels twice
(ERPlora/hub#1575): as `details.cert_reason` = `{code, …facts}` — a stable code the module turns
into a sentence of its own (`ui.evt.reason.<code>`), for the eight the engine emits — and as
`details.cert_message`, the engine's Spanish prose, kept as the fallback. The screen composes from
the code when it knows it and prints the prose when it does not, so a hub whose engine is older or
newer than this module still reads a whole sentence.

## Configuration

**The credential and the paperwork, split out of Settings** (v1.5.36, hub#1847). Settings are the
switches an owner touches often (enable, environment, run the test); Configuration is touched once
in the business's lifetime, so it earns its own screen — the same split as Odoo (*Settings* to
activate, its own view to manage certificates) and Holded (*Compliance* → upload certificate).
Requires `verifactu.configure_verifactu` — **admin only**.

Two tabs, which ARE the two roads of ADR-0320 §1 — **not** two independent settings:

| Tab | Road | Opens by default? |
|---|---|---|
| **ERPlora files for me** | `delegated` | yes — the one that asks for nothing, same default as Holded: if you don't upload your own, it uses theirs |
| **My certificate** | `own` | only once a `.p12` is uploaded, or the owner switches to it |

### "My certificate" tab

Uploads the business's `.p12`/`.pfx` to the core (`PATCH /api/business/certificate`, ADR-0081 — the
private key never leaves the core, never travels back to this screen). Shows holder, upload date and
a **Remove it** action; the password field is write-only and is never redisplayed once saved. A
certificate over 1 MiB is refused **in this screen**, before the runtime would have to reject it —
an actual company certificate weighs a few KB.

### "ERPlora files for me" tab — representation agreement + machine identity

Two sections, both about being allowed to file **as** ERPlora, in ERPlora's name:

**Representation agreement** (`erp-verifactu-grant`, panel embedded here). The Anexo I / colaboración
social form the business has to sign so ERPlora may file on its behalf:

| State | Meaning |
|---|---|
| not signed | the business cannot go live until it is |
| pending | uploaded, ERPlora checks it within 24–72h |
| approved (`vigente`) | ERPlora may file |
| rejected | the panel says what to fix, and lets you send it again |
| revoked | ERPlora cannot file on the business's behalf any more |

Ask for **the official form** (pre-filled, wording fixed by the tax authority, not editable), sign it
by hand or electronically with AutoFirma, and upload it back with the attachments the case needs (ID
copy; a signature sample when the ID is a NIE, since those often carry no printed signature to
compare against; proof of representation when the business is a company). **"What you sent"** shows
the current submission plus a **submission history** (v1.5.40, verifactu#116): every prior send, its
verdict, and — while one is under review or was rejected — **"Send again"**, which replaces the
pending submission without touching the one already in force (a new send never overwrites the reason
a rejected one failed).

**Secure connection to ERPlora** (the machine identity). On the delegated road the hub does not sign
with the business's certificate — it identifies itself to ERPlora's fiscal cell with a **machine
identity**: a private key born on the hub that **never leaves it**, plus a certificate an operator
signs with the internal CA (ADR-0419), offline, so a person is always in the loop.

**It is only painted on the road that uses it**, even inside this tab: a hub holding its own `.p12`
reaches the AEAT by itself and its machine identity takes part in nothing, so the section — and the
door read behind it — is hidden **only** when the core has *said* `own` (verifactu#82). It stays
shown when the core does not answer at all: a runtime that does not yet publish
`hub.fiscal.transmission` can perfectly well be filing through the cell, and hiding the section from
it would take away the only way that hub has to enrol. Do **not** derive the road from
`:has_certificate` either — since ERPlora/hub#1489 that flag answers "has this hub *a* road?" and is
`1` on **both** roads, so a business with no certificate at all would read that it has its own.

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
approved it installs. The state is read from `GET /api/business/gateway-identity`. Both are **core
routes**, reached the same way the `printing` module already does — same origin, carrying the
`X-Hub-Session` the shell keeps; the module SDK has no door for core REST (`coreRequest` is private
by design), so that coupling is confined to one function, `ui/lib/gateway-identity.ts::gatewayFetch`.

**What this screen deliberately cannot do:** forget the identity. `DELETE …/gateway-identity` is the
operator's rotation path and it destroys the private key — a module screen must not be able to shut
a business's road to the tax authority with one press.

Every answer of the enrol door resolves to a catalogue key by its **code**, never by its sentence
(ADR-0055), and the raw code stays on screen next to the translation so support never loses which
refusal it was. The configuration never exposes certificate bytes or passwords — only flags saying
whether they are present.

## Settings

Short on purpose since v1.5.36 (hub#1847 "Ajustes corto"): what an owner touches often, not the
certificate/paperwork — that is [Configuration](#configuration) above.

| Setting | Meaning |
|---|---|
| **Enable VeriFactu** | Turns the module on for this hub |
| **AEAT environment** | `production` or `testing`. See the one-way rule in [concepts.md](concepts.md) |
| **Use my own certificate** | A short switch, not just a link: flipping it calls `PATCH /api/business/certificate {use_for_transmission}` and re-reads the road from the core — it used to only navigate to Configuration and change nothing (hub#1871). Asking for ON with no `.p12` uploaded has nothing to switch, so it sends the owner to Configuration instead; a refusal (no representation grant, no signed connection, no certificate uploaded) is said in the owner's words and the switch snaps back to the real road, read back from the core, never assumed |
| **Responsible declaration** | The declaration ERPlora signs for the running version of the system, plus the identifying data every invoice sends to the AEAT (software id/version/NIF/name) — the screen to show if ever asked for them. Arrives on its own within a minute of the system being up; until then no invoice can be sent |
| **Permission hint** | VeriFactu signs and sends with the business certificate, and the hub only lends it to a module the owner has allowed once, in Settings → Permissions — it starts OFF in any hub whose modules were not installed through the Apps consent dialog |

### Live test

Validates the certificate/connection and sends a **TEST** record to the AEAT. Does not affect the
real chain or the business's invoices. Follows the **road** (`resolve_route`), not the certificate:
it used to be switched off on the delegated road because the engine resolved the diagnostic through
the core identity and could only answer «your certificate does not load» to a business that holds
none; ERPlora/hub#1485 moved it onto `resolve_route`, so the test is now offered wherever there is a
road to test.

The one hub still without it is the one with **no road at all** — no certificate of its own and no
machine identity enrolled. It is pointed at Configuration, not at a file picker. A door read that is
still in flight, or that failed, counts as «there may be a road»: taking the test away over a read
that did not land is the same defect in a different coat.

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
