# VeriFactu — Limits and troubleshooting

## Known gaps you should know about

- **The go-live guard lives inside the module.** Uninstalling or replacing it removes the switch that
  decides which tax authority sees real sales. Moving it into the core is pending.
- **The guard only counts `accepted` records.** While a record is `transmitted` and the answer has not
  come back, the environment toggle can still go backwards.
- **Certificate passwords are stored in clear.** Encryption at rest is still pending.
- **The config issuer field can still diverge from the hub's global business identity.** Since
  verifactu#107/#108 a brand-new hub that has never saved falls back to `Settings → Business`'s tax
  id/name for its **first** activation — the screen no longer refuses it for a missing NIF that was
  actually set globally. But once the module's own `issuer_nif`/`issuer_name` columns hold a
  non-empty value (any save), that stored value **wins** over the hub's global identity from then
  on, by design (the engine anchors the chain on it) — so a hub that changes its fiscal name/NIF in
  Settings → Business after its first save will not see it reflected here automatically. The
  standalone "send test" reads the same columns, so it inherits the same behaviour.

## Refusals you will actually see

| Refusal | What happened | What to do |
|---|---|---|
| `verifactu.unsent_records` (HTTP 409) | You tried to deactivate or uninstall with records not yet sent, and it says how many | Drain the contingency queue first |
| Environment flip rolled back | You tried to go back to `testing` after a production record was **accepted** | Going live is one-way |
| `demo_fiscal_environment_locked` | A demo hub tried to change its fiscal environment | Demo hubs are pinned; nothing to fix |
| Contingency cancel rolled back | The linked record is not `accepted` at the AEAT | Retry or rectify — never discard |
| `record_environment_unknown` | A queued record does not say which environment it belongs to | It stays queued with an error event; it is not transmitted to the wrong authority |
| `ck_verifactu_record_quota_matches_declared_rate` | A breakdown line declares a quota its own `rate` cannot justify — it strays by more than that quota again, plus a cent | Fix the amounts upstream — `invoice` refuses the same thing as `invoice.tax_quota_mismatch` |
| `ck_verifactu_record_quota_matches_row_rate` | No readable breakdown, and the quota does not match the row's own `tax_rate` | Same — nothing was sealed, no sequence number was spent |
| `ck_verifactu_record_ordinary_total_not_negative` | An `F1`/`F2`/`F3` totalling below zero | A negative amount is a corrective invoice (`R1`…`R5`), issued by `invoice.rectify` |
| Capability denied | The `certificate` or `network` grant is missing | Grant them in Settings → Permissions |
| No road to the AEAT | The hub has neither an own certificate nor the delegated route enrolled, so its records are chained but stay `pending` | Open this module's Configuration screen: upload a certificate (*My certificate* tab), or complete the secure connection with ERPlora (*ERPlora files for me* tab) |

Note the guard style: a violated assert **rolls the entire command back**, including the event that
would have gone to the outbox. Nothing half-happens.

## What is checked before a record is sealed

Since `013_arithmetic_integrity.sql` (verifactu#53) the record table itself refuses an
**arithmetically impossible** record. The rules are `CHECK` constraints, so no writer can go around
them — not the native engine, not `verifactu.records.create`, not a future one. The **constraint name
is the error code**, and a violation rolls the whole command back: no row, no fingerprint, no
sequence number spent, no contingency entry.

- **The quota against the declared rate.** Each `tax_breakdown` line must declare a quota its own
  `rate` justifies. Since `015` (verifactu#60) the tolerance is **the justified quota again, plus a
  cent**: the row carries the breakdown, not the document, so it cannot count lines, and `invoice`
  rounds the quota per line and sums it — a fixed ±1 cent rejected one legitimate twelve-line ticket
  in three. The rule that counts lines lives in the native engine, which can see them. The
  equivalence surcharge is judged against its own `surcharge_rate`.
- **The quota against the row's rate**, when there is no readable breakdown (legacy `'{}'` rows,
  corrective invoices, a `records.create` without one). The tolerance here also absorbs the precision
  lost by storing the effective rate with two decimals. Only in **this** branch is `tax_rate` the
  effective rate: with a readable breakdown of a single rate the column holds the **declared** one
  (ERPlora/hub#1198), and the effective rate is left for the mixed invoice — 2+ distinct rates.
- **The sign.** An `F1`/`F2`/`F3` cannot total below zero. `R1`…`R5` can, and must: that is the legal
  path for a refund. Zero is fine — a fully comped ticket still needs its `F2`.

What these rules do **not** cover, on purpose:

- **The breakdown against the header** (Σ bases and Σ quotas vs `base_amount`/`tax_amount`). `invoice`
  owns the document and already refuses it as `invoice.totals_mismatch`.
- **The amounts against the lines** (`quantity × unit_price`). Same reason — VeriFactu never sees the
  lines.
- **A one-cent rounding disagreement.** With VAT included the correct quota is `gross − base`, and
  only a producer that knows the gross can tell that apart from a rounding artefact. VeriFactu cannot,
  so it tolerates it rather than rejecting correct invoices.

Records **already chained** are not judged: the constraints arrive `NOT VALID`. A sealed record is
immutable under RD 1007/2023 and cannot be corrected afterwards, and a hub whose boot dies on its own
fiscal history would be worse than the bug.

### What `chain.validate` does and does not say

`verifactu.chain.validate` recomputes the SHA-256 fingerprints and verifies the chaining. **That is
all it claims.** It does not re-audit the amounts — by the time it runs, the record is sealed and
immutable, so the control that matters is the one above, which prevents sealing. Read a green verdict
as "the fingerprint chain has not been tampered with", never as "these records add up".

## Retry behaviour

The contingency queue is drained **every 5 minutes**, in priority then age order, with exponential
backoff of **5, 10, 20, 40 and 60 minutes** (capped). Records exhausting the configured maximum
retries end as `failed`.

## Accepted values

| Field | Values |
|---|---|
| Record type | `alta`, `anulacion` |
| Invoice type | F1, F2, F3, R1–R5 |
| Record status | `pending`, `transmitted`, `accepted`, `rejected`, `error`, `retry` |
| Environment | `production`, `testing` |
| Contingency status | `pending`, `retrying`, `failed`, `cancelled` |
| Contingency priority | 1 high, 2 normal, 3 low |
| Event severity | `debug`, `info`, `warning`, `error`, `critical` |

`accepted` includes *accepted with errors* — it counts as registered and is not resent.

## Caps and sizes

| Limit | Value |
|---|---|
| Rows per page (records, contingency, events) | 50 |
| Maximum rows a paginated request may ask for | 500 |
| Contingency drain interval | every 5 minutes |
| Backoff steps | 5, 10, 20, 40, 60 minutes |
| Records per invoice | 1 — uniqueness is enforced per hub, issuer, environment, number, date and type |
| AEAT snapshot | replaced on each query |

## Permissions per action

| To do this | You need |
|---|---|
| See records, contingency, events, chain status and diagnostics | `verifactu.view_verifactu` |
| Validate the chain | `verifactu.view_verifactu` |
| Create a record, retry or cancel a contingency entry, process the queue | `verifactu.manage_verifactu` |
| Transmit a record, query the AEAT, run a diagnostic | `verifactu.transmit_verifactu` |
| Save the configuration, recover the chain (from the AEAT or manually) | `verifactu.configure_verifactu` |

By role: **admin** has everything. **manager** has view, manage and transmit — but **not**
`configure_verifactu`, so a manager cannot change the environment or recover the chain. **employee**
is **read-only**.

Not an exception: when a send comes back refused for its chain (2007), the send itself consults the
AEAT, files the recovered anchor and re-chains the record. That is part of sending, not an
on-demand recovery, so its internal writes (`_insert_recovery`, `_rechain_record`) ask for
`transmit_verifactu`: a manager who processes the queue by hand gets the same result as the
scheduled drain (hub#2132). The recovery screens stay admin only.

## Dependencies — what breaks if something is missing

**`invoice` is required** and is installed with VeriFactu. Without it nothing emits the invoice
events, so no record is ever created.

**The road to the AEAT is a core resource**, not a module dependency. A hub transmits with
either of the two — its own certificate, or the delegated route enrolled with ERPlora. With
neither:

- records are created and chained normally;
- but they stay `pending` — nothing is transmitted.

**The capabilities are required at runtime.** Without the `certificate` and `network` grants the
dispatcher refuses the call, regardless of everything else being correct.

**Nothing depends on VeriFactu**, but note the retention gate: you cannot remove it while records are
unsent, and that applies to a cascade too.

## When something looks wrong

**"Invoices are not reaching the AEAT."** Walk it in order: is the module **enabled**? Is there a
**road** — an own certificate, or the delegated route enrolled? Are the **capabilities
granted**? Is the record `pending` (no road) or in **contingency** (network)? Read the events log
— every failure writes one.

**"A record is stuck in contingency."** Check its last error and its next attempt time. The queue
drains every 5 minutes with backoff; forcing a retry is available. If it exhausted the retries it is
`failed`.

**"I cannot cancel a queued record."** By design. Only a record already accepted at the AEAT may have
its queue entry cancelled.

**"I cannot go back to testing."** A production record was accepted. Going live is one-way.

**"I cannot uninstall the module."** There are unsent records; the error says how many. Drain first.

**"The AEAT rejected our records after restoring a backup."** The chain forked: the AEAT has records
your restored database does not. Use recovery from the AEAT to re-anchor, then continue.

**"Two hubs produce the same sequence numbers."** They should — each hub is its own chain, anchored
on its own id. Sequence numbers are not globally unique and are not meant to be.

**"A test record ended up in the real AEAT."** It cannot, if the record carries its environment: the
destination comes from the **record**, not from the current configuration. A record with no
environment is refused rather than guessed.

**"A refund did not reduce anything at the AEAT."** A refund is a **rectifying invoice** with negative
amounts, declared as an *alta*. If you were expecting an annulment, that is not what an annulment is
for.

**"The QR does not appear on the sale document."** The document reads the record for that invoice. If
no record exists yet — or the module never ingested the invoice — there is no QR.

**"The certificate expired."** Records will fail to sign. Upload a new one from this module's
Configuration screen (*My certificate* tab); the expiry is read from the certificate itself.
