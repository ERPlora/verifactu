#!/usr/bin/env python3
"""The Events screen SEARCHES and shows the NEWEST first, against the REAL kernel.

Regression battery for ERPlora/verifactu#140 and ERPlora/verifactu#144.

  * #140 — the box «Search type or message…» sends `search` to `verifactu.events.list`, but the
    query declared no `list.search`, so the list engine dropped the word in silence and every
    event came back whatever the owner typed. Measured on `hub:stable` 1.1.30 with 6 events:
    `search=pendiente` and `search=aplazado` both answered the 6.
  * #144 — the list opened on the OLDEST events (`default_sort: id asc`): what just happened (a
    deferred submission, a broken chain) sat at the bottom, on another page past 50 rows.

Both live in the list ENGINE (`hub/crates/runtime/src/queries.rs`), which only a live runtime
has: it wraps this module's SQL, adds the `search` OR-group over the declared columns and the
default `ORDER BY`. So the battery seeds real events the only way they are born — an invoice the
real `invoice` handler issues, sealed by the native engine into a record whose `record_created`
event lands in `verifactu_event` — and reads them back through `/api/query`.

The hub is SHARED with every previous run, so every assertion is about THIS run's two invoices
(their numbers carry a fresh series code), never about totals of the whole table.

Nothing here reaches the AEAT: the battery's hub has no certificate and no gateway, and it only
reads the audit trail.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Never on its
own: without a runtime it fails, it does not skip.
"""

import json
import pathlib
import sys
import time

from hub_harness import Hub, fiscal_setup, issue_ticket, wait_for_record

LIST = "verifactu.events.list"
LOCALES = pathlib.Path(__file__).resolve().parent.parent / "locales"


def type_label(locale: str, code: str) -> str:
    return json.loads((LOCALES / f"{locale}.json").read_text())["ui"]["evtType"][code]


def events(hub: Hub, **params) -> list[dict]:
    return hub.query(LIST, {"limit": 200, **params})


def ours(rows: list[dict], record_ids: set[str]) -> list[dict]:
    return [r for r in rows if r.get("record_id") in record_ids]


def main() -> int:
    hub = Hub("events_list.hub")
    fiscal_setup(hub)

    # Two invoices, a second apart: the engine stamps `timestamp` with its own clock, and the
    # order the screen shows has to be the order they happened in.
    first = issue_ticket(hub, "evt-old", [("Café", 1, 150, 10.0, "restaurant.food")])
    first_record = wait_for_record(hub, first["id"])
    time.sleep(1.2)
    second = issue_ticket(hub, "evt-new", [("Café", 1, 150, 10.0, "restaurant.food")])
    second_record = wait_for_record(hub, second["id"])
    both = {first_record["id"], second_record["id"]}

    print("\n§1 · the search narrows the list to what was typed (verifactu#140)")
    rows = events(hub, search=first_record["invoice_number"])
    hub.check_true(
        "searching the first invoice's number finds its event",
        any(r.get("record_id") == first_record["id"] for r in rows),
        f"rows: {rows}",
    )
    hub.check_true(
        "…and leaves the second invoice's event out",
        all(r.get("record_id") != second_record["id"] for r in rows),
        "the engine ignored `search` and answered every event",
    )
    none = events(hub, search="zz-no-event-says-this-zz")
    hub.check("a word no event carries leaves the list empty", len(none), 0)

    print("\n§2 · the search finds an event by its TYPE, in the words the screen shows")
    for locale in ("es", "en"):
        label = type_label(locale, "record_created")
        rows = ours(events(hub, search=label), both)
        hub.check(
            f"searching «{label}» ({locale}) finds this run's two `record_created` events",
            len(rows),
            2,
        )
        # Case- and accent-insensitive, like every search box of the market (hub#2096).
        rows = ours(events(hub, search=label.upper()), both)
        hub.check(f"«{label.upper()}» finds them too", len(rows), 2)
    rows = ours(events(hub, search=type_label("es", "chain_error")), both)
    hub.check("the name of ANOTHER type does not match these events", len(rows), 0)

    print("\n§3 · the list opens on the newest event (verifactu#144)")
    rows = events(hub)
    stamps = [str(r.get("timestamp") or "") for r in rows]
    hub.check_true(
        "with no sort chosen, «When» runs from newest to oldest",
        stamps == sorted(stamps, reverse=True),
        f"timestamps in the order served: {stamps[:10]}",
    )
    positions = [r.get("record_id") for r in rows]
    hub.check_true(
        "the second invoice's event comes before the first's",
        second_record["id"] in positions
        and first_record["id"] in positions
        and positions.index(second_record["id"]) < positions.index(first_record["id"]),
        f"record ids in the order served: {positions[:10]}",
    )
    # The header still sorts the other way when the owner asks for it.
    asc = [
        str(r.get("timestamp") or "") for r in events(hub, sort="timestamp", dir="asc")
    ]
    hub.check_true(
        "sorting «When» ascending by hand still works",
        asc == sorted(asc),
        str(asc[:10]),
    )

    return hub.finish(
        "the Events list searches message and type and opens on the newest event"
    )


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError as err:
        print(f"✗ events_list.hub: {err}")
        sys.exit(1)
