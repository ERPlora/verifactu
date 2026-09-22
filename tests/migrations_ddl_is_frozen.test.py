#!/usr/bin/env python3
"""An ALREADY PUBLISHED migration never changes what it EXECUTES (verifactu#65).

Why this exists. `_hub_migrations` (the runtime's ledger) keys on `module_id + filename` and
stores **no checksum**, and neither `erplora validate` nor the module gate hashes a migration
file. So editing a migration that the fleet already applied is *silent*: the hub will never
re-run it, every hub installed before the edit keeps the old schema, every hub installed after
gets the new one, and nothing anywhere says the two disagree. Migrations are append-only for
exactly that reason — a constraint is replaced by its OWN migration (that is what `015` did to
rule 1 of `013`), never by editing the one that already ran.

What is frozen, and what is not. Only the **executable** SQL: comments are stripped and
whitespace collapsed before hashing. Correcting a comment that has gone stale — which is what
verifactu#65 is, and the reason this guard was written next to it — stays free, and this test is
the proof that such a correction did not move a single byte of DDL.

Adding a migration is normal and expected: register its fingerprint below in the same commit.
The test says the exact line to paste.

Usage: tests/migrations_ddl_is_frozen.test.py   (exit 0 = green; needs nothing but Python)
"""

import hashlib
import re
import sys
from pathlib import Path

MIGRATIONS = Path(__file__).resolve().parent.parent / "migrations" / "postgres"

# sha256 of the comment-stripped, whitespace-collapsed SQL of every PUBLISHED migration.
# Append a line when you add a migration; NEVER edit a line to make a red test pass — a changed
# fingerprint means the DDL moved, and that is the bug this guard exists to catch.
FROZEN = {
    "001_init.sql": "24ea400916603766d2d73129a51a3abcbf84b77990c7b508a10c694efbf2d901",
    "002_cert_and_recovery.sql": "478223429efcb7174661bc4a8d40e8941089afed39e0ad4d9a082496b2c1f180",
    "003_obligado.sql": "e478b66a3d1881fd08f6b52a2b4a3fac38a82bb9ad2ea1022b28f4d5511afc0a",
    "004_tax_breakdown.sql": "f0cadb9a9acd9ac05c66ada2d21c724215f253a86453ca9cba4092aefa526a42",
    "005_substitution.sql": "976c9f8d8471ddbe2dff08e28a45ef4656d4deaea5bbdac897fbf87203bc5111",
    "006_drop_cert_columns.sql": "f3b721eb89696f9af4947a398ab9b9f5bd5d65edf6afefb8926fd8eec339e48c",
    "007_xml_storage_path.sql": "038588ca9cc1c3fa9d3e354715a7fb83887da3745fe915e5afdd3578cc56b0db",
    "008_environment_chain_scope.sql": "52601ba9c3fab9790bb17cacba58ddcef6be87b13da7dd4c52dc78f2ab0c24b6",
    "009_drop_auto_transmit.sql": "6074aa7739912b97a2e5a3a060eb10243ded1e06042e3ee6836e49cd3b66bf27",
    "010_contingency_cancel_gate.sql": "8b1c6e1464d37e82ec1ea646af516f3ad1ab47670ac979389f5e969997cbbae7",
    # There is no `011`: it only ever existed on the branch that became `013` (the reason
    # verifactu#65 opens by naming the wrong file). The gap is history, not a missing file.
    "012_named_gate_constraints.sql": "2f958886dd9ef6366fad7004f8d4bc65850442790c90e0d298a6efe70c02d380",
    "013_arithmetic_integrity.sql": "64425cdb28ff143b59d03727d70d04adac4520f70123f9933665f5a094c776e1",
    "014_rectification.sql": "2336f5bb686935bde7cfb4b032b180252b64fc877a0d6024300a74fbfdd24233",
    "015_quota_rate_check_needs_the_line_count.sql": "329d0a494bfa197de866a60d39c3313ef56bd4af69b87dd5cf2611ce1a9216dc",
    "016_transmission_fingerprint.sql": "4426a4da2385bf5d826c2a332352629ce83c7d846f047aa5540195dee3689a2a",
    "017_recipient_snapshot.sql": "4621fbe4b58cfa40c56fab9574bbb3ed808945501a8b3e90cdb3371a6d6ae2ab",
}


def strip_sql_comments(sql: str) -> str:
    """Remove `--` line comments that are NOT inside a single-quoted string literal.

    Naive stripping would cut a legitimate `--` living inside a JSON path literal, so the scan
    tracks quoting. `''` is the SQL escape for a quote inside a literal and falls out of the
    toggle for free: two consecutive toggles leave the state unchanged.
    """
    out = []
    in_string = False
    i = 0
    while i < len(sql):
        ch = sql[i]
        if ch == "'":
            in_string = not in_string
            out.append(ch)
            i += 1
            continue
        if not in_string and sql.startswith("--", i):
            nl = sql.find("\n", i)
            if nl == -1:
                break
            i = nl  # keep the newline: it still separates two statements
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def fingerprint(path: Path) -> str:
    executable = re.sub(
        r"\s+", " ", strip_sql_comments(path.read_text(encoding="utf-8"))
    ).strip()
    return hashlib.sha256(executable.encode("utf-8")).hexdigest()


def main() -> int:
    if not MIGRATIONS.is_dir():
        print(f"FAIL: no migrations directory at {MIGRATIONS}")
        return 1

    files = sorted(p.name for p in MIGRATIONS.glob("*.sql"))
    if not files:
        print(
            f"FAIL: {MIGRATIONS} has no .sql — the guard would pass by finding nothing"
        )
        return 1

    failures = []
    for name in files:
        actual = fingerprint(MIGRATIONS / name)
        expected = FROZEN.get(name)
        if expected is None:
            failures.append(
                f"{name}: migration not registered. Add this line to FROZEN in {Path(__file__).name}:\n"
                f'        "{name}": "{actual}",'
            )
        elif actual != expected:
            failures.append(
                f"{name}: the EXECUTABLE SQL changed (comments and whitespace are ignored).\n"
                f"        frozen: {expected}\n"
                f"        now:    {actual}\n"
                "        A migration the fleet already applied is never edited: the hub does not\n"
                "        re-run it, so hubs installed before and after the edit end up with\n"
                "        DIFFERENT schemas. Replace the constraint with a NEW migration instead."
            )

    for gone in sorted(set(FROZEN) - set(files)):
        failures.append(
            f"{gone}: registered as published but no longer on disk. Deleting a migration leaves\n"
            "        every hub that applied it with a schema nothing describes any more."
        )

    if failures:
        print("FAIL — migrations are append-only (verifactu#65):")
        for f in failures:
            print(f"  - {f}")
        return 1

    print(f"OK — {len(files)} migrations, executable SQL unchanged")
    return 0


if __name__ == "__main__":
    sys.exit(main())
