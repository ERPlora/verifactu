#!/usr/bin/env python3
"""An arithmetically impossible record cannot be SEALED (verifactu#53).

Runs against a REAL Postgres 18 in Docker, applying the module's `migrations/postgres/*.sql` the
way the runtime does (portable types shimmed to native ones, ADR-0007 §4b) and writing records
through the module's OWN private SQL (`verifactu._insert_record`), bound like the runtime binds
(`:hub_id`, `:current_user_id`, `:now` injected; a `:param` absent from the payload is NULL).

Why the test exists. `verifactu` is the LAST link: it computes the SHA-256 fingerprint, spends a
sequence number, chains and queues for the AEAT. It accepted whatever amounts it was handed. A QA
sweep sealed and chained a record declaring `rate 21.0` with `tax_amount 9999` over `base_amount
545` — 99,99 € of quota on a base of 5,45 € — and an ordinary F1 totalling −6,00 €; both travelled
verbatim into `CuotaTotal`. The upstream holes are closed (`sales#124`, `invoice#50`), but that
removes PRODUCERS of nonsense, it does not close the door: `verifactu.records.create` is a public
command and `_insert_record` inserts what it is given.

⚠️ The obvious check is NOT enough: `base + quota = total` passes for both cases
(`545 + 9999 = 10544` is internally consistent). What was missing is contrasting the quota against
the RATE the row itself declares, and against the breakdown lines when there are any.

Tolerance: ±1 cent per breakdown line, the same `invoice.audit` uses. Case A of the QA report
(`545/114`) is INSIDE it on purpose — it is a one-cent rounding disagreement, and its control is
upstream, where the gross amount is known (`quota = gross − base`). VeriFactu cannot tell it apart
from legitimate rounding.

Usage: tests/arithmetic_integrity.postgres.test.py   (exit 0 = green)
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
DB = f"verifactu_arithmetic_integrity_test_{os.getpid()}"
HUB = "11111111-1111-4111-8111-111111111111"
USER = "u-cashier"
NOW = "2026-08-23T10:00:00+02:00"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

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


# ── Fixture: one sealing attempt, exactly the intention the native engine emits ──────────

SEQ = [0]


def vat(rate: float, base: int, quota: int, **extra) -> str:
    """One breakdown line in the shape `invoice` writes it (array of objects, cents)."""
    line = {
        "tax": "vat",
        "regime": "01",
        "class": "subject",
        "rate": rate,
        "base": base,
        "quota": quota,
    }
    line.update(extra)
    return json.dumps([line], separators=(",", ":"))


def seal(
    number: str,
    *,
    invoice_type: str = "F1",
    base: int,
    rate: float,
    tax: int,
    total: int | None = None,
    breakdown: str = "{}",
    record_type: str = "alta",
) -> tuple[bool, str]:
    """`verifactu._insert_record` — the door every writer goes through to chain a record."""
    SEQ[0] += 1
    return run_command(
        "verifactu._insert_record",
        {
            "record_id": f"rec-{number}",
            "record_type": record_type,
            "sequence_number": SEQ[0],
            "invoice_id": f"inv-{number}",
            "issuer_nif": "12345678Z",
            "issuer_name": "QA SL",
            "invoice_number": number,
            "invoice_date": "2026-08-23",
            "invoice_type": invoice_type,
            "description": "QA",
            "base_amount": base,
            "tax_rate": rate,
            "tax_breakdown": breakdown,
            "tax_amount": tax,
            "total_amount": base + tax if total is None else total,
            "previous_hash": "",
            "record_hash": f"{SEQ[0]:064d}",
            "is_first_record": 1 if SEQ[0] == 1 else 0,
            "generation_timestamp": NOW,
            "qr_url": "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR",
            "environment": "testing",
        },
    )


def sealed(number: str) -> int:
    return qi(
        f"SELECT count(*) FROM verifactu_record WHERE invoice_number = {literal(number)}"
    )


def refused_by(err: str) -> str:
    """The constraint name is the domain error code: pull it out of the Postgres error."""
    m = re.search(r'"(ck_verifactu_record_[a-z_]+)"', err)
    return m.group(1) if m else err.splitlines()[0] if err else "<accepted>"


# ── 1. The QA cases: what must NOT be sealable ───────────────────────────────────────────


def test_an_impossible_quota_is_never_sealed():
    print("\n== 1. a quota the declared rate cannot justify never reaches the chain ==")

    # Case C of the QA report, arriving with a breakdown — the `ingest_invoice` door. The line
    # declares 21 % over a base of 5,45 € and a quota of 99,99 €.
    ok, err = seal(
        "FACT-2026-000011",
        base=545,
        rate=21.0,
        tax=9999,
        total=10544,
        breakdown=vat(21.0, 545, 9999),
    )
    check("C (with breakdown) is REFUSED", False, ok)
    check(
        "...by the breakdown rule",
        "ck_verifactu_record_quota_matches_declared_rate",
        refused_by(err),
    )
    check("...and nothing was chained", 0, sealed("FACT-2026-000011"))

    # The same nonsense arriving WITHOUT a breakdown — the `records.create` door, where the only
    # thing left to contrast against is the rate the row itself declares.
    ok, err = seal("FACT-2026-000011-B", base=545, rate=21.0, tax=9999, total=10544)
    check("C (no breakdown) is REFUSED", False, ok)
    check(
        "...by the row rule",
        "ck_verifactu_record_quota_matches_row_rate",
        refused_by(err),
    )
    check("...and nothing was chained", 0, sealed("FACT-2026-000011-B"))


def test_an_ordinary_invoice_cannot_total_negative():
    print("\n== 2. a negative total is a corrective invoice, not an ordinary one ==")

    ok, err = seal(
        "FACT-2026-000012",
        invoice_type="F1",
        base=-500,
        rate=21.0,
        tax=-105,
        breakdown=vat(21.0, -500, -105),
    )
    check("D (ordinary F1 of −6,05 €) is REFUSED", False, ok)
    check(
        "...by the sign rule",
        "ck_verifactu_record_ordinary_total_not_negative",
        refused_by(err),
    )
    check("...and nothing was chained", 0, sealed("FACT-2026-000012"))

    for t in ("F2", "F3"):
        ok, _ = seal(
            f"NEG-{t}",
            invoice_type=t,
            base=-500,
            rate=21.0,
            tax=-105,
            breakdown=vat(21.0, -500, -105),
        )
        check(f"a {t} cannot total negative either", False, ok)

    # A corrective invoice IS allowed to be negative — that is the legal path for a refund.
    for t in ("R1", "R2", "R3", "R4", "R5"):
        ok, err = seal(
            f"RECT-{t}",
            invoice_type=t,
            base=-500,
            rate=21.0,
            tax=-105,
            breakdown=vat(21.0, -500, -105),
        )
        check(f"a {t} corrective invoice of −6,05 € IS sealed", True, ok)


# ── 3. What the rules must NOT block ─────────────────────────────────────────────────────


def test_legitimate_records_still_seal():
    print("\n== 3. every legitimate shape still goes through ==")

    ok, err = seal(
        "OK-simple", base=1000, rate=21.0, tax=210, breakdown=vat(21.0, 1000, 210)
    )
    check("E — 21 % of 10,00 € = 2,10 €", True, ok)

    # Case A of the QA report: 545 at 21 % is 114,45 → the producer that knows the gross says 115,
    # the one that recomputes says 114. One cent apart, indistinguishable from rounding HERE.
    ok, err = seal(
        "OK-rounding",
        base=545,
        rate=21.0,
        tax=114,
        total=659,
        breakdown=vat(21.0, 545, 114),
    )
    check("A — the one-cent rounding disagreement is INSIDE tolerance", True, ok)

    # 🔴 verifactu#60 — THE ticket the 1,5-cent tolerance was killing. `invoice` rounds the quota
    # PER LINE and sums, so four lines of 0,50 € at 21 % (`round_half_up(10,5) = 11` each) declare
    # `200 / 44` while 21 % of 200 is 42. `invoice.audit` emits it (tolerance 4). This is a real
    # ticket, and it must reach the chain.
    ok, err = seal(
        "OK-4lines",
        base=200,
        rate=21.0,
        tax=44,
        breakdown=vat(21.0, 200, 44),
    )
    check("4 lines of 0,50 € at 21 % (200 / 44, per-line rounding)", True, ok)

    # The table of twelve: 12 lines of 0,55 € at 10 % → `round_half_up(5,5) = 6` each → `660 / 72`
    # where the rate justifies 66. With 1,5 cents this shape failed ~1 time in 3.
    ok, err = seal(
        "OK-12lines",
        base=660,
        rate=10.0,
        tax=72,
        breakdown=vat(10.0, 660, 72),
    )
    check("a 12-line table at 10 % (660 / 72, per-line rounding)", True, ok)

    # A bar ticket: a beer at 21 % and a tapa at 10 %. `tax_rate` carries the EFFECTIVE rate
    # (`derive_tax_rate`), and the breakdown carries the two real ones.
    mixed = json.dumps(
        [
            {
                "tax": "vat",
                "regime": "01",
                "class": "subject",
                "rate": 21.0,
                "base": 1000,
                "quota": 210,
            },
            {
                "tax": "vat",
                "regime": "01",
                "class": "subject",
                "rate": 10.0,
                "base": 500,
                "quota": 50,
            },
        ],
        separators=(",", ":"),
    )
    ok, err = seal("OK-mixed", base=1500, rate=17.33, tax=260, breakdown=mixed)
    check("a mixed 21 % + 10 % ticket", True, ok)

    # Exempt / not subject: rate 0, quota 0.
    exempt = json.dumps(
        [
            {
                "tax": "vat",
                "regime": "01",
                "class": "exempt",
                "exempt_reason": "E1",
                "rate": 0.0,
                "base": 5000,
                "quota": 0,
            }
        ],
        separators=(",", ":"),
    )
    ok, err = seal("OK-exempt", base=5000, rate=0.0, tax=0, breakdown=exempt)
    check("an exempt invoice (rate 0, quota 0)", True, ok)

    # Equivalence surcharge: `tax_amount` is quota + surcharge, so it can NEVER equal
    # base × main rate. The row rule must stand aside and let the breakdown rule judge.
    ok, err = seal(
        "OK-surcharge",
        base=1000,
        rate=26.2,
        tax=262,
        breakdown=vat(21.0, 1000, 210, surcharge_rate=5.2, surcharge_quota=52),
    )
    check("an equivalence-surcharge invoice (21 % + 5,2 %)", True, ok)

    # ...but a surcharge that its own rate cannot justify is still refused.
    ok, err = seal(
        "BAD-surcharge",
        base=1000,
        rate=120.0,
        tax=1200,
        breakdown=vat(21.0, 1000, 210, surcharge_rate=5.2, surcharge_quota=990),
    )
    check("a surcharge of 9,90 € at 5,2 % over 10,00 € is REFUSED", False, ok)
    check(
        "...by the breakdown rule",
        "ck_verifactu_record_quota_matches_declared_rate",
        refused_by(err),
    )

    # ...and the replacement rule is not a blank cheque: a quota that DOUBLES what its rate
    # justifies is not rounding, however many lines the invoice claims. 20 lines of 1 cent at 21 %
    # round to a quota of ZERO, never to 10.
    ok, err = seal(
        "BAD-doubled",
        base=20,
        rate=21.0,
        tax=10,
        breakdown=vat(21.0, 20, 10),
    )
    check("a quota that doubles its own rate is REFUSED", False, ok)
    check(
        "...by the breakdown rule",
        "ck_verifactu_record_quota_matches_declared_rate",
        refused_by(err),
    )

    # Legacy rows: `004_tax_breakdown.sql` left `'{}'` behind, and rectified invoices still write
    # it (`invoice/commands/rectify_insert.sql`). Nothing declared = nothing to contrast.
    ok, err = seal("OK-legacy", base=1000, rate=21.0, tax=210, breakdown="{}")
    check("a legacy row with breakdown '{}'", True, ok)

    # A big base: `tax_rate` is stored rounded to two decimals, so `base × rate` drifts by more
    # than a cent on its own. The row rule's tolerance has to absorb that and nothing more.
    ok, err = seal("OK-bigbase", base=200000, rate=17.34, tax=34670)
    check("a big base whose effective rate rounds to 2 decimals (34670 vs 34680)", True, ok)

    # ...and the margin that buys is bounded: it does not swallow a real mismatch on the same base.
    ok, err = seal("BAD-bigbase", base=200000, rate=17.34, tax=39000)
    check("...but a real mismatch on the same base is still REFUSED", False, ok)
    check("...by the row rule", "ck_verifactu_record_quota_matches_row_rate", refused_by(err))

    # An annulment record carries the invoice amounts but is not an `alta`; recovery anchors carry
    # zeros. Neither is judged.
    ok, err = seal(
        "OK-anulacion", record_type="anulacion", base=-500, rate=21.0, tax=-999
    )
    check("an `anulacion` record is out of scope", True, ok)


# ── 4. The migration is declared and does not touch what is already chained ─────────────


def test_the_migration_is_declared_and_additive():
    print("\n== 4. the migration is declared, and the sealed past survives it ==")

    migs = sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql"))
    owning = [
        m.name
        for m in migs
        if "ck_verifactu_record_quota_matches_declared_rate" in m.read_text()
    ]
    # TWO: `013` created the three rules, `015` (verifactu#60) replaced the breakdown one — a
    # published migration is never edited, it is superseded by its own file.
    check("013 adds the rules and 015 replaces one of them", 2, len(owning))
    # The manifest accepts BOTH forms (hub `MigrationEntry`): a bare path string — read as
    # `expand` — or `{"file": ..., "kind": ..., "since": ...}`. Matching with `in` over the raw
    # list only ever sees the first, so a migration declared as a `contract` (`012`, and now `015`)
    # read as «not declared» even though it was right there.
    declared = {
        entry if isinstance(entry, str) else entry["file"]
        for entry in MANIFEST["migrations"]["postgres"]
    }
    for name in owning:
        check(
            f"{name} declared in module.json",
            True,
            f"migrations/postgres/{name}" in declared,
        )
    # `015` DROPs the constraint `013` created, and a `DROP` is only allowed in a migration that
    # declares itself `contract` — a bare string means `expand`, and the hub REFUSES to install it
    # (`migration_guard::kind_matches`). This is the regression guard for verifactu#61: the module
    # validated fine as a file and still could not be installed, and only CI said so.
    entry_015 = next(
        (
            e
            for e in MANIFEST["migrations"]["postgres"]
            if isinstance(e, dict)
            and e["file"] == "migrations/postgres/015_quota_rate_check_needs_the_line_count.sql"
        ),
        None,
    )
    check("015 declares itself `contract`, because it DROPs", "contract", (entry_015 or {}).get("kind"))
    # Every constraint arrives `NOT VALID`: the records already chained are immutable by
    # RD 1007/2023 and cannot be corrected after the fact — validating against them would abort
    # the hub boot.
    added = sum(
        len(
            re.findall(
                r"NOT\s+VALID\s*;",
                (MODULE_DIR / "migrations" / "postgres" / name).read_text(),
                re.I,
            )
        )
        for name in owning
    )
    check("every constraint arrives NOT VALID (3 in 013 + 1 in 015)", 4, added)
    # And the replacement drops before it adds, or the second ALTER fails on a name already taken.
    replacement = (MODULE_DIR / "migrations" / "postgres" / owning[-1]).read_text()
    check(
        "the replacement DROPs the old constraint first",
        True,
        "DROP CONSTRAINT IF EXISTS ck_verifactu_record_quota_matches_declared_rate"
        in replacement,
    )

    check(
        "all three rules are constraints of verifactu_record",
        3,
        qi(
            "SELECT count(*) FROM pg_constraint WHERE conname LIKE 'ck_verifactu_record_%'"
        ),
    )

    # `NOT VALID` in the field: this database was seeded (before 013 ran) with exactly the record
    # the QA sweep chained — 99,99 € of quota on a base of 5,45 €. The migration had to apply over
    # it without aborting, and the row had to stay: it is immutable by RD 1007/2023, and a hub whose
    # boot dies on its own fiscal history is worse than the bug.
    check("the migration applied over an already-chained impossible record", True, MIGRATED[0])
    check("...and that record is still there, untouched", 1, sealed("LEGACY-1"))
    check(
        "...still declaring what it declared",
        "545|9999",
        q(
            "SELECT base_amount || '|' || tax_amount FROM verifactu_record "
            "WHERE invoice_number = 'LEGACY-1'"
        ),
    )


# ── Runner ───────────────────────────────────────────────────────────────────────────────


MIGRATED = [False]

# The rules arrive in this migration; everything before it is the schema a live hub already has.
GUARD_MIGRATION = "013_arithmetic_integrity.sql"


def apply_migration(mig: pathlib.Path) -> None:
    psql(
        [],
        db=DB,
        stdin=DDL_TOKEN.sub(lambda m: DDL_TYPES[m.group(1).upper()], mig.read_text()),
    )


def load_migrations() -> None:
    """Build the schema the way a hub upgrading TODAY sees it: the old migrations, then a record
    already chained that the new rules would reject, and only then the migration that adds them."""
    migs = sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql"))
    for mig in (m for m in migs if m.name < GUARD_MIGRATION):
        apply_migration(mig)

    # Case C of the QA sweep, already sealed and chained — the fleet has rows like this one.
    psql(
        [
            "-c",
            "INSERT INTO verifactu_record (id, hub_id, record_type, sequence_number, issuer_nif, "
            "issuer_name, invoice_number, invoice_date, invoice_type, base_amount, tax_rate, "
            "tax_amount, total_amount, generation_timestamp, created_at) VALUES "
            f"('legacy', '{HUB}', 'alta', 9000, '12345678Z', 'QA SL', 'LEGACY-1', '2026-01-01', "
            "'F1', 545, 21, 9999, 10544, '2026-01-01T00:00:00+01:00', '2026-01-01T00:00:00+01:00')",
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
        test_an_impossible_quota_is_never_sealed()
        test_an_ordinary_invoice_cannot_total_negative()
        test_legitimate_records_still_seal()
        test_the_migration_is_declared_and_additive()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — an arithmetically impossible record cannot be sealed (verifactu#53)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
