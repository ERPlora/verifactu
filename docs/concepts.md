# VeriFactu — Concepts

The things people get wrong on their first day. This module is the one where getting it wrong costs
money, so read it before touching anything.

## Nothing is ever annulled — a correction is a new invoice

An issued invoice is **immutable**. There is no delete, no annul, no edit.

To undo or refund something you issue a **rectifying invoice** (types R1–R5, with negative amounts).
And in VeriFactu, **both the normal invoice and the rectifying one are declared as a
`RegistroAlta`** — the rectifying one simply carries its R-type. That is why both invoice events map
to the same ingestion command, which always creates an *alta*.

**`RegistroAnulación` is not for refunds.** It exists only to correct a record that was sent to the
AEAT **by mistake** — a rare case, handled by hand from the recovery screen. If you use it as a
refund you are declaring that a real sale never happened.

## The chain is what makes the records trustworthy

Each record carries the hash of the previous one, so the sequence cannot be reordered, have a record
removed, or have one inserted after the fact without breaking.

Consequences that matter in practice:

- **The chain is anchored per hub, issuer tax id and environment.** A new hub is a new chain — the
  installation number is the hub id itself.
- **Restoring a database backup can fork the chain**, because the AEAT has records the restored copy
  does not. That is what the recovery screen is for: re-anchor from what the AEAT confirms, then
  carry on.
- Validating the chain is a read-only check; it repairs nothing.

## Production and testing are two separate chains

The environment is part of the chain's identity. Records in `production` and records in `testing`
form **two parallel, independent sequences** — they do not link to each other, and their sequence
numbers repeat across environments.

This was not always so, and the bug it prevented is worth remembering: the first production record
used to chain onto a **test** record's hash.

**A record is transmitted to the environment it belongs to, not to the one currently configured.** A
record queued while in testing goes to pre-production even if you have since gone live; a real sale
queued before somebody flipped the toggle back still goes to the **real** AEAT.

A record that does not say which environment it belongs to is **not transmitted at all**: it stays
queued with an error.

## Going live is one-way

Once a production record has been **accepted** by the AEAT, the environment cannot be flipped back to
testing. The attempt matches no rows, the guard fires, and the whole transaction is rolled back.

Two honest caveats:

- The guard counts only **accepted** records. While a record is `transmitted` — already on the wire,
  answer not back yet — the toggle can still go back.
- The guard currently lives **inside the module**, so uninstalling or replacing the module also
  removes the switch that decides which tax authority sees real sales. Moving it into the core is
  pending.

A **demo hub can never go to production**: its fiscal environment is pinned by the core itself and the
attempt is refused outright.

## An active module always transmits

There is no "auto transmit" setting any more, and its absence is deliberate: with it off, records
were merely queued, which contradicts the AEAT rules. **Module installed and active = every invoice
is emitted.**

The only two reasons a record is not on its way:

- **No certificate available** — it stays `pending`;
- **The network failed** — it goes to the contingency queue with backoff.

## The module cannot be turned off while records are unsent

Deactivating or uninstalling VeriFactu with records still unsent is **refused** — the runtime asks the
engine first and returns an error saying how many remain. That includes being dragged along by a
dependency cascade.

Drain the queue first. This is not an inconvenience; it is what stops a hub from silently stopping
reporting.

## The certificate belongs to the core, and the module never sees it

The business `.p12` is uploaded in **Settings → Business** and lives in a core system table. The
module only asks the core two things: *is there something to sign with*, and *whose certificate is
it*. The private key and the password never cross into the module — the core does all the PKCS#12
cryptography.

There is **one slot**: the business's own certificate. A hub holds that one or none at all —
ERPlora's key is never handed down to it.

Which is why a hub with **no** certificate still bills. The certificate does not decide whether the
records reach the AEAT; it decides **by which of the two exclusive roads** they do:

| Road | Who signs | When |
|---|---|---|
| `own` | The business, with the certificate it uploaded | Whenever one has been uploaded |
| `delegated` | ERPlora's fiscal cell, with its own Seal, on the business's behalf | When there is no own certificate |

On the delegated road nothing of ERPlora's reaches the hub: the hub builds the record and the cell
transmits it, so that key never leaves the platform. What the hub needs there is not a certificate
but the **signed authorisation** (Anexo I) and the secure connection of Settings → VeriFactu.

The certificate's kind also decides **which AEAT endpoint** the hub uses on the own road: one
carrying a natural person enters through the ordinary endpoint, an entity seal through the seal's.
On the delegated road the cell picks it, with its own Seal. Environment and certificate resolve
together, in one place.

## Access to the certificate and to the AEAT is granted, not assumed

Even though the engine is compiled into the runtime, it does not get implicit access. It declares two
capabilities — **certificate** and **network** limited to the AEAT domains — and the user grants them
in Settings → Permissions. **Default is deny**, and the dispatcher refuses the call without a grant.

## Cancelling a queued record is almost always the wrong move

It is allowed **only** when the linked record is already registered at the AEAT. In every other state
the transaction is rolled back.

A generated record that is never transmitted is an orphan the rules forbid. The correction is a retry
or a rectification — never a discard.

## "Accepted with errors" counts as accepted, and is not resent

The AEAT can accept a record while flagging errors. That still means **registered**: it is not
retransmitted, and it satisfies the "already at the AEAT" condition. Resending it would duplicate a
record that was accepted.

## The event log here is not the regulatory event registry

ERPlora is **VERI\*FACTU only**, and the AEAT is explicit that the event registry is required only for
non-verifiable systems. The events table in this module is **our own** traceability — transmissions,
errors, contingency — kept voluntarily. It does not turn the product into a dual-mode system.

Related: ceasing activity is a **census formality** for the business owner, not something the
software must do.

## The XML is archived before the network is touched

A transmission writes the exact XML to storage first, and only then opens the connection. If the
archive cannot be written, **nothing is transmitted**. On a retry the stored XML is reused rather
than rebuilt, so what is retried is byte-for-byte what was built.

## The module reads exactly one thing from `invoice`

The official invoice number is computed in SQL when the invoice is inserted and does **not** travel in
the event, so ingestion reads that single row by id to get it. Everything else arrives in the event
payload, and the invoice id is stored as a plain reference with no foreign key.

This is a documented, bounded exception, not a licence to read other modules' tables.
