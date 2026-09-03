#!/usr/bin/env python3
"""Every column a table offers as FILTERABLE is a filter its query declares (verifactu#64).

Regression test for ERPlora/verifactu#64 (`origin: hub#1182`).

A column marked `filterable: true` in an `ok-data-table` sends `f_<column>` to its query, and the
query only honours what `module.json.queries[<name>].list.filters` declares. Undeclared, the
parameter is **dropped in silence** — measured against `ghcr.io/erplora/hub:dev`:

    verifactu.records.list                        -> total 32
    verifactu.records.list  f_invoice_type=F2     -> total 32     (declared: it filters)
    verifactu.records.list  f_invoice_type=F1     -> total 0      (declared: it filters)
    verifactu.records.list  f_nonsense=zzz        -> total 32     (undeclared: dropped)

So the user filters and the list does not change — the failure mode that is worse than having no
filter at all, because the screen looks capable and is not. hub#1173 turns that silence into a 422
`unknown_filter` (`hub/crates/runtime/src/queries.rs`,
`hub1182_an_undeclared_f_prefixed_filter_is_rejected_not_dropped`); the same declaration fixes
both, and this test does not depend on which of the two the hub is doing today.

The pair also has to AGREE on shape: a `daterange` control sends `f_<col>_from`/`f_<col>_to`, a
`text` control sends `f_<col>`. `op: "range"` serves the first, `op: "eq"`/`"like"` the second.
Declaring the filter with the wrong op moves the 422 rather than removing it, so both halves are
pinned here.

This is the mechanical guard the incident asked for, not just the patch: it reads the components
and the manifest as they are, so a NEW filterable column added to any table is covered the day it
lands. It is a pure contract test — no hub, no Postgres.

Usage: tests/list_filters.contract.test.py   (exit 0 = green)
"""

import json
import pathlib
import re
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

# How an `ok-data-table` `filterType` reaches the kernel, and which `op` can serve it.
# `daterange`/`numberrange` send a pair of bounds; everything else sends one value.
OPS_FOR_FILTER_TYPE = {
    "daterange": {"range"},
    "numberrange": {"range"},
    "text": {"eq", "like"},
    "select": {"eq"},
}

# A calendar date OR a full ISO-8601 instant is filtered by a RANGE, never by a free-text box
# (verifactu#68).
#
# The pair above only checks that the control and the `op` AGREE. Both halves can agree and still
# be the wrong control: `invoice_date` as `filterType: 'text'` + `op: "eq"` is internally consistent
# and asks the user to type `2026-08-29` exactly to see that one day — while the sibling table
# `erp-verifactu-records`, over the SAME column of the SAME shape, offers a from/to. Two screens of
# one module disagreeing about how a date is filtered is the thing the user notices.
#
# Two shapes, one rule. `_date` columns are `TEXT` holding a date-only `YYYY-MM-DD`
# (`verifactu_record.invoice_date`, `verifactu_aeat_record.invoice_date`); `_at`-suffixed columns
# and `timestamp` are `TEXT` holding a full ISO-8601 instant (`verifactu_event.timestamp`,
# `verifactu_contingency.next_attempt_at`, `verifactu_aeat_record.query_timestamp`). Both used to
# need different rules, because a lexicographic `to <= '2026-08-29'` is exact for a bare date but
# drops every instant later that same day (`'2026-08-29T14:23:11+02:00' <= '2026-08-29'` is
# FALSE) — the range came back empty even with rows that day. That gap is closed: the list engine
# now widens a bare-date `to` bound to the START of the next day before comparing
# (`hub/crates/runtime/src/queries.rs`, verifactu#70), so both column shapes get the same,
# correct, `daterange` control.
DATE_COLUMN_SUFFIXES = ("_date", "_at")
DATE_COLUMN_NAMES = {"timestamp"}
DATE_FILTER_TYPE = "daterange"


def is_date_column(name: str) -> bool:
    return name.endswith(DATE_COLUMN_SUFFIXES) or name in DATE_COLUMN_NAMES


failures: list[str] = []


def fail(message: str) -> None:
    failures.append(message)
    print(f"  FAIL: {message}")


def ok(message: str) -> None:
    print(f"  ok: {message}")


def balanced_objects(source: str):
    """Every balanced `{…}` block of the source, innermost first is not needed — the column
    literals are the only blocks that carry both `key:` and `header:`."""
    starts: list[int] = []
    for index, char in enumerate(source):
        if char == "{":
            starts.append(index)
        elif char == "}" and starts:
            begin = starts.pop()
            yield source[begin : index + 1]


def columns_of(source: str) -> list[tuple[str, str]]:
    """`(column key, filterType)` of every column the component marks `filterable: true`."""
    found: list[tuple[str, str]] = []
    for block in balanced_objects(source):
        if "key:" not in block or "header:" not in block:
            continue
        if not re.search(r"filterable:\s*true", block):
            continue
        key = re.search(r"key:\s*'([^']+)'", block)
        if not key:
            continue
        kind = re.search(r"filterType:\s*'([^']+)'", block)
        found.append((key.group(1), kind.group(1) if kind else "text"))
    return found


def declared_filters(query_name: str) -> dict:
    query = MANIFEST.get("queries", {}).get(query_name)
    if not isinstance(query, dict):
        fail(f"the manifest declares no query `{query_name}`")
        return {}
    return ((query.get("list") or {}).get("filters")) or {}


def main() -> int:
    components = sorted((MODULE_DIR / "ui" / "components").rglob("*.ts"))
    checked = 0
    dates_checked = 0
    seen: set[tuple[str, str]] = set()
    for path in components:
        if path.name.endswith(".test.ts"):
            continue
        source = path.read_text()
        listed = re.search(
            r"createListController<[^>]*>\(\s*erplora\(\),\s*'([^']+)'", source
        )
        if not listed:
            continue
        query_name = listed.group(1)
        filters = declared_filters(query_name)
        for column, kind in columns_of(source):
            # The same literal is reached through the outer blocks that contain it; one report per
            # (component, column) keeps the output about the contract, not about the parser.
            if (path.name, column) in seen:
                continue
            seen.add((path.name, column))
            checked += 1
            label = f"{path.name}: `{column}` (filterType {kind}) → {query_name}"
            # No `continue`: the control rule and the `op` rule are INDEPENDENT, and skipping the
            # second one here would hand a half-fix a green light. Swapping the component to
            # `daterange` while leaving `op: "eq"` in the manifest has to keep failing — that pair
            # is the whole point of verifactu#68, and it is how the same column stayed broken
            # through #64.
            if is_date_column(column):
                dates_checked += 1
                if kind != DATE_FILTER_TYPE:
                    fail(
                        f"{label} — a calendar date offered as `{kind}` is an exact-string box: "
                        f"the user has to type the day character by character to see it. Use "
                        f"`filterType: '{DATE_FILTER_TYPE}'` (and `op: \"range\"`), the same "
                        f"from/to the other tables of this module give the same column"
                    )
            declared = filters.get(column)
            if declared is None:
                fail(
                    f"{label} — the table offers the filter and the query declares none, so "
                    f"`f_{column}` is dropped and the list does not change (a 422 "
                    f"`unknown_filter` once hub#1173 lands). Declared: {sorted(filters)}"
                )
                continue
            op = declared.get("op") if isinstance(declared, dict) else None
            allowed = OPS_FOR_FILTER_TYPE.get(kind)
            if allowed and op not in allowed:
                fail(
                    f"{label} — declared with `op: {op}`, which cannot serve a {kind} control "
                    f"(expected one of {sorted(allowed)}): the bounds it sends stay unknown"
                )
                continue
            ok(f"{label} — `op: {op}`")
    if not checked:
        fail(
            "no filterable column was inspected: the parser stopped matching the components, so "
            "this test would pass while proving nothing"
        )
    if not dates_checked:
        fail(
            "no filterable date/instant column was inspected (suffixes "
            f"{DATE_COLUMN_SUFFIXES}, names {sorted(DATE_COLUMN_NAMES)}): the date rule would "
            "pass while proving nothing (verifactu#68)"
        )
    print()
    if failures:
        print(f"✗ list_filters.contract: {len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        f"✓ list_filters.contract: {checked} filterable column(s), every one declared by its query "
        "with an op its control can use"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
