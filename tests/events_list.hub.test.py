#!/usr/bin/env python3
"""The Events screen SEARCHES and shows the NEWEST first, against the REAL kernel.

Regression battery for ERPlora/verifactu#140, ERPlora/verifactu#144 and ERPlora/verifactu#147.

  * #140 — the box «Search type or message…» sends `search` to `verifactu.events.list`, but the
    query declared no `list.search`, so the list engine dropped the word in silence and every
    event came back whatever the owner typed. Measured on `hub:stable` 1.1.30 with 6 events:
    `search=pendiente` and `search=aplazado` both answered the 6.
  * #144 — the list opened on the OLDEST events (`default_sort: id asc`): what just happened (a
    deferred submission, a broken chain) sat at the bottom, on another page past 50 rows.
  * #147 — the message was searched only by the Spanish prose the row stores, never by the words
    the screen paints from the catalogue: «sealed» (en) and «sellado» (es) found nothing.

All three live in the list ENGINE (`hub/crates/runtime/src/queries.rs`), which only a live runtime
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


def evt_sentence(locale: str, path: str) -> str:
    """The sentence `ui.evt.<path>` of a locale — what the Message cell paints for that code."""
    cursor = json.loads((LOCALES / f"{locale}.json").read_text())["ui"]["evt"]
    for part in path.split("."):
        cursor = cursor[part]
    return cursor


def details_of(row: dict) -> dict:
    """`details` as an object: stored as TEXT, it may arrive as a string or already parsed."""
    raw = row.get("details") or {}
    return json.loads(raw) if isinstance(raw, str) else raw


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

    print(
        "\n§4 · the search finds an event by the words its MESSAGE shows, in either language"
    )
    # verifactu#147: the Message cell is composed from `details.message_key` with the reader's
    # catalogue, while the row stores the engine's Spanish prose («Registro alta #N de F creado»).
    # «sealed» (en) and «sellado» (es) are what the screen paints for a new record, and neither
    # is in the stored prose — the search used to answer both with nothing.
    created = [
        r for r in ours(events(hub), both) if r.get("event_type") == "record_created"
    ]
    hub.check("this run filed two `record_created` events", len(created), 2)
    stored = " ".join(str(r.get("message") or "") for r in created).lower()
    for locale, word in (("en", "sealed"), ("es", "sellado")):
        hub.check_true(
            f"«{word}» is in the {locale} sentence the screen paints for a new record",
            word in evt_sentence(locale, "record_created"),
            evt_sentence(locale, "record_created"),
        )
        hub.check_true(
            f"…and not in the prose the engine stores, so only the painted words can find it",
            word not in stored,
            stored,
        )
        for typed in (word, word.upper()):
            rows = [
                r
                for r in ours(events(hub, search=typed), both)
                if r.get("event_type") == "record_created"
            ]
            hub.check(
                f"searching «{typed}» ({locale}) finds this run's two `record_created` events",
                len(rows),
                2,
            )
    # A reason nested in `details` paints its own sentence inside the message (verifactu#111:
    # a record that did not leave with its sale says why). This battery's hub has no road to the
    # AEAT, so every record it seals files a `transmission_deferred` carrying `why_reason`.
    deferred = [
        r
        for r in ours(events(hub), both)
        if r.get("event_type") == "transmission_deferred"
    ]
    hub.check("this run's two records waited for a road to the AEAT", len(deferred), 2)
    codes = {
        details_of(r).get("why_reason", {}).get("code") for r in deferred
    }
    hub.check("…and said why with the same reason code", len(codes), 1)
    (code,) = codes
    for locale in ("en", "es"):
        # The words before the first placeholder or colon: the fixed part the screen paints.
        words = (
            evt_sentence(locale, f"reason.{code}").split(":")[0].split("{")[0].strip()
        )
        rows = [
            r
            for r in ours(events(hub, search=words), both)
            if r.get("event_type") == "transmission_deferred"
        ]
        hub.check(
            f"searching «{words}» ({locale}, reason `{code}`) finds this run's two deferred events",
            len(rows),
            2,
        )
    words = evt_sentence("en", "chain_validated").split(":")[0]
    rows = ours(events(hub, search=words), both)
    hub.check(
        f"the words of ANOTHER message («{words}») do not match these events",
        len(rows),
        0,
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
