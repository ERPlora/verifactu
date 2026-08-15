# VeriFactu — Limits and troubleshooting

## Known gaps you should know about

- **The go-live guard lives inside the module.** Uninstalling or replacing it removes the switch that
  decides which tax authority sees real sales. Moving it into the core is pending.
- **The guard only counts `accepted` records.** While a record is `transmitted` and the answer has not
  come back, the environment toggle can still go backwards.
- **The `Representante` block is pending for delegated certificates.** A hub signing with the
  delegated certificate transmits through the right endpoint but without that block, and the AEAT
  rejects it. This must be closed **before the first real delegated hub**.
- **Certificate passwords are stored in clear.** Encryption at rest is still pending.
- **The standalone "send test" and the config issuer field still use the module's own data** instead
  of the hub's global business identity. The invoice flow already uses the global one.

## Refusals you will actually see

| Refusal | What happened | What to do |
|---|---|---|
| `verifactu.unsent_records` (HTTP 409) | You tried to deactivate or uninstall with records not yet sent, and it says how many | Drain the contingency queue first |
| Environment flip rolled back | You tried to go back to `testing` after a production record was **accepted** | Going live is one-way |
| `demo_fiscal_environment_locked` | A demo hub tried to change its fiscal environment | Demo hubs are pinned; nothing to fix |
| Contingency cancel rolled back | The linked record is not `accepted` at the AEAT | Retry or rectify — never discard |
| `record_environment_unknown` | A queued record does not say which environment it belongs to | It stays queued with an error event; it is not transmitted to the wrong authority |
| Capability denied | The `certificate` or `network` grant is missing | Grant them in Settings → Permissions |
| Signing failed, no certificate | Neither an own nor a delegated certificate is available | Upload one in Settings → Business, or wait for the delegated one — the error names both halves on purpose |

Note the guard style: a violated assert **rolls the entire command back**, including the event that
would have gone to the outbox. Nothing half-happens.

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

## Dependencies — what breaks if something is missing

**`invoice` is required** and is installed with VeriFactu. Without it nothing emits the invoice
events, so no record is ever created.

**The certificate is a core resource**, not a module dependency. Without one:

- records are created and chained normally;
- but they stay `pending` — nothing is transmitted.

**The capabilities are required at runtime.** Without the `certificate` and `network` grants the
dispatcher refuses the call, regardless of everything else being correct.

**Nothing depends on VeriFactu**, but note the retention gate: you cannot remove it while records are
unsent, and that applies to a cascade too.

## When something looks wrong

**"Invoices are not reaching the AEAT."** Walk it in order: is the module **enabled**? Is there a
**certificate** (own or delegated)? Are the **capabilities granted**? Is the record `pending` (no
certificate) or in **contingency** (network)? Read the events log — every failure writes one.

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

**"The certificate expired."** Records will fail to sign. Upload a new one in Settings → Business; the
expiry is read from the certificate itself.
