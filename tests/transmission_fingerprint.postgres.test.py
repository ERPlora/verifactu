#!/usr/bin/env python3
"""A transmitted record PERSISTS its digest and the id it was delivered under (verifactu#75).

Runs against a REAL Postgres 18 in Docker, applying the module's `migrations/postgres/*.sql` the
way the runtime does (portable types shimmed to native ones, ADR-0007 §4b) and executing the
module's OWN private SQL bound like the runtime binds (`:hub_id`, `:current_user_id`, `:now`
injected; a `:param` absent from the payload is NULL).

Why the test exists. `verifactu_record` keeps the XML but nothing that pins it down:

  * `xml_sha256` — the digest of the bytes that travelled. Today it is computed on the fly over
    the outgoing envelope (`GatewayEnvelope::xml_sha256`) and thrown away. If `xml_content` or the
    archived object behind `xml_storage_path` moves afterwards, nothing notices: a retry
    recomputes the digest over whatever is there now and transmits different bytes believing they
    are the same ones. Stamped at the time of the delivery, the original stays comparable.
  * `transmission_id` — the id the delivery was presented under, which is the `Idempotency-Key`
    the fiscal cell keys on. It is NOT always `record_id`: the automatic re-anchor sends
    `{record_id}-rechain-{short(anchor)}` (hub `crates/plugins/verifactu/src/transmission.rs`).
    Without the column there is no way to cross a hub record with the cell's log line.

⚠️ Both columns are `NOT NULL DEFAULT ''`, so `_apply_transmission` has to COALESCE them: the
binder passes NULL for every omitted param and does NOT apply column DEFAULTs, so a hub whose
plugin does not send them yet would fail EVERY transmission on the NOT NULL. That is what test 3
holds down — it is what lets this module be published without waiting for the hub half.

Usage: tests/transmission_fingerprint.postgres.test.py   (exit 0 = green)
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
DB = f"verifactu_transmission_fingerprint_test_{os.getpid()}"
HUB = "11111111-1111-4111-8111-111111111111"
USER = "u-cashier"
NOW = "2026-09-03T10:00:00+02:00"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

# The two columns this issue adds, and the command that has to write them.
COLUMNS = ["xml_sha256", "transmission_id"]
APPLY = "verifactu._apply_transmission"

# A real sha256 of a real XML — the shape the hub stamps: 64 lowercase hex characters.
XML = "<sf:RegistroFactura>QA</sf:RegistroFactura>"
SHA = "6b1cbd2b5c1f6c0d3fbb0d6bb0e6c1cf1e26b0f0f0a0e5e2a1d3c4b5a6978859"
OTHER_SHA = "0f" * 32

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


def chain(number: str) -> tuple[bool, str]:
    """`verifactu._insert_record` — the door every writer goes through to chain a record."""
    SEQ[0] += 1
    return run_command(
        "verifactu._insert_record",
        {
            "record_id": f"rec-{number}",
            "record_type": "alta",
            "sequence_number": SEQ[0],
            "invoice_id": f"inv-{number}",
            "issuer_nif": "12345678Z",
            "issuer_name": "QA SL",
            "invoice_number": number,
            "invoice_date": "2026-09-03",
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
            "qr_url": "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR",
            "environment": "testing",
        },
    )


def transmit(number: str, **extra) -> tuple[bool, str]:
    """`verifactu._apply_transmission` — the intention the native engine emits after an attempt."""
    payload = {
        "record_id": f"rec-{number}",
        "status": "accepted",
        "aeat_response_code": "",
        "aeat_response_message": "",
        "aeat_csv": "CSV-1",
        "xml_content": XML,
        "xml_storage_path": f"xml/rec-{number}.xml",
        "retry_increment": 0,
    }
    payload.update(extra)
    return run_command(APPLY, payload)


def col(number: str, column: str) -> str:
    """One column of one record, with NULL told apart from the empty string."""
    return q(
        f"SELECT COALESCE({column}::text, '<null>') FROM verifactu_record "
        f"WHERE invoice_number = {literal(number)}"
    )


# ── 1. A delivery stamps both facts ──────────────────────────────────────────────────────


def test_a_transmission_stamps_the_digest_and_the_delivery_id():
    print("\n== 1. an applied transmission stamps the digest and the id it went out under ==")

    ok, err = chain("FACT-2026-000001")
    check("the record is chained", True, ok)
    if not ok:
        print(f"  (insert refused: {err.splitlines()[0] if err else ''})")
        return

    ok, err = transmit("FACT-2026-000001", xml_sha256=SHA, transmission_id="rec-FACT-2026-000001")
    check("the transmission is applied", True, ok)
    if not ok:
        print(f"  (update refused: {err.splitlines()[0] if err else ''})")
        return

    check("...the digest of the bytes that travelled is stored", SHA, col("FACT-2026-000001", "xml_sha256"))
    check(
        "...and so is the id it was delivered under",
        "rec-FACT-2026-000001",
        col("FACT-2026-000001", "transmission_id"),
    )
    # The rest of the intention still lands: the two columns are added, nothing is replaced.
    check("...the AEAT verdict still lands", "accepted", col("FACT-2026-000001", "status"))
    check("...and so does the XML", XML, col("FACT-2026-000001", "xml_content"))


# ── 2. A re-anchored retry does NOT go out under the record id ───────────────────────────


def test_a_rechained_retry_keeps_the_id_the_cell_actually_saw():
    print("\n== 2. a re-anchored retry stores the id the cell actually saw, not the record id ==")

    ok, _ = chain("FACT-2026-000002")
    check("the record is chained", True, ok)

    # The whole reason the column is not redundant with `id`: the automatic re-anchor presents the
    # SAME record under a DIFFERENT `Idempotency-Key`, and that is the key the cell's log carries.
    rechain_id = "rec-FACT-2026-000002-rechain-a1b2c3d4"
    ok, err = transmit("FACT-2026-000002", xml_sha256=OTHER_SHA, transmission_id=rechain_id)
    check("the retry is applied", True, ok)
    if not ok:
        print(f"  (update refused: {err.splitlines()[0] if err else ''})")
        return
    check("...under the re-anchored id", rechain_id, col("FACT-2026-000002", "transmission_id"))
    check("...with the digest of the RE-ANCHORED bytes", OTHER_SHA, col("FACT-2026-000002", "xml_sha256"))


# ── 3. A hub that does not send them yet still transmits ─────────────────────────────────


def test_a_hub_that_does_not_send_them_still_transmits():
    print("\n== 3. a hub whose plugin does not send them yet is not broken by the new columns ==")

    ok, _ = chain("FACT-2026-000003")
    check("the record is chained", True, ok)

    # The binder passes NULL for every omitted param and does NOT apply column DEFAULTs. Without
    # COALESCE this UPDATE dies on the NOT NULL and the hub stops filing ALTOGETHER — the module
    # would be unpublishable until the hub half shipped.
    ok, err = transmit("FACT-2026-000003")
    check("the transmission is applied anyway", True, ok)
    if not ok:
        print(f"  (update refused: {err.splitlines()[0] if err else ''})")
        return
    check("...leaving the digest empty, never NULL", "", col("FACT-2026-000003", "xml_sha256"))
    check("...and the delivery id empty, never NULL", "", col("FACT-2026-000003", "transmission_id"))
    check("...while the verdict lands as always", "accepted", col("FACT-2026-000003", "status"))


# ── 4. An omitted param does not ERASE what a previous delivery stamped ──────────────────


def test_an_omitted_param_does_not_erase_a_stamped_delivery():
    print("\n== 4. what one delivery stamped is not erased by a caller that omits it ==")

    ok, _ = chain("FACT-2026-000004")
    check("the record is chained", True, ok)
    ok, _ = transmit("FACT-2026-000004", xml_sha256=SHA, transmission_id="rec-FACT-2026-000004")
    check("a first delivery stamps both", (SHA, "rec-FACT-2026-000004"),
          (col("FACT-2026-000004", "xml_sha256"), col("FACT-2026-000004", "transmission_id")))

    # A caller that does not know about the columns must not silently wipe the forensic trail of
    # the delivery that DID happen — `COALESCE(:p, col)` keeps it, `COALESCE(:p, '')` would not.
    ok, err = transmit("FACT-2026-000004", status="error", retry_increment=1)
    check("a later caller that omits them still applies", True, ok)
    if not ok:
        print(f"  (update refused: {err.splitlines()[0] if err else ''})")
        return
    check("...the stamped digest survives", SHA, col("FACT-2026-000004", "xml_sha256"))
    check(
        "...and so does the stamped delivery id",
        "rec-FACT-2026-000004",
        col("FACT-2026-000004", "transmission_id"),
    )


# ── 5. What a live hub already has survives the upgrade ──────────────────────────────────


def test_what_a_live_hub_already_has_survives():
    print("\n== 5. the sealed past survives the migration untouched ==")

    check("the migration applied over an already-chained record", True, MIGRATED[0])
    check(
        "...and that record is still there",
        1,
        qi("SELECT count(*) FROM verifactu_record WHERE invoice_number = 'LEGACY-1'"),
    )
    # Immutable by RD 1007/2023: not one byte of an already-sealed record may move.
    check("...with its fingerprint untouched", LEGACY_HASH, col("LEGACY-1", "record_hash"))
    check("...and its XML untouched", "<legacy/>", col("LEGACY-1", "xml_content"))
    # The row predates the columns and declares nothing — the empty string, never NULL.
    for c in COLUMNS:
        check(f"...back-filled {c} = ''", "", col("LEGACY-1", c))


# ── 6. The migration is declared, additive, and does not reuse the gap ───────────────────


def test_the_migration_is_declared_and_additive():
    print("\n== 6. the migration is declared, append-only, and skips the 011 gap ==")

    migs = sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql"))
    owning = [m.name for m in migs if "xml_sha256" in m.read_text()]
    check("exactly one migration adds the pair", 1, len(owning))
    if len(owning) != 1:
        return
    name = owning[0]
    declared = [
        m if isinstance(m, str) else m.get("file") for m in MANIFEST["migrations"]["postgres"]
    ]
    check("declared in module.json", True, f"migrations/postgres/{name}" in declared)
    check("it is a NEW file, not an edit of a published one", True, name not in PUBLISHED)
    # 🕳️ `011` is a permanent gap: #54 was renumbered to 013 so that every hub — new or upgrading —
    # applies the same order. Filling the hole would reintroduce exactly that divergence.
    check("it does not reuse the 011 gap", False, name.startswith("011"))
    check("it sorts after every published migration", True, name > max(PUBLISHED))

    text = (MODULE_DIR / "migrations" / "postgres" / name).read_text()
    # A `;` inside a comment splits the file in two for hubs pinned to v1.1.0…v1.1.7, and the
    # orphan chunk reads as a statement touching a table that is not the module's — those hubs
    # REJECT the whole install (the trap that broke 82 published migrations).
    check(
        "no `;` hides inside a comment",
        0,
        sum(l.count(";") for l in text.splitlines() if l.lstrip().startswith("--")),
    )
    code = "\n".join(l for l in text.splitlines() if not l.lstrip().startswith("--"))
    statements = [s.strip() for s in code.split(";") if s.strip()]
    check("one ADD COLUMN per column, nothing else", len(COLUMNS), len(statements))
    check(
        "...and every statement is an ADD COLUMN on verifactu_record",
        True,
        bool(statements)
        and all(
            re.search(r"^ALTER TABLE verifactu_record\s+ADD\s+COLUMN", s, re.I) for s in statements
        ),
    )
    # NOT NULL DEFAULT '' both: an absent digest is "nobody stamped one", never a NULL the engine
    # would have to special-case when it rebuilds the envelope from the row.
    for c in COLUMNS:
        stmt = next((s for s in statements if c in s), "")
        check(
            f"{c} arrives TEXT NOT NULL DEFAULT ''",
            True,
            bool(re.search(rf"{c}\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+''", stmt, re.I)),
        )

    check(
        "both columns exist on verifactu_record",
        len(COLUMNS),
        qi(
            "SELECT count(*) FROM information_schema.columns WHERE table_name = 'verifactu_record' "
            "AND column_name IN (" + ", ".join(literal(c) for c in COLUMNS) + ")"
        ),
    )


# ── 7. The write goes through the command, not around it ─────────────────────────────────


def test_the_command_is_the_only_writer():
    print("\n== 7. `_apply_transmission` is where the pair is written ==")

    sql = (MODULE_DIR / "commands" / "_apply_transmission.sql").read_text()
    code = "\n".join(l for l in sql.splitlines() if not l.lstrip().startswith("--"))
    for c in COLUMNS:
        check(f"`{c}` is assigned in the command SQL", True, bool(re.search(rf"\b{c}\s*=", code)))
        # COALESCE against the COLUMN, not against a literal: see test 4.
        check(
            f"...from COALESCE(:{c}, {c})",
            True,
            bool(re.search(rf"COALESCE\s*\(\s*:{c}\s*,\s*{c}\s*\)", code, re.I)),
        )


# ── Runner ───────────────────────────────────────────────────────────────────────────────


MIGRATED = [False]
LEGACY_HASH = "b" * 64

# The pair arrives in this migration; everything before it is the schema a live hub already has.
GUARD_MIGRATION = "016_transmission_fingerprint.sql"
# The migrations already published to the fleet (v1.5.25). Append-only: none of these may be
# edited, and `011` is a permanent gap — see the comment in test 6.
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
}


def apply_migration(mig: pathlib.Path) -> None:
    psql([], db=DB, stdin=DDL_TOKEN.sub(lambda m: DDL_TYPES[m.group(1).upper()], mig.read_text()))


def load_migrations() -> None:
    """Build the schema the way a hub upgrading TODAY sees it: the published migrations, then a
    record already transmitted under them, and only then the migration that adds the pair."""
    migs = sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql"))
    for mig in (m for m in migs if m.name < GUARD_MIGRATION):
        apply_migration(mig)

    # A sale sealed, transmitted and accepted before the columns existed — the fleet is full of
    # them, and the AEAT already holds their fingerprint.
    psql(
        [
            "-c",
            "INSERT INTO verifactu_record (id, hub_id, record_type, sequence_number, issuer_nif, "
            "issuer_name, invoice_number, invoice_date, invoice_type, base_amount, tax_rate, "
            "tax_amount, total_amount, record_hash, generation_timestamp, status, xml_content, "
            "created_at) VALUES "
            f"('legacy', '{HUB}', 'alta', 9000, '12345678Z', 'QA SL', 'LEGACY-1', '2026-01-01', "
            f"'F1', 1000, 21, 210, 1210, '{LEGACY_HASH}', '2026-01-01T00:00:00+01:00', "
            "'accepted', '<legacy/>', '2026-01-01T00:00:00+01:00')",
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
        test_a_transmission_stamps_the_digest_and_the_delivery_id()
        test_a_rechained_retry_keeps_the_id_the_cell_actually_saw()
        test_a_hub_that_does_not_send_them_still_transmits()
        test_an_omitted_param_does_not_erase_a_stamped_delivery()
        test_what_a_live_hub_already_has_survives()
        test_the_migration_is_declared_and_additive()
        test_the_command_is_the_only_writer()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — a transmitted record persists its digest and its delivery id (verifactu#75)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
