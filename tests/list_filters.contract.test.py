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
#
# `timestamp` is a SUFFIX, not an exact name (verifactu#90). `verifactu_aeat_record.query_timestamp`
# holds the same ISO-8601 instant as `verifactu_event.timestamp` and used to fall outside the rule
# on a technicality: it ends in neither `_date` nor `_at`, and the exact-name set held only the bare
# word. Today the column is not filterable, so nothing is broken on screen — but the guard is the
# only thing standing between «somebody opens it» and an exact-string box asking the user to type an
# instant to the second, timezone included. Matching by suffix covers the bare `timestamp` too
# (`"timestamp".endswith("timestamp")`), so the exact-name set has nothing left to hold.
DATE_COLUMN_SUFFIXES = ("_date", "_at", "timestamp")
DATE_FILTER_TYPE = "daterange"


def is_date_column(name: str) -> bool:
    return name.endswith(DATE_COLUMN_SUFFIXES)


#: The check on the RULE itself (verifactu#90). The sweep above only inspects columns that are
#: ALREADY `filterable: true`, so a column the rule does not recognise is invisible here until the
#: day somebody makes it filterable -- and that day the box ships as an exact-string one and the
#: sweep stays green, which is how #64, #68 and #70 each found the same hole again. These cases pin
#: the rule on its own, so narrowing it is a red test today instead of a bad box later.
#:
#: `(column name, is it an instant/date?, why it matters)`.
DATE_RULE_CASES: tuple[tuple[str, bool, str], ...] = (
    ("invoice_date", True, "`verifactu_record.invoice_date` — the date-only shape, `_date` suffix"),
    ("next_attempt_at", True, "`verifactu_contingency.next_attempt_at` — an instant, `_at` suffix"),
    ("timestamp", True, "`verifactu_event.timestamp` — an instant whose whole name is the word"),
    (
        "query_timestamp",
        True,
        "`verifactu_aeat_record.query_timestamp`, the «when was the AEAT asked» column of the "
        "Recovery screen: an ISO-8601 instant exactly like `timestamp`, and the rule used to miss "
        "it because it matched that name EXACTLY instead of as a suffix (verifactu#90)",
    ),
    (
        "submitted_timestamp",
        True,
        "any future `<something>_timestamp`: the point of a suffix is that the next one is covered "
        "before it is written",
    ),
    ("invoice_number", False, "a number is not a date, and its box is free text on purpose"),
    ("estado", False, "the AEAT status is a short code, not an instant"),
    (
        "timestamp_source",
        False,
        "it CONTAINS the word but does not END with it: widening by suffix must not turn a "
        "«where did this come from» column into a calendar",
    ),
)


def the_date_rule_covers_every_instant_column() -> list[str]:
    """A column that holds an instant has to be RECOGNISED as one, whether or not it is filterable.

    verifactu#90. `is_date_column` is what decides whether a filterable column is forced to be a
    `daterange`. It is only ever consulted for columns already marked `filterable: true`, so a gap
    in it is LATENT: the guard stays green until the column is opened, and then it ships the box the
    guard exists to prevent. The rule is therefore checked on its own, by name, here.
    """
    broken = []
    for name, expected, why in DATE_RULE_CASES:
        got = is_date_column(name)
        if got is not expected:
            verb = "does not recognise" if expected else "wrongly recognises"
            broken.append(f"`{name}`: the date rule {verb} it — {why}")
    return broken


def painted_column_keys() -> dict[str, set[str]]:
    """Every `key: '<column>'` the components paint, filterable or not, and where."""
    keys: dict[str, set[str]] = {}
    for path in sorted((MODULE_DIR / "ui" / "components").rglob("*.ts")):
        if path.name.endswith(".test.ts"):
            continue
        for match in re.finditer(r"key:\s*'([^']+)'", path.read_text()):
            keys.setdefault(match.group(1), set()).add(path.name)
    return keys


def unwatched_date_columns(cases, painted: dict[str, set[str]]) -> list[str]:
    """The date columns of `painted` that no case of `cases` names. Pure, so it can be pinned."""
    named = {name for name, expected, _ in cases if expected}
    return [
        f"`{key}` is painted by {sorted(painted[key])} and the date rule calls it a date, but no "
        f"case above names it: the rule is unwatched for that column"
        for key in sorted(key for key in painted if is_date_column(key) and key not in named)
    ]


def every_real_date_column_is_named_in_the_cases() -> list[str]:
    """The cases above have to name the REAL date columns of this module, not a chosen few.

    Without this anchor the table is loose prose: deleting the `query_timestamp` line puts the rule
    back to covering nothing that anybody checks, and every case still passes — the guard would go
    quiet in exactly the way verifactu#90 is about. So the columns the module actually paints are
    read from the components, and each one the rule calls a date has to appear here with the reason
    it is one. A NEW instant column added to any table lands on this list the day it is written.

    Its own silence is not taken on trust: `unwatched_date_columns` is first shown FIRING on a
    planted column, because a comparison that has stopped comparing is quiet in the same way as one
    with nothing to report.
    """
    planted = {"invoice_date": {"planted.ts"}, "audit_at": {"planted.ts"}}
    fires = unwatched_date_columns((("invoice_date", True, "named on purpose"),), planted)
    if len(fires) != 1 or "audit_at" not in fires[0]:
        return [
            "this anchor cannot detect a column nobody watches, so its silence proves nothing: "
            f"planting an unnamed `audit_at` reported {fires}"
        ]
    if unwatched_date_columns(
        (("invoice_date", True, "named"), ("audit_at", True, "named")), planted
    ):
        return ["this anchor reports a column that IS named in the cases"]

    painted = painted_column_keys()
    if not any(is_date_column(key) for key in painted):
        return [
            "no painted column of this module is a date at all: the component parser stopped "
            "matching, so these cases would pass while proving nothing"
        ]
    return unwatched_date_columns(DATE_RULE_CASES, painted)


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
    misjudged = (
        the_date_rule_covers_every_instant_column()
        + every_real_date_column_is_named_in_the_cases()
    )
    if misjudged:
        print(
            f"✗ list_filters.contract: the date rule misjudges {len(misjudged)} column name(s), so "
            "the sweep below decides with the wrong rule:"
        )
        for m in misjudged:
            print(f"  - {m}")
        return 1

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
            f"{DATE_COLUMN_SUFFIXES}): the date rule would pass while proving nothing "
            "(verifactu#68)"
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
