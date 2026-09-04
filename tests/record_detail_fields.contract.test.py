#!/usr/bin/env python3
"""Every field the Records DETAIL reads off the row is a column `record_get.sql` selects (verifactu#86).

Regression guard for ERPlora/verifactu#86 (`origin: verifactu#75`).

#75 stamped `xml_sha256` and `transmission_id` on `verifactu_record` and stopped there: the query
that feeds the detail did not select them and no screen read them, so the two numbers a support
call needs — the `Idempotency-Key` the fiscal cell indexes by, and the digest of the bytes that
actually travelled — were only visible by opening the database.

THE CLASS OF FAILURE, not just those two. A module screen reads its row through a declarative
query, and the runtime returns exactly the columns the SQL names. Ask the row for a column the
SELECT does not carry and nothing raises: the value is `undefined`, Lit renders the empty string,
and the field shows up BLANK — a screen that looks complete and is lying. TypeScript does not catch
it either, because the interface is written by hand next to the code that reads it: declare
`xml_sha256` there and the compiler is satisfied whether or not the SQL ever produced it.

So the contract pinned here is the JOIN between the two files:

    every field of the detail's row interface  ⊆  the SELECT list of queries/record_get.sql

which covers the field number 27 that somebody adds next year, not only today's two.

Usage: tests/record_detail_fields.contract.test.py   (exit 0 = green)
"""

import pathlib
import re
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
SQL = (MODULE_DIR / "queries" / "record_get.sql").read_text()
COMPONENT = (
    MODULE_DIR / "ui" / "components" / "erp-verifactu-records" / "erp-verifactu-records.ts"
).read_text()

# The row interface the detail view is typed against. Named apart from the LIST's interface on
# purpose: the list gets the columns `records_list` returns, the detail the ones `record_get` does,
# and conflating them is exactly how a field ends up blank on one screen and fine on the other.
DETAIL_INTERFACE = "VerifactuRecordDetail"

# The two fingerprints this issue exists for. Pinned BY NAME on top of the subset rule above,
# because the subset rule alone stays green if the detail simply stops reading them.
FINGERPRINTS = ("xml_sha256", "transmission_id")

failures = []


def selected_columns(sql):
    """The column names `record_get.sql` actually SELECTs.

    Deliberately strict: this query is a flat `SELECT <cols> FROM verifactu_record`, with no
    expressions and no aliases. If it ever grows one, this parser must be taught about it rather
    than silently reporting a column the runtime does not return under that name.
    """
    body = re.search(r"\bSELECT\b(.*?)\bFROM\b", sql, re.S | re.I)
    if not body:
        return None
    cols = []
    for raw in body.group(1).split(","):
        col = re.sub(r"--.*", "", raw).strip()
        if not col:
            continue
        if not re.fullmatch(r"[a-z_][a-z0-9_]*", col):
            failures.append(
                "record_get.sql selects `%s`, which is not a bare column name. This test reads "
                "the SELECT list as the contract of the row; teach it about expressions/aliases "
                "before shipping one." % col
            )
            continue
        cols.append(col)
    return cols


def interface_fields(source, name):
    """The field names of a TypeScript `interface <name> { ... }` block."""
    block = re.search(r"\binterface\s+%s\s*\{(.*?)\n\}" % re.escape(name), source, re.S)
    if not block:
        return None
    return re.findall(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\??\s*:", block.group(1), re.M)


columns = selected_columns(SQL)
if columns is None:
    failures.append("queries/record_get.sql has no SELECT ... FROM to read.")
    columns = []

fields = interface_fields(COMPONENT, DETAIL_INTERFACE)
if fields is None:
    failures.append(
        "erp-verifactu-records.ts declares no `interface %s`. The detail's row type is the thing "
        "this test compares against the SQL; without it there is nothing to check and a green "
        "result would mean nothing." % DETAIL_INTERFACE
    )
    fields = []
elif not fields:
    failures.append("`interface %s` is empty — nothing to compare, so nothing is guarded." % DETAIL_INTERFACE)

# 1 · The subset rule: no field may be read that the SELECT does not produce.
for field in fields:
    if field not in columns:
        failures.append(
            "the detail reads `%s`, which queries/record_get.sql does NOT select: it will render "
            "blank in every hub. Add the column to the SELECT, or stop reading it." % field
        )

# 2 · The two fingerprints, by name — in the SQL...
for col in FINGERPRINTS:
    if col not in columns:
        failures.append(
            "queries/record_get.sql does not select `%s`, so the detail cannot show it "
            "(verifactu#86)." % col
        )
    # ...and actually READ by the screen, not merely declared.
    if col not in fields:
        failures.append(
            "the detail's row interface does not carry `%s`: the column travels and no screen "
            "shows it, which is the state verifactu#86 exists to end." % col
        )
    if not re.search(r"\.%s\b" % re.escape(col), COMPONENT):
        failures.append(
            "`%s` is never read in erp-verifactu-records.ts: declaring it in the interface is not "
            "showing it." % col
        )

# 3 · The check must be able to fail. A parser that silently returns nothing turns this whole file
#     into a green light that proves nothing — the failure mode that costs the most here.
if columns and "xml_storage_path" not in columns:
    failures.append(
        "the SELECT parser did not find `xml_storage_path`, a column that has been in this query "
        "since before this test existed. The parser is broken, not the query."
    )

if failures:
    print("FAILED — %d problem(s):" % len(failures))
    for f in failures:
        print("  · %s" % f)
    sys.exit(1)

print(
    "OK — the %d fields of %s are all selected by record_get.sql, fingerprints included."
    % (len(fields), DETAIL_INTERFACE)
)
