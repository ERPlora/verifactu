#!/usr/bin/env python3
"""The Events list declares what its screen promises: a search, and the newest event first.

Regression test for ERPlora/verifactu#140 and ERPlora/verifactu#144. The end-to-end proof, against
a live list engine, is `events_list.hub.test.py`; this is the half that runs on every gate with no
hub and no Postgres, reading the manifest and the component as they are.

  * #140 — `erp-verifactu-events` shows a search box («Search type or message…»). The list engine
    only searches the columns `module.json.queries[<name>].list.search` declares; with none, the
    `search` parameter is dropped in silence and every event comes back. The box promises TYPE and
    MESSAGE, so both have to be searched — the type by its code AND by the words the screen paints
    for it (`type_label`, built by `queries/events_list.sql`).
  * #147 — the message is searched by the words the screen PAINTS, not only by the prose the row
    stores: the cell is composed from the catalogue of the reader's language, the row keeps the
    engine's Spanish. `message_words` carries every sentence in both languages.
  * #144 — an activity log opens on what just happened. The manifest's `default_sort` is what the
    engine applies, and the component starts its controller on its own sort: both have to say
    «When», newest first, or the first paint and the first page disagree.

Usage: tests/events_list.contract.test.py   (exit 0 = green)
"""

import json
import pathlib
import re
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())
COMPONENT = (
    MODULE_DIR
    / "ui"
    / "components"
    / "erp-verifactu-events"
    / "erp-verifactu-events.ts"
).read_text()
SQL = (MODULE_DIR / "queries" / "events_list.sql").read_text()

QUERY = "verifactu.events.list"
SEARCHED = ("message", "event_type", "type_label", "message_words")


def main() -> int:
    failures: list[str] = []
    spec = MANIFEST["queries"][QUERY]["list"]

    search = spec.get("search") or []
    for column in SEARCHED:
        if column not in search:
            failures.append(
                f"{QUERY}.list.search does not include `{column}` (declares {search}): the "
                "search box sends `search` and the engine drops it for undeclared columns"
            )
    if not re.search(r"\bAS\s+type_label\b", SQL, re.IGNORECASE):
        failures.append(
            "queries/events_list.sql does not select a `type_label` column to search"
        )
    if not re.search(r"\bAS\s+message_words\b", SQL, re.IGNORECASE):
        failures.append(
            "queries/events_list.sql does not select a `message_words` column to search"
        )

    if spec.get("default_sort") != "timestamp" or spec.get("default_dir") != "desc":
        failures.append(
            f"{QUERY}.list opens on default_sort={spec.get('default_sort')!r} "
            f"default_dir={spec.get('default_dir')!r}; the newest event has to come first "
            "(timestamp, desc)"
        )
    if "timestamp" not in (spec.get("sort") or []):
        failures.append(f"{QUERY}.list.sort does not allow `timestamp`")

    ctrl = re.search(
        r"createListController<[^>]*>\(.*?'verifactu\.events\.list',.*?,\s*\{(.*?)\}\s*\)",
        COMPONENT,
        re.DOTALL,
    )
    if not ctrl:
        failures.append(
            "erp-verifactu-events no longer builds its list controller as expected"
        )
    else:
        opts = ctrl.group(1)
        if not re.search(r"sort:\s*'timestamp'", opts) or not re.search(
            r"dir:\s*'desc'", opts
        ):
            failures.append(
                f"erp-verifactu-events starts its controller on {opts.strip()!r}, not on "
                "sort 'timestamp' / dir 'desc': the first paint would disagree with the manifest"
            )

    if failures:
        print(f"✗ events_list.contract: {len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        "✓ events_list.contract: search declared over message and type, newest event first"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
