#!/usr/bin/env python3
"""A corrective record PERSISTS the invoice it corrects (verifactu#55).

Runs against a REAL Postgres 18 in Docker, applying the module's `migrations/postgres/*.sql` the
way the runtime does (portable types shimmed to native ones, ADR-0007 §4b) and writing records
through the module's OWN private SQL (`verifactu._insert_record`), bound like the runtime binds
(`:hub_id`, `:current_user_id`, `:now` injected; a `:param` absent from the payload is NULL).

Why the test exists. A DEFERRED send — a record chained without a certificate and transmitted by
hand later — rebuilds the AEAT envelope from THE ROW (`SELECT * FROM verifactu_record`), not from
the invoice. The native engine already hands seven rectification fields to
`verifactu._insert_record` (hub#1023, merged in hub `develop` as #1142), and `verifactu_record` had
nowhere to put them: the envelope came out valid but ANONYMOUS — no `FacturasRectificadas`, so the
tax office cannot match the refund to the sale it corrects.

⚠️ The three `rectified_*` amounts are NULLABLE on purpose. In `ImporteRectificacion` the
difference between "there is no amount" and "the amount is zero" is the difference between not
declaring the block at all and telling the tax office that a base of zero euros is being corrected
(hub#324). A `DEFAULT 0` would turn every corrective invoice into a substitutive one of base zero.
The four TEXT fields go the other way — `NOT NULL DEFAULT ''`, like the `substitutes_*` of 005 —
so `_insert_record` has to COALESCE them or an ordinary sale stops chaining.

Usage: tests/rectification_block.postgres.test.py   (exit 0 = green)
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
DB = f"verifactu_rectification_block_test_{os.getpid()}"
HUB = "11111111-1111-4111-8111-111111111111"
USER = "u-cashier"
NOW = "2026-08-24T10:00:00+02:00"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

# The seven fields the native engine hands over (hub/crates/verifactu/src/lib.rs, the
# `verifactu._insert_record` intention). Four identify the corrected invoice, three carry
# `ImporteRectificacion`.
IDENTIFICATION = [
    "rectifies_number",
    "rectifies_date",
    "rectifies_nif",
    "rectification_type",
]
AMOUNTS = [
    "rectified_base_amount",
    "rectified_tax_amount",
    "rectified_surcharge_amount",
]

failures: list[str] = []


# ── Postgres plumbing ────────────────────────────────────────────────────────────────────


def psql(args: list[str], db: str | None = None, stdin: str | None = None) -> str:
    cmd = [
        "docker",
        "exec",
        "-i",
        CONTAINER,
        "psql",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
    ]
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
DDL_TYPES = {
    "INTEGER": "BIGINT",
    "REAL": "DOUBLE PRECISION",
    "BLOB": "BYTEA",
    "TEXT": "TEXT",
}
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
        lambda m: (
            m.group(0) if in_comment(m.start()) else literal(params.get(m.group(1)))
        ),
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


# ── Fixture: the intention the native engine emits ───────────────────────────────────────

SEQ = [0]

# `013_arithmetic_integrity.sql` contrasts the quota against the declared rate, so every fixture
# below carries amounts that add up. −5,00 € of base at 21 % = −1,05 € of quota.
REFUND = {
    "base_amount": -500,
    "tax_rate": 21.0,
    "tax_amount": -105,
    "total_amount": -605,
}
SALE = {"base_amount": 1000, "tax_rate": 21.0, "tax_amount": 210, "total_amount": 1210}


def seal(
    number: str, *, invoice_type: str = "F1", amounts: dict, **extra
) -> tuple[bool, str]:
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
        "invoice_date": "2026-08-24",
        "invoice_type": invoice_type,
        "description": "QA",
        "tax_breakdown": "{}",
        "previous_hash": "",
        "record_hash": f"{SEQ[0]:064d}",
        "is_first_record": 1 if SEQ[0] == 1 else 0,
        "generation_timestamp": NOW,
        "qr_url": "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR",
        "environment": "testing",
    }
    payload.update(amounts)
    payload.update(extra)
    return run_command("verifactu._insert_record", payload)


def col(number: str, column: str) -> str:
    """One column of one record, with NULL told apart from the empty string."""
    return q(
        f"SELECT COALESCE({column}::text, '<null>') FROM verifactu_record "
        f"WHERE invoice_number = {literal(number)}"
    )


def sealed(number: str) -> int:
    return qi(
        f"SELECT count(*) FROM verifactu_record WHERE invoice_number = {literal(number)}"
    )


# ── 1. A substitutive corrective keeps its whole block ───────────────────────────────────


def test_a_substitutive_corrective_persists_all_seven_fields():
    print(
        "\n== 1. an `S` corrective persists the seven fields the engine hands over =="
    )

    ok, err = seal(
        "RECT-2026-000001",
        invoice_type="R1",
        amounts=REFUND,
        rectifies_number="FACT-2026-000123",
        rectifies_date="2026-07-15",
        rectifies_nif="12345678Z",
        rectification_type="S",
        rectified_base_amount=1000,
        rectified_tax_amount=210,
        rectified_surcharge_amount=52,
    )
    check("the corrective record is chained", True, ok)
    if not ok:
        print(f"  (insert refused: {err.splitlines()[0] if err else ''})")
        return

    check(
        "...it identifies the invoice it corrects",
        "FACT-2026-000123",
        col("RECT-2026-000001", "rectifies_number"),
    )
    check(
        "...with its issue date",
        "2026-07-15",
        col("RECT-2026-000001", "rectifies_date"),
    )
    check(
        "...and the NIF of its issuer",
        "12345678Z",
        col("RECT-2026-000001", "rectifies_nif"),
    )
    check(
        "...TipoRectificativa = S", "S", col("RECT-2026-000001", "rectification_type")
    )
    check(
        "...ImporteRectificacion base",
        "1000",
        col("RECT-2026-000001", "rectified_base_amount"),
    )
    check(
        "...ImporteRectificacion quota",
        "210",
        col("RECT-2026-000001", "rectified_tax_amount"),
    )
    check(
        "...ImporteRectificacion surcharge",
        "52",
        col("RECT-2026-000001", "rectified_surcharge_amount"),
    )


# ── 2. By differences: identified, but with NO corrected amounts ─────────────────────────


def test_a_corrective_by_differences_leaves_the_amounts_null():
    print(
        "\n== 2. an `I` corrective identifies the invoice and leaves the amounts NULL =="
    )

    # The TPV path (`invoice.rectify` → `ingest_invoice`): the corrective negates the original, so
    # its own amounts ARE the delta and `ImporteRectificacion` must not be declared.
    ok, err = seal(
        "RECT-2026-000002",
        invoice_type="R4",
        amounts=REFUND,
        rectifies_number="FACT-2026-000124",
        rectifies_date="2026-07-16",
        rectifies_nif="12345678Z",
    )
    check("the corrective record is chained", True, ok)
    if not ok:
        print(f"  (insert refused: {err.splitlines()[0] if err else ''})")
        return

    check(
        "...it still identifies the corrected invoice",
        "FACT-2026-000124",
        col("RECT-2026-000002", "rectifies_number"),
    )
    # `rectification_type` empty = the XML derives it from the absence of corrected amounts
    # (`aeat::rectification_type`). Empty string, never NULL: the column is NOT NULL.
    check(
        "...TipoRectificativa is left to the XML",
        "",
        col("RECT-2026-000002", "rectification_type"),
    )
    for f in AMOUNTS:
        check(f"...{f} stays NULL, not 0", "<null>", col("RECT-2026-000002", f))


# ── 3. Zero is not absent ────────────────────────────────────────────────────────────────


def test_zero_is_not_the_same_as_absent():
    print(
        "\n== 3. a corrected base of zero euros is NOT the same as no corrected base =="
    )

    ok, _ = seal(
        "RECT-2026-000003",
        invoice_type="R1",
        amounts=REFUND,
        rectifies_number="FACT-2026-000125",
        rectifies_date="2026-07-17",
        rectifies_nif="12345678Z",
        rectification_type="S",
        rectified_base_amount=0,
        rectified_tax_amount=0,
    )
    check("a substitutive of base 0,00 € is chained", True, ok)
    check(
        "...and 0 reads back as 0",
        "0",
        col("RECT-2026-000003", "rectified_base_amount"),
    )
    check("...quota 0 too", "0", col("RECT-2026-000003", "rectified_tax_amount"))
    # Nobody wrote the surcharge: absent, and it has to stay absent next to two zeros.
    check(
        "...while the surcharge nobody wrote is NULL",
        "<null>",
        col("RECT-2026-000003", "rectified_surcharge_amount"),
    )


# ── 4. An ordinary sale is not collateral damage ─────────────────────────────────────────


def test_an_ordinary_sale_still_chains():
    print("\n== 4. an ordinary sale, which sends none of this, still chains ==")

    # The binder passes NULL for every omitted param and does NOT apply column DEFAULTs — the same
    # trap the `substitutes_*` of 005 hit. Without COALESCE this insert dies on NOT NULL.
    ok, err = seal("FACT-2026-000200", amounts=SALE)
    check("the ordinary record is chained", True, ok)
    if not ok:
        print(f"  (insert refused: {err.splitlines()[0] if err else ''})")
        return
    for f in IDENTIFICATION:
        check(f"...{f} is the empty string, not NULL", "", col("FACT-2026-000200", f))
    for f in AMOUNTS:
        check(
            f"...{f} is NULL (nothing to declare)", "<null>", col("FACT-2026-000200", f)
        )


# ── 5. The chain does not move ───────────────────────────────────────────────────────────


def test_the_fingerprint_does_not_move():
    print(
        "\n== 5. the block is snapshot, not input: the fingerprint is stored verbatim =="
    )

    # `record_hash` is computed by the native engine over a closed field list that does NOT include
    # any of the seven (hub/crates/verifactu `chain::`). The module's job is to store what it was
    # given — the same entry has to land the same hash with and without the block.
    fingerprint = f"{'a' * 64}"
    ok_plain, _ = seal("HASH-plain", amounts=SALE, record_hash=fingerprint)
    ok_block, _ = seal(
        "HASH-block",
        invoice_type="R1",
        amounts=SALE,
        record_hash=fingerprint,
        rectifies_number="FACT-2026-000126",
        rectifies_date="2026-07-18",
        rectifies_nif="12345678Z",
        rectification_type="S",
        rectified_base_amount=1000,
        rectified_tax_amount=210,
    )
    check("both records are chained", (True, True), (ok_plain, ok_block))
    check(
        "the stored fingerprint is identical with and without the block",
        (fingerprint, fingerprint),
        (col("HASH-plain", "record_hash"), col("HASH-block", "record_hash")),
    )


# ── 6. What a hub ALREADY has survives the upgrade ───────────────────────────────────────


def test_what_a_live_hub_already_has_survives():
    print("\n== 6. the sealed past survives the migration untouched ==")

    check("the migration applied over an already-chained record", True, MIGRATED[0])
    check("...and that record is still there", 1, sealed("LEGACY-1"))
    # Immutable by RD 1007/2023: not one byte of an already-sealed record may move.
    check(
        "...with its fingerprint untouched", LEGACY_HASH, col("LEGACY-1", "record_hash")
    )
    check(
        "...and its amounts untouched",
        "1000|210|1210",
        q(
            "SELECT base_amount || '|' || tax_amount || '|' || total_amount "
            "FROM verifactu_record WHERE invoice_number = 'LEGACY-1'"
        ),
    )
    # The row predates the columns: it declares nothing, and "nothing" reads the same as it would
    # for a sale chained today.
    for f in IDENTIFICATION:
        check(f"...back-filled {f} = ''", "", col("LEGACY-1", f))
    for f in AMOUNTS:
        check(f"...back-filled {f} = NULL", "<null>", col("LEGACY-1", f))


# ── 7. The migration is declared, additive, and does not reuse the gap ───────────────────


def test_the_migration_is_declared_and_additive():
    print("\n== 7. the migration is declared, append-only, and skips the 011 gap ==")

    migs = sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql"))
    owning = [m.name for m in migs if "rectifies_number" in m.read_text()]
    check("exactly one migration adds the block", 1, len(owning))
    if not owning:
        return
    name = owning[0]
    check(
        "declared in module.json",
        True,
        f"migrations/postgres/{name}" in MANIFEST["migrations"]["postgres"],
    )
    check(
        "it is a NEW file, not an edit of a published one", True, name not in PUBLISHED
    )
    # 🕳️ `011` is a permanent gap: #54 was renumbered to 013 so that every hub — new or upgrading —
    # applies the same order. Filling the hole would reintroduce exactly that divergence.
    check("it does not reuse the 011 gap", False, name.startswith("011"))
    check("it sorts after every published migration", True, name > max(PUBLISHED))

    text = (MODULE_DIR / "migrations" / "postgres" / name).read_text()
    # Comment lines are stripped BEFORE splitting, not filtered after: a `--` block sitting on top
    # of a statement travels inside that statement's chunk, and a `;` inside a comment splits the
    # SQL where nobody meant to (the trap that broke 82 published migrations).
    code = "\n".join(l for l in text.splitlines() if not l.lstrip().startswith("--"))
    check(
        "no `;` hides inside a comment",
        0,
        sum(l.count(";") for l in text.splitlines() if l.lstrip().startswith("--")),
    )
    statements = [s.strip() for s in code.split(";") if s.strip()]
    check(
        "every statement is an ADD COLUMN — nothing is dropped or rewritten",
        7,
        len(statements),
    )
    check(
        "...and they are all ADD COLUMN",
        True,
        all(
            re.search(r"^ALTER TABLE verifactu_record\s+ADD\s+COLUMN", s, re.I)
            for s in statements
        ),
    )
    # The whole point of the NULL/0 distinction: no DEFAULT and no NOT NULL on the three amounts.
    for f in AMOUNTS:
        stmt = next((s for s in statements if f in s), "")
        check(
            f"{f} is declared INTEGER",
            True,
            bool(re.search(rf"{f}\s+INTEGER\b", stmt, re.I)),
        )
        check(
            f"...{f} arrives NULLABLE, with no DEFAULT",
            True,
            bool(stmt) and not re.search(r"DEFAULT|NOT\s+NULL", stmt, re.I),
        )
    # ...and the four TEXT ones go the other way, like the `substitutes_*` of 005.
    for f in IDENTIFICATION:
        stmt = next((s for s in statements if f in s), "")
        check(
            f"{f} arrives TEXT NOT NULL DEFAULT ''",
            True,
            bool(re.search(rf"{f}\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+''", stmt, re.I)),
        )

    check(
        "all seven columns exist on verifactu_record",
        7,
        qi(
            "SELECT count(*) FROM information_schema.columns WHERE table_name = 'verifactu_record' "
            "AND column_name IN ("
            + ", ".join(literal(f) for f in IDENTIFICATION + AMOUNTS)
            + ")"
        ),
    )


# ── 8. The public door accepts what the engine reads ─────────────────────────────────────


def test_the_public_command_accepts_the_block():
    print("\n== 8. `verifactu.records.create` lets the block through ==")

    # `create_record` reads the seven fields off the payload, but the manifest schema is
    # `additionalProperties: false`: whatever it does not declare, the runtime rejects BEFORE the
    # handler sees it (crates/runtime/src/registry.rs). A substitutive `S` only ever arrives this
    # way — `ingest_invoice` always emits by differences — so a door that drops it is a dead path.
    schema = json.loads((MODULE_DIR / "schemas" / "record_create.json").read_text())
    props = schema.get("properties", {})
    for f in IDENTIFICATION:
        check(f"`{f}` is declared", True, f in props)
    for f in AMOUNTS:
        check(f"`{f}` is declared", True, f in props)
        # Nullable on the wire too: the engine passes `Json::Null` through untouched.
        types = props.get(f, {}).get("type")
        check(
            f"...`{f}` accepts null", True, isinstance(types, list) and "null" in types
        )
    check(
        "none of them became required (an ordinary sale sends none)",
        [],
        [f for f in IDENTIFICATION + AMOUNTS if f in schema.get("required", [])],
    )


# ── Runner ───────────────────────────────────────────────────────────────────────────────


MIGRATED = [False]
LEGACY_HASH = "b" * 64

# The block arrives in this migration; everything before it is the schema a live hub already has.
GUARD_MIGRATION = "014_rectification.sql"
# The migrations already published to the fleet (v1.5.16). Append-only: none of these may be edited,
# and `011` is a permanent gap — see the comment in test 7.
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
}


def apply_migration(mig: pathlib.Path) -> None:
    psql(
        [],
        db=DB,
        stdin=DDL_TOKEN.sub(lambda m: DDL_TYPES[m.group(1).upper()], mig.read_text()),
    )


def load_migrations() -> None:
    """Build the schema the way a hub upgrading TODAY sees it: the published migrations, then a
    record already chained under them, and only then the migration that adds the block."""
    migs = sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql"))
    for mig in (m for m in migs if m.name < GUARD_MIGRATION):
        apply_migration(mig)

    # An ordinary sale, sealed and chained before the block existed — the fleet is full of them.
    psql(
        [
            "-c",
            "INSERT INTO verifactu_record (id, hub_id, record_type, sequence_number, issuer_nif, "
            "issuer_name, invoice_number, invoice_date, invoice_type, base_amount, tax_rate, "
            "tax_amount, total_amount, record_hash, generation_timestamp, created_at) VALUES "
            f"('legacy', '{HUB}', 'alta', 9000, '12345678Z', 'QA SL', 'LEGACY-1', '2026-01-01', "
            f"'F1', 1000, 21, 210, 1210, '{LEGACY_HASH}', '2026-01-01T00:00:00+01:00', "
            "'2026-01-01T00:00:00+01:00')",
        ],
        db=DB,
    )

    try:
        for mig in (m for m in migs if m.name >= GUARD_MIGRATION):
            apply_migration(mig)
        MIGRATED[0] = True
    except RuntimeError as exc:
        MIGRATED[0] = False
        print(f"  (the migration did not apply: {str(exc).splitlines()[0]})")


def main() -> int:
    running = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", CONTAINER],
        capture_output=True,
        text=True,
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
        test_a_substitutive_corrective_persists_all_seven_fields()
        test_a_corrective_by_differences_leaves_the_amounts_null()
        test_zero_is_not_the_same_as_absent()
        test_an_ordinary_sale_still_chains()
        test_the_fingerprint_does_not_move()
        test_what_a_live_hub_already_has_survives()
        test_the_migration_is_declared_and_additive()
        test_the_public_command_accepts_the_block()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — a corrective record persists the invoice it corrects (verifactu#55)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
