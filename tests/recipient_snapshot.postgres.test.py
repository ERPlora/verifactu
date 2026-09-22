#!/usr/bin/env python3
"""A sealed record KEEPS its customer, so a deferred send rebuilds the same XML (hub#1975).

Runs against a REAL Postgres 18 in Docker, applying the module's `migrations/postgres/*.sql` the
way the runtime does (portable types shimmed to native ones, ADR-0007 §4b) and executing the
module's OWN private SQL bound like the runtime binds (`:hub_id`, `:current_user_id`, `:now`
injected; a `:param` absent from the payload is NULL).

Why the test exists. A full invoice (F1, F3, R1-R4) has to carry `Destinatarios`: without it the
AEAT answers 1189, and the hub's own XSD check refuses to send it. The engine handed the customer
to the envelope built AT THE TIME OF THE SALE only; `verifactu_record` had no column for it. When
the sale could not leave on the spot — no road yet, the cell down, the certificate still missing —
the drain rebuilt the envelope from the row, found no customer, and the hub rejected its own
invoice with its chain number already spent. Same snapshot, same reason, as the `substitutes_*`
(005) and `rectifies_*` (014) blocks: what is not in the row never reaches the AEAT.

⚠️ The four columns are `NOT NULL DEFAULT ''`, so `_insert_record` has to COALESCE them: the
binder passes NULL for every omitted param and does NOT apply column DEFAULTs, so a hub whose
engine does not send them yet would fail EVERY sale on the NOT NULL. That is what test 2 holds
down — it is what lets this module be published without waiting for the hub half.

Usage: tests/recipient_snapshot.postgres.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: VERIFACTU_TEST_PG_CONTAINER,
  or ERPLORA_TEST_PG_CONTAINER — both are what `erplora test` hands over in the gate).
  Creates a scratch database and DROPS it at the end, pass or fail.
"""

import json
import os
import pathlib
import re
import subprocess
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
CONTAINER = (
    os.environ.get("VERIFACTU_TEST_PG_CONTAINER")
    or os.environ.get("ERPLORA_TEST_PG_CONTAINER")
    or "erplora-test-pg-5433"
)
DB = f"verifactu_recipient_snapshot_test_{os.getpid()}"
HUB = "11111111-1111-4111-8111-111111111111"
USER = "u-cashier"
NOW = "2026-09-03T10:00:00+02:00"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

# The four columns this issue adds: who the customer of the invoice is, as `Destinatarios`
# needs it (hub#1965/#1967), and the command that has to write them.
COLUMNS = ["recipient_nif", "recipient_name", "recipient_country", "recipient_id_type"]
INSERT = "verifactu._insert_record"

failures: list[str] = []


# ── Postgres plumbing ────────────────────────────────────────────────────────────────────


def psql(args: list[str], db: str | None = None, stdin: str | None = None) -> str:
    cmd = ["docker", "exec", "-i", CONTAINER, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres"]
    if db:
        cmd += ["-d", db]
    cmd += args
    res = subprocess.run(cmd, input=stdin, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or res.stdout.strip())
    return res.stdout


def q(sql: str) -> str:
    try:
        return psql(["-tAc", sql], db=DB).strip()
    except RuntimeError as exc:
        return f"<sql error: {str(exc).splitlines()[0]}>"


def qi(sql: str) -> int:
    raw = q(sql)
    try:
        return int(raw)
    except ValueError:
        return -1


# ── The runtime, in miniature ────────────────────────────────────────────────────────────

PARAM = re.compile(r":([a-z_][a-z0-9_]*)", re.IGNORECASE)
DDL_TYPES = {"INTEGER": "BIGINT", "REAL": "DOUBLE PRECISION", "BLOB": "BYTEA", "TEXT": "TEXT"}
DDL_TOKEN = re.compile(r"\b(INTEGER|REAL|BLOB)\b", re.IGNORECASE)


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (list, dict)):
        value = json.dumps(value, separators=(",", ":"))
    return "'" + str(value).replace("'", "''") + "'"


def bind(sql: str, params: dict) -> str:
    """Single pass over `:name` placeholders; placeholders inside comments are left alone."""

    def comment_spans(text: str) -> list[tuple[int, int]]:
        spans, i, n = [], 0, len(text)
        while i < n:
            if text.startswith("--", i):
                j = text.find("\n", i)
                j = n if j < 0 else j
                spans.append((i, j))
                i = j
            elif text.startswith("/*", i):
                j = text.find("*/", i)
                j = n if j < 0 else j + 2
                spans.append((i, j))
                i = j
            else:
                i += 1
        return spans

    comments = comment_spans(sql)

    def in_comment(pos: int) -> bool:
        return any(a <= pos < b for a, b in comments)

    return PARAM.sub(
        lambda m: (m.group(0) if in_comment(m.start()) else literal(params.get(m.group(1)))),
        sql,
    )


def run_command(name: str, payload: dict, hub: str = HUB) -> tuple[bool, str]:
    """Execute a manifest command's `sql[]` like the runtime: one transaction, system params
    injected. Returns (ok, error)."""
    cmd = MANIFEST["commands"].get(name)
    if cmd is None:
        return False, f"command `{name}` is not declared in module.json"
    files = cmd.get("sql")
    if not files:
        return False, f"command `{name}` declares no sql[]"
    params = dict(payload)
    params.setdefault("hub_id", hub)
    params.setdefault("current_user_id", USER)
    params.setdefault("now", NOW)
    script = ["BEGIN;"]
    for rel in files:
        path = MODULE_DIR / rel
        if not path.exists():
            return False, f"`{name}` declares `{rel}`, which does not exist"
        script.append(bind(path.read_text(), params))
    script.append("COMMIT;")
    try:
        psql([], db=DB, stdin="\n".join(script))
        return True, ""
    except RuntimeError as exc:
        return False, str(exc)


# ── Assertions ───────────────────────────────────────────────────────────────────────────


def check(label: str, expected, actual):
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


# ── Fixture ──────────────────────────────────────────────────────────────────────────────

SEQ = [0]


def chain(number: str, **recipient) -> tuple[bool, str]:
    """`verifactu._insert_record` — the door every writer goes through to chain a record."""
    SEQ[0] += 1
    payload = {
        "record_id": f"rec-{number}",
        "record_type": "alta",
        "sequence_number": SEQ[0],
        "invoice_id": f"inv-{number}",
        "issuer_nif": "12345678Z",
        "issuer_name": "QA SL",
        "invoice_number": number,
        "invoice_date": "2026-09-22",
        "invoice_type": "F1",
        "description": "QA",
        "tax_breakdown": "{}",
        "base_amount": 1000,
        "tax_rate": 21.0,
        "tax_amount": 210,
        "total_amount": 1210,
        "previous_hash": "",
        "record_hash": f"{SEQ[0]:064d}",
        "is_first_record": 1 if SEQ[0] == 1 else 0,
        "generation_timestamp": NOW,
        "qr_url": "https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR",
        "environment": "testing",
    }
    payload.update(recipient)
    return run_command(INSERT, payload)


def col(number: str, column: str) -> str:
    """One column of one record, with NULL told apart from the empty string."""
    return q(
        f"SELECT COALESCE({column}::text, '<null>') FROM verifactu_record "
        f"WHERE invoice_number = {literal(number)}"
    )


# ── 1. A sealed record keeps its customer ────────────────────────────────────────────────


def test_a_sealed_record_keeps_its_customer():
    print("\n== 1. `_insert_record` stores who the customer is ==")

    customer = {
        "recipient_nif": "XA1234567",
        "recipient_name": "Jane Doe",
        "recipient_country": "US",
        "recipient_id_type": "03",
    }
    ok, err = chain("FACT-2026-000001", **customer)
    check("the record is chained", True, ok)
    if not ok:
        print(f"  (insert refused: {err.splitlines()[0] if err else ''})")
        return
    for column, value in customer.items():
        check(f"...{column} is persisted", value, col("FACT-2026-000001", column))


# ── 2. A hub that does not send them yet still seals ─────────────────────────────────────


def test_a_hub_that_does_not_send_them_still_seals():
    print("\n== 2. a hub whose engine does not send them yet is not broken by the new columns ==")

    # The binder passes NULL for every omitted param and does NOT apply column DEFAULTs. Without
    # COALESCE this INSERT dies on the NOT NULL and the hub stops sealing sales ALTOGETHER.
    ok, err = chain("TICKET-2026-000002")
    check("the record is chained anyway", True, ok)
    if not ok:
        print(f"  (insert refused: {err.splitlines()[0] if err else ''})")
        return
    for column in COLUMNS:
        check(f"...{column} is empty, never NULL", "", col("TICKET-2026-000002", column))


# ── 3. The past survives the migration ───────────────────────────────────────────────────


def test_what_a_live_hub_already_has_survives():
    print("\n== 3. the sealed past survives the migration untouched ==")

    check("the migration applied over an already-chained record", True, MIGRATED[0])
    check("...the legacy record keeps its hash", LEGACY_HASH, col("LEGACY-1", "record_hash"))
    for column in COLUMNS:
        check(f"...and reads {column} as empty", "", col("LEGACY-1", column))


# ── 4. The migration is declared and additive ────────────────────────────────────────────


def test_the_migration_is_declared_and_additive():
    print("\n== 4. the migration is declared, append-only and additive ==")

    migs = sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql"))
    owning = [m.name for m in migs if "recipient_country" in m.read_text()]
    check("exactly one migration adds the customer", 1, len(owning))
    if len(owning) != 1:
        return
    name = owning[0]
    declared = [
        m if isinstance(m, str) else m.get("file") for m in MANIFEST["migrations"]["postgres"]
    ]
    check("declared in module.json", True, f"migrations/postgres/{name}" in declared)
    check("it is a NEW file, not an edit of a published one", True, name not in PUBLISHED)
    check("it sorts after every published migration", True, name > max(PUBLISHED))

    text = (MODULE_DIR / "migrations" / "postgres" / name).read_text()
    # A `;` inside a comment splits the file in two for hubs pinned to v1.1.0…v1.1.7 (the trap
    # that broke 82 published migrations).
    check(
        "no `;` hides inside a comment",
        0,
        sum(l.count(";") for l in text.splitlines() if l.lstrip().startswith("--")),
    )
    code = "\n".join(l for l in text.splitlines() if not l.lstrip().startswith("--"))
    statements = [s.strip() for s in code.split(";") if s.strip()]
    check("one ADD COLUMN per column, nothing else", len(COLUMNS), len(statements))
    for c in COLUMNS:
        stmt = next((s for s in statements if re.search(rf"\b{c}\b", s)), "")
        check(
            f"{c} arrives as ALTER TABLE verifactu_record ADD COLUMN … TEXT NOT NULL DEFAULT ''",
            True,
            bool(
                re.search(
                    rf"^ALTER TABLE verifactu_record\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+{c}"
                    rf"\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+''$",
                    stmt,
                    re.I,
                )
            ),
        )


# ── 5. The write goes through the command, COALESCEd ─────────────────────────────────────


def test_the_command_writes_them_coalesced():
    print("\n== 5. `_insert_record` binds the four, each through COALESCE(:p, '') ==")

    sql = (MODULE_DIR / "commands" / "_insert_record.sql").read_text()
    code = "\n".join(l for l in sql.splitlines() if not l.lstrip().startswith("--"))
    for c in COLUMNS:
        check(
            f"`{c}` is bound as COALESCE(:{c}, '')",
            True,
            bool(re.search(rf"COALESCE\s*\(\s*:{c}\s*,\s*''\s*\)", code, re.I)),
        )


# ── Runner ───────────────────────────────────────────────────────────────────────────────


MIGRATED = [False]
LEGACY_HASH = "b" * 64

# The customer arrives in this migration; everything before it is the schema a live hub has.
GUARD_MIGRATION = "017_recipient_snapshot.sql"
# The migrations already published to the fleet (v1.5.42). Append-only.
PUBLISHED = {
    "001_init.sql",
    "002_cert_and_recovery.sql",
    "003_obligado.sql",
    "004_tax_breakdown.sql",
    "005_substitution.sql",
    "006_drop_cert_columns.sql",
    "007_xml_storage_path.sql",
    "008_environment_chain_scope.sql",
    "009_drop_auto_transmit.sql",
    "010_contingency_cancel_gate.sql",
    "012_named_gate_constraints.sql",
    "013_arithmetic_integrity.sql",
    "014_rectification.sql",
    "015_quota_rate_check_needs_the_line_count.sql",
    "016_transmission_fingerprint.sql",
}


def apply_migration(mig: pathlib.Path) -> None:
    psql([], db=DB, stdin=DDL_TOKEN.sub(lambda m: DDL_TYPES[m.group(1).upper()], mig.read_text()))


def load_migrations() -> None:
    """Build the schema the way a hub upgrading TODAY sees it: the published migrations, then a
    record already sealed under them, and only then the migration that adds the customer."""
    migs = sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql"))
    for mig in (m for m in migs if m.name < GUARD_MIGRATION):
        apply_migration(mig)

    psql(
        [
            "-c",
            "INSERT INTO verifactu_record (id, hub_id, record_type, sequence_number, issuer_nif, "
            "issuer_name, invoice_number, invoice_date, invoice_type, base_amount, tax_rate, "
            "tax_amount, total_amount, record_hash, generation_timestamp, status, xml_content, "
            "created_at) VALUES "
            f"('legacy', '{HUB}', 'alta', 9000, '12345678Z', 'QA SL', 'LEGACY-1', '2026-01-01', "
            f"'F2', 1000, 21, 210, 1210, '{LEGACY_HASH}', '2026-01-01T00:00:00+01:00', "
            "'accepted', '<legacy/>', '2026-01-01T00:00:00+01:00')",
        ],
        db=DB,
    )

    try:
        for mig in (m for m in migs if m.name >= GUARD_MIGRATION):
            apply_migration(mig)
        MIGRATED[0] = any(m.name == GUARD_MIGRATION for m in migs)
        if not MIGRATED[0]:
            print(f"  (no {GUARD_MIGRATION} to apply)")
    except RuntimeError as exc:
        MIGRATED[0] = False
        print(f"  (the migration did not apply: {str(exc).splitlines()[0]})")


def main() -> int:
    running = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", CONTAINER], capture_output=True, text=True
    )
    if "true" not in running.stdout:
        subprocess.run(["docker", "start", CONTAINER], capture_output=True)
        running = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.Running}}", CONTAINER],
            capture_output=True,
            text=True,
        )
    if "true" not in running.stdout:
        # Same contract as the sibling batteries: no container, no verdict — say so and stand down
        # instead of reporting a green that nothing backs.
        print(f"SKIPPED: no Postgres in container {CONTAINER}")
        return 0

    psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])
    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        load_migrations()
        test_a_sealed_record_keeps_its_customer()
        test_a_hub_that_does_not_send_them_still_seals()
        test_what_a_live_hub_already_has_survives()
        test_the_migration_is_declared_and_additive()
        test_the_command_writes_them_coalesced()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — a sealed record keeps its customer for a deferred send (hub#1975)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
