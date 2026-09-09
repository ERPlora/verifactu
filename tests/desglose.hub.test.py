#!/usr/bin/env python3
"""What `invoice` WRITES is what the VeriFactu record SEALS, against the REAL kernel.

Ported from the hub's `verifactu_desglose_e2e.rs` (ERPlora/hub#1264, contract «El Hub se CIERRA
como KERNEL» §5, originally hub#296).

Every link of the fiscal chain had a unit test; the chain did not. The record that goes to the
AEAT builds its `<Desglose>` from the invoice's `tax_breakdown`, and the unit tests of
`aeat::desglose` (hub, `crates/verifactu/src/aeat.rs`) only prove that a HAND-WRITTEN breakdown
becomes the right XML. The half nobody exercised is the other end: that the `invoice` module,
running its real WASM handler against a real Postgres inside a real runtime, PRODUCES the
breakdown the engine consumes — and that the engine seals it into `verifactu_record` to the cent.

So this battery runs the whole way through, once per case:

    taxes rules (real seed)
      -> invoice.create / sales.complete_sale     (real WASM, real Postgres)
        -> invoice_invoice.tax_breakdown           (the inter-module contract, ADR-0186)
          -> invoice.created through the OUTBOX
            -> verifactu.records.ingest_invoice    (the NATIVE engine, ADR-0009)
              -> verifactu_record                  (base, quota, total, TipoImpositivo)

**Where the split is, and why it is here.** `verifactu` is the system's second class of module
(ADR-0009): its SQL, migrations, manifest and UI are this repo's, but its engine is baked into the
hub (`hub/crates/verifactu`). That makes the hub's e2e a genuinely two-sided test, and hub#1264
splits it along the seam:

  * everything reachable from OUTSIDE the runtime — the breakdown `invoice` produces and the row
    the engine writes from it — is asserted HERE, against the published image, because only a live
    runtime has both ends;
  * the last hop, `record -> SOAP XML -> XSD`, has no public door (building it needs a certificate
    and `records.transmit` talks to the AEAT), so it stays in the hub as unit tests of
    `aeat::build_soap`, fed the very breakdown strings this battery pins. The two sides meet on
    the `tax_breakdown` JSON: pin it on the producer side here, consume it verbatim there.

**The `tax_rate` column is not a declared rate.** `derive_tax_rate` (hub#1198) stores the rate the
breakdown declares when there is exactly one, and the EFFECTIVE rate when the invoice is mixed —
17,33 % on a 21 %+10 % ticket, which is not a rate in the Spanish tax system. That is deliberate:
the column is a KPI the module groups by and the fallback the XML uses only when there is no
readable breakdown; the AEAT is told the breakdown, one `DetalleDesglose` per real rate. This
battery pins BOTH halves of that fact — the row carries 17,33 while its breakdown carries 21 and
10 — because it is exactly the pair the hub e2e protected with `assert!(!xml.contains("17.33"))`.

Amounts are integer cents (ADR-0007/0123) and quantities 10^6 fixed point (ADR-0147). Every figure
below is the one the hub e2e asserted, unchanged: a slice that rounds differently is a slice that
declares different money to Hacienda.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Never on its
own: without a runtime it fails, it does not skip.
"""

import sys
import time

import hub_harness
from hub_harness import (
    Hub,
    at_rate,
    breakdown_of,
    cash_method_id,
    cents,
    charge_key,
    fiscal_setup,
    invoice_of,
    issue_ticket,
    wait_for_record,
)

#: One relay tick, plus slack. `wait_for_record` can only wait FOR a record; a NEGATIVE («the
#: second ingestion added none») never resolves by polling, so the relay is given time to have
#: written one and the result is read outright afterwards.
RELAY_TICK = 2.5


def key_of(entry: dict) -> tuple:
    """The FULL fiscal key of a breakdown entry (ADR-0186): tax, regime, operation class,
    exemption cause AND rate. Two entries that share it are ONE `DetalleDesglose`.

    The rate belongs in the key, not outside it. It is what `TipoImpositivo` carries inside the
    detail, and it is the last term `aeat::desglose` sorts by — so 21 % and 10 % under the same
    (vat, 01, subject) key are two details, while two lines at 21 % under it are one."""
    return (
        entry.get("tax"),
        entry.get("regime"),
        entry.get("class"),
        entry.get("exempt_reason", ""),
        round(float(entry.get("rate", 0.0)), 2),
    )


def check_record_matches_invoice(hub: Hub, label: str, invoice: dict, record: dict) -> None:
    """The three amounts the AEAT is told (`BaseImponible`, `CuotaTotal`, `ImporteTotal`) are the
    invoice's, to the cent. A record that drifts from its invoice declares money the customer never
    paid — and it is sealed into the hash, so it cannot be corrected, only rectified."""
    hub.check(
        f"{label}: the record's base is the invoice's",
        cents(record["base_amount"]),
        cents(invoice["base_amount"]),
    )
    hub.check(
        f"{label}: the record's quota is the invoice's",
        cents(record["tax_amount"]),
        cents(invoice["tax_amount"]),
    )
    hub.check(
        f"{label}: the record's total is the invoice's",
        cents(record["total_amount"]),
        cents(invoice["total_amount"]),
    )
    hub.check_true(
        f"{label}: the record is sealed (record_hash present)",
        bool(record.get("record_hash")),
        f"a record without a hash is not in the chain: {record}",
    )
    hub.check(f"{label}: it is an `alta`", record.get("record_type"), "alta")


# ── Cases ────────────────────────────────────────────────────────────────────────────────


def test_a_mixed_ticket_declares_one_breakdown_line_per_real_rate(hub: Hub) -> None:
    """THE business case: a beer at 21 % and a tapa at 10 % on the same ticket. Before ADR-0186 the
    AEAT was told a single EFFECTIVE rate (17,33 %) that does not exist in the Spanish tax system.
    The breakdown now carries both real rates; the effective one survives only in the row's KPI
    column, where nothing declares it."""
    print("\n§1 · a mixed ticket declares one breakdown line per REAL rate")
    invoice = issue_ticket(
        hub,
        "mixed",
        [
            ("Caña", 1, 1000, 21.0, "restaurant.alcohol"),
            ("Tapa", 1, 500, 10.0, "restaurant.food"),
        ],
    )
    entries = breakdown_of(invoice)
    hub.check("one entry per REAL rate, not one aggregate", len(entries), 2)
    for e in entries:
        hub.check(f"rate {e.get('rate')}: domestic sale, VAT", e.get("tax"), "vat")
        hub.check(f"rate {e.get('rate')}: general regime", e.get("regime"), "01")
        hub.check(f"rate {e.get('rate')}: subject and not exempt", e.get("class"), "subject")
    hub.check(
        "the 21 % line: base and quota",
        (cents(at_rate(entries, 21.0)["base"]), cents(at_rate(entries, 21.0)["quota"])),
        (1000, 210),
    )
    hub.check(
        "the 10 % line: base and quota",
        (cents(at_rate(entries, 10.0)["base"]), cents(at_rate(entries, 10.0)["quota"])),
        (500, 50),
    )
    hub.check("the invoice's base", cents(invoice["base_amount"]), 1500)
    hub.check("the invoice's quota", cents(invoice["tax_amount"]), 260)

    record = wait_for_record(hub, invoice["id"])
    check_record_matches_invoice(hub, "mixed", invoice, record)
    # The effective rate lives in the ROW and nowhere else. `aeat::desglose` emits one detail per
    # real rate and only falls back to this column when the breakdown is unreadable, so a ticket
    # whose breakdown survives never declares 17,33 % to the AEAT.
    hub.check(
        "the row's tax_rate is the EFFECTIVE rate on a mixed ticket (260/1500)",
        float(record["tax_rate"]),
        17.33,
    )
    hub.check_true(
        "…and no breakdown line declares it",
        all(abs(float(e["rate"]) - 17.33) > 0.01 for e in entries),
        f"the effective rate is not a Spanish rate and must never be declared: {entries}",
    )


def test_two_lines_under_the_same_fiscal_key_collapse_into_one_line(hub: Hub) -> None:
    """`restaurant.alcohol` and `product.generic` are different categories, but in Spain both
    resolve to VAT / general regime / subject / 21 %: the AEAT wants the operation grouped by the
    key it declares, not by the catalogue the shop happens to use. The rest of this battery would
    still pass if the aggregation broke and every line got its own detail — this case will not."""
    print("\n§2 · two lines under the SAME fiscal key are ONE breakdown line")
    invoice = issue_ticket(
        hub,
        "collapse",
        [
            ("Copa de vino", 1, 400, 21.0, "restaurant.alcohol"),
            ("Mechero", 1, 100, 21.0, "product.generic"),
            ("Bocadillo", 1, 500, 10.0, "restaurant.food"),
        ],
    )
    entries = breakdown_of(invoice)
    hub.check("two rates → two entries, however many lines feed them", len(entries), 2)
    hub.check(
        "the 21 % lines add up into one entry",
        (cents(at_rate(entries, 21.0)["base"]), cents(at_rate(entries, 21.0)["quota"])),
        (500, 105),
    )
    hub.check(
        "the 10 % line is untouched",
        (cents(at_rate(entries, 10.0)["base"]), cents(at_rate(entries, 10.0)["quota"])),
        (500, 50),
    )
    hub.check(
        "the three lines became two distinct fiscal keys",
        len({key_of(e) for e in entries}),
        2,
    )

    record = wait_for_record(hub, invoice["id"])
    check_record_matches_invoice(hub, "collapse", invoice, record)


def test_an_exempt_service_is_exempt_not_subject_at_zero(hub: Hub) -> None:
    """A VAT-EXEMPT service (healthcare, art. 20.Uno.3 — seeded as `service.health` with cause
    `E1`) is a different declaration from a sale subject at 0 %. In the XSD `OperacionExenta` is an
    ALTERNATIVE to `CalificacionOperacion` (`<choice>`), and §15.5 forbids informing rate or quota
    on that line, so the two facts cannot share an entry. Declaring it as "subject at 0 %" is a
    different fact about the same money, and is what the hub did before ADR-0186."""
    print("\n§3 · an exempt service is EXEMPT, not subject at 0 %")
    invoice = issue_ticket(
        hub,
        "exempt",
        [
            ("Tratamiento capilar médico", 1, 4000, 0.0, "service.health"),
            ("Corte de pelo", 1, 2000, 21.0, "service.generic"),
        ],
    )
    entries = breakdown_of(invoice)
    hub.check("exempt and subject never share an entry", len(entries), 2)
    exempt = [e for e in entries if e.get("class") == "exempt"]
    hub.check("exactly one EXEMPT entry", len(exempt), 1)
    if exempt:
        hub.check("its cause is in the AEAT vocabulary", exempt[0].get("exempt_reason"), "E1")
        hub.check(
            "an exempt line charges nothing",
            (cents(exempt[0]["base"]), cents(exempt[0]["quota"])),
            (4000, 0),
        )
    subject = at_rate(entries, 21.0)
    hub.check("the haircut is subject", subject.get("class"), "subject")
    hub.check(
        "…at 21 %, base and quota",
        (cents(subject["base"]), cents(subject["quota"])),
        (2000, 420),
    )
    # The exempt base is BASE, not quota: it belongs in the invoice total and out of the VAT.
    hub.check("the exempt base is inside the invoice base", cents(invoice["base_amount"]), 6000)
    hub.check("…and outside its VAT", cents(invoice["tax_amount"]), 420)

    record = wait_for_record(hub, invoice["id"])
    check_record_matches_invoice(hub, "exempt", invoice, record)
    # Rates [0, 21] are not all equal → the row falls back to the effective rate (420/6000).
    hub.check("the row's tax_rate is the effective one", float(record["tax_rate"]), 7.0)


def test_an_exempt_service_and_a_zero_rated_sale_never_share_a_line(hub: Hub) -> None:
    """The collision the array generation was introduced for (ADR-0186 §1): an EXEMPT service and
    a sale SUBJECT at 0 % both hashed to the key `"0.00"` in the old rate-keyed object and melted
    into one line that declared both wrong. It is literally a salon ticket with a healthcare
    treatment on it. §15.4: an S1 at 0 % DOES inform rate and quota, explicitly zero — that is the
    difference with the exempt line, and the reason they cannot share a detail."""
    print("\n§4 · an exempt service and a zero-rated sale never share a line")
    # A zero-rated but SUBJECT category, created the way a hub creates it (Settings → Taxes).
    # Idempotent across runs on a shared hub: a second `create` of the same key is not needed.
    hub.command(
        "taxes.categories.create",
        {"key": "product.zero_rated", "name": "Product — zero rated"},
    )
    hub.command(
        "taxes.rules.create",
        {
            "country_code": "ES",
            "tax_category_key": "product.zero_rated",
            "rate_pct": 0,
            "tax_type": "vat",
            "operation_class": "subject",
        },
    )
    invoice = issue_ticket(
        hub,
        "zerorated",
        [
            ("Consulta médica", 1, 3000, 0.0, "service.health"),
            ("Mascarilla sanitaria", 1, 1000, 0.0, "product.zero_rated"),
        ],
    )
    entries = breakdown_of(invoice)
    hub.check(
        "exempt and subject-at-0 % are two declarations, not one line", len(entries), 2
    )
    exempt = [e for e in entries if e.get("class") == "exempt"]
    zero = [e for e in entries if e.get("class") == "subject"]
    hub.check("one exempt entry", len(exempt), 1)
    hub.check("one subject entry", len(zero), 1)
    if exempt:
        hub.check(
            "the consultation is exempt, base only",
            (cents(exempt[0]["base"]), cents(exempt[0]["quota"])),
            (3000, 0),
        )
    if zero:
        hub.check(
            "the mask is subject at 0 %, with an explicit zero quota",
            (cents(zero[0]["base"]), cents(zero[0]["quota"]), float(zero[0]["rate"])),
            (1000, 0, 0.0),
        )
    hub.check_true(
        "…and their fiscal keys differ",
        len({key_of(e) for e in entries}) == 2,
        f"a single key would collapse them into one DetalleDesglose: {entries}",
    )

    record = wait_for_record(hub, invoice["id"])
    check_record_matches_invoice(hub, "zerorated", invoice, record)
    hub.check("nothing was charged", cents(record["tax_amount"]), 0)


def test_the_quota_closes_once_per_fiscal_key_not_per_line(hub: Hub) -> None:
    """ADR-0405 §Decisión 4. Two coffees at 2,50 € make the difference visible: the key aggregates
    to a base of 5,00 € and `percent_of(500, 21 %)` is 1,05 €, where rounding each line first
    (52,5 cents → 53, HALF_UP) and adding would declare 1,06 €. Per-line accumulation is what
    ADR-0405 deleted: four lines of 0,50 € at 21 % declared 44 over a base of 200, which no rate
    justifies, and the downstream gates (verifactu#60 `013`, hub#1180) were killing ~33 % of long
    tickets over it."""
    print("\n§5 · the quota closes ONCE per fiscal key, never per line")
    invoice = issue_ticket(
        hub,
        "perkey",
        [
            ("Café solo", 1, 250, 21.0, "product.generic"),
            ("Café con leche", 1, 250, 21.0, "product.generic"),
        ],
    )
    entries = breakdown_of(invoice)
    hub.check("same fiscal key → one entry", len(entries), 1)
    hub.check(
        "round(500 × 21 %) = 105, not 53 + 53",
        (cents(entries[0]["base"]), cents(entries[0]["quota"])),
        (500, 105),
    )
    hub.check("the invoice's quota is the key's", cents(invoice["tax_amount"]), 105)
    hub.check("…and the till reconciles at 6,05 €", cents(invoice["total_amount"]), 605)

    record = wait_for_record(hub, invoice["id"])
    check_record_matches_invoice(hub, "perkey", invoice, record)
    # A single declared rate: the row carries the DECLARED 21 %, not an effective rate (hub#1198).
    hub.check(
        "a single-rate ticket stores the DECLARED rate in the row",
        float(record["tax_rate"]),
        21.0,
    )


def test_a_sale_wide_discount_is_spread_across_rates(hub: Hub, cash: str) -> None:
    """A whole-sale discount over lines at DIFFERENT rates, through the POS path. Prices are
    VAT-INCLUDED, `sales` prorates the discount to each line and extracts its base there, and the
    auto-F2 that `invoice.create_from_sale` issues off the outbox must respect that split — never
    re-apply VAT on the gross. What the AEAT is told has to be what the customer actually paid, to
    the cent: 11,00 € + 5,00 € with 10 % off is 14,40 € in the till."""
    print("\n§6 · a sale-wide discount is spread across rates and still reconciles")
    hub.run(
        "sales.complete_sale",
        {
            "customer_name": "Cliente",
            "idempotency_key": charge_key("desglose-discount"),
            "payment_method_id": cash,
            "tax_included": True,
            "discount_percent": 10.0,
            "items": [
                {
                    "product_name": "Menú del día",
                    "price": 1100,
                    "quantity": hub_harness.ONE,
                    "tax_rate": 10.0,
                    "tax_category_key": "restaurant.food",
                },
                {
                    "product_name": "Copa de vino",
                    "price": 500,
                    "quantity": hub_harness.ONE,
                    "tax_rate": 21.0,
                    "tax_category_key": "restaurant.alcohol",
                },
            ],
        },
    )
    invoice = wait_for_auto_f2(hub)
    entries = breakdown_of(invoice)
    hub.check("the discount must not invent or merge rates", len(entries), 2)
    # 11,00 € − 10 % = 9,90 € VAT-included at 10 % → base 9,00 € + quota 0,90 €.
    hub.check(
        "the 10 % line after prorating",
        (cents(at_rate(entries, 10.0)["base"]), cents(at_rate(entries, 10.0)["quota"])),
        (900, 90),
    )
    # 5,00 € − 10 % = 4,50 € VAT-included at 21 % → base 3,72 € + quota 0,78 €.
    hub.check(
        "the 21 % line after prorating",
        (cents(at_rate(entries, 21.0)["base"]), cents(at_rate(entries, 21.0)["quota"])),
        (372, 78),
    )
    hub.check("the invoice's base", cents(invoice["base_amount"]), 1272)
    hub.check("the invoice's quota", cents(invoice["tax_amount"]), 168)
    hub.check(
        "what the AEAT is told is what the till took",
        cents(invoice["total_amount"]),
        1440,
    )

    record = wait_for_record(hub, invoice["id"])
    check_record_matches_invoice(hub, "discount", invoice, record)
    hub.check(
        "the record's total is the discounted total, never the gross",
        cents(record["total_amount"]),
        1440,
    )


def test_the_same_invoice_ingested_twice_seals_one_record(hub: Hub) -> None:
    """The same invoice ingested TWICE must leave exactly ONE record — and must not burn a
    sequence number on the way (verifactu#99).

    An invoice reaches this module through `invoice.created`, but that is not the only way in:
    `records.ingest_invoice` is a PUBLIC command (`verifactu.manage_verifactu`), the outbox retries
    a listener whose first delivery failed, and since ERPlora/sales#272 a shop can register its own
    sale over the public API — so «the same invoice arrives twice» is an ordinary event, not an
    exotic one.

    Two ways to fail, and both are non-compliance:

      1. **A second record.** `verifactu_record` is a chained ledger under RD 1007/2023: every row
         hashes the previous one. A duplicate is not a spare row, it is a second entry in an
         immutable chain, and a fiscal record has no undo (ADR-0189). `uq_verifactu_record`
         (`hub_id, issuer_nif, invoice_number, invoice_date, record_type`) is what stops it; this
         is what EXERCISES it — until now the index was asserted by nothing.

      2. 🔴 **A burnt sequence number.** Subtler and just as bad: a second ingestion that takes the
         next `sequence_number` and only THEN hits the unique index leaves a hole in the chain, and
         a chain with a hole is exactly what the AEAT reads as tampering. Asserting «still one row»
         alone would pass while that happened, so the next record's number is asserted too. It is
         the same failure `invoice/tests/from_sale.hub.test.py` §3 pins for ticket numbering.
    """
    print("\n§7 · the same invoice ingested twice seals ONE record, and burns no number")
    invoice = issue_ticket(hub, "twice", [("Caña", 1, 1000, 21.0, "restaurant.alcohol")])
    record = wait_for_record(hub, invoice["id"])
    sealed_id = record["id"]
    sealed_sequence = int(record["sequence_number"])
    # Counted by the invoice's OWN number, not by a hub-wide total: `issue_ticket` mints a fresh
    # series per run (`unique_series`), so this number belongs to this case alone and the count is
    # exact on a hub SHARED with every other run this battery has ever had. `by_invoice` cannot do
    # it — its SQL is `LIMIT 1`, so it would answer «one» even if there were two.
    sealed_number = record["invoice_number"]
    records_of_this_invoice = lambda: hub.query(
        "verifactu.records.list", {"f_invoice_number": sealed_number}
    )
    hub.check("one record for this invoice to begin with", len(records_of_this_invoice()), 1)

    # The second arrival, through the public door the listener itself uses.
    hub.command("verifactu.records.ingest_invoice", {"invoice_id": invoice["id"]})
    # Whatever the answer was — a refusal, a no-op — what matters is what it LEFT. The relay gets
    # its tick so a second record would have had time to land, and then we look.
    time.sleep(RELAY_TICK)

    again = records_of_this_invoice()
    hub.check("the invoice still has exactly one record", len(again), 1)
    if len(again) == 1:
        hub.check("…and it is the SAME record, not a fresh seal", again[0]["id"], sealed_id)

    # And the chain closed over it: the next invoice takes the very next number. A gap here would
    # be a hole in a hash chain the AEAT reads as tampering.
    next_record = wait_for_record(
        hub,
        issue_ticket(hub, "after-twice", [("Caña", 1, 1000, 21.0, "restaurant.alcohol")])["id"],
    )
    hub.check(
        "the next record takes the next number: no sequence was burnt",
        int(next_record["sequence_number"]),
        sealed_sequence + 1,
    )

def wait_for_auto_f2(hub: Hub, timeout: float = 20.0):
    """The auto-F2 the relay mints for the sale just completed. Scoped to THIS run by the invoice's
    own `source_id`: `sales.complete_sale` returns the sale id in `new_ids`, and `invoice.by_source`
    answers only for it — safe on a hub shared with every other run."""
    import time

    rows = hub.query("sales.list")
    if not rows:
        raise AssertionError("sales.list is empty right after completing a sale")
    sale_id = rows[0]["id"]
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        found = hub.query("invoice.by_source", {"source_id": sale_id})
        if found:
            return invoice_of(hub, found[0]["id"])
        time.sleep(0.2)
    raise AssertionError(
        f"timed out after {timeout}s waiting for the auto-F2 of sale {sale_id}"
    )


def main() -> int:
    hub = Hub("desglose.hub")
    print(
        f"Hub battery · desglose (hub#1264 ← verifactu_desglose_e2e.rs) · {hub_harness.BASE} · "
        f"hub {hub.hub_id} · user {hub.user}"
    )
    fiscal_setup(hub)
    cash = cash_method_id(hub)
    test_a_mixed_ticket_declares_one_breakdown_line_per_real_rate(hub)
    test_two_lines_under_the_same_fiscal_key_collapse_into_one_line(hub)
    test_an_exempt_service_is_exempt_not_subject_at_zero(hub)
    test_an_exempt_service_and_a_zero_rated_sale_never_share_a_line(hub)
    test_the_quota_closes_once_per_fiscal_key_not_per_line(hub)
    test_a_sale_wide_discount_is_spread_across_rates(hub, cash)
    test_the_same_invoice_ingested_twice_seals_one_record(hub)
    return hub.finish(
        "what `invoice` writes is what the VeriFactu record seals, to the cent, through the real "
        "native engine"
    )


if __name__ == "__main__":
    sys.exit(main())
