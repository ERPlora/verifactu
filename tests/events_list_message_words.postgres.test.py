#!/usr/bin/env python3
"""The Events search finds an event by the words its MESSAGE shows, in either language (verifactu#147).

Runs against a REAL Postgres 18 in Docker: the module's `migrations/postgres/*.sql` applied the way
the runtime does (portable types shimmed, ADR-0007 §4b), events written through the module's own
door (`verifactu._insert_event`), and `queries/events_list.sql` searched the way the list engine
does it (`hub/crates/runtime/src/queries.rs::contains_ci`: the declared `list.search` columns OR-ed,
each lower-cased and accent-folded, «contains»).

Why the test exists. The Message cell is composed from `details.message_key` and the reason codes
nested in `details` with the catalogue of the reader's language, while the row stores the engine's
Spanish prose. So an owner reading «… sealed for invoice F-1» (en) or «… sellado» (es) typed that
word and got an empty list. `message_words` spells every sentence the row carries in both
languages; this battery pins what the live battery (`events_list.hub.test.py`) cannot seed: nested
reasons two levels deep, a `details` that is not JSON, a code the catalogue does not know, and a
second hub whose identical event must never answer.

Usage: tests/events_list_message_words.postgres.test.py   (exit 0 = green)
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
DB = f"verifactu_events_message_words_test_{os.getpid()}"
HUB_A = "11111111-1111-4111-8111-111111111111"
HUB_B = "22222222-2222-4222-8222-222222222222"
NOW = "2026-09-29T10:00:00+02:00"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())
LIST = MANIFEST["queries"]["verifactu.events.list"]
SQL = (MODULE_DIR / LIST["sql"]).read_text()
SEARCHED = LIST["list"]["search"]

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


# ── The runtime, in miniature ────────────────────────────────────────────────────────────

PARAM = re.compile(r":([a-z_][a-z0-9_]*)", re.IGNORECASE)
DDL_TYPES = {
    "INTEGER": "BIGINT",
    "REAL": "DOUBLE PRECISION",
    "BLOB": "BYTEA",
    "TEXT": "TEXT",
}
DDL_TOKEN = re.compile(r"\b(INTEGER|REAL|BLOB)\b", re.IGNORECASE)
# The fold of `contains_ci` in the list engine, letter for letter.
FOLD_FROM = "áàâäãåéèêëíìîïóòôöõúùûüñçÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇ"
FOLD_TO = "aaaaaaeeeeiiiiooooouuuuncaaaaaaeeeeiiiiooooouuuunc"


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (list, dict)):
        value = json.dumps(value, separators=(",", ":"))
    return "'" + str(value).replace("'", "''") + "'"


def bind(sql: str, params: dict) -> str:
    """`:name` → literal, leaving `--` comment lines alone (they cite `:hub_id` in prose)."""
    return "\n".join(
        line
        if line.lstrip().startswith("--")
        else PARAM.sub(lambda m: literal(params.get(m.group(1))), line)
        for line in sql.split("\n")
    )


def insert_event(
    hub: str, event_id: str, event_type: str, message: str, details
) -> None:
    """`verifactu._insert_event` — the door the engine writes every audit row through."""
    (path,) = MANIFEST["commands"]["verifactu._insert_event"]["sql"]
    params = {
        "event_id": event_id,
        "hub_id": hub,
        "record_id": None,
        "event_type": event_type,
        "severity": "info",
        "message": message,
        # `details` is TEXT: a dict is stored as the engine serialises it, a str goes in as-is.
        "details": details if isinstance(details, str) else json.dumps(details),
        "timestamp": NOW,
        "current_user_id": "u-engine",
        "now": NOW,
    }
    psql([], db=DB, stdin=bind((MODULE_DIR / path).read_text(), params))


def search(term: str, hub: str = HUB_A) -> list[str] | str:
    """The ids the list engine answers for `search=term`, or the SQL error as a string."""
    fold = lambda e: f"translate(lower({e}), '{FOLD_FROM}', '{FOLD_TO}')"  # noqa: E731
    ors = " OR ".join(
        f"{fold(f'CAST(sub.{c} AS TEXT)')} LIKE '%' || {fold(literal(term))} || '%'"
        for c in SEARCHED
    )
    body = bind(SQL, {"hub_id": hub})
    try:
        out = psql(
            ["-tA"],
            db=DB,
            stdin=f"SELECT sub.id FROM ({body}) sub WHERE {ors} ORDER BY sub.id;",
        )
    except RuntimeError as exc:
        return f"<sql error: {str(exc).splitlines()[0]}>"
    return [line for line in out.split("\n") if line]


def words_of(event_id: str, hub: str = HUB_A) -> str:
    body = bind(SQL, {"hub_id": hub})
    try:
        return psql(
            ["-tA"],
            db=DB,
            stdin=f"SELECT sub.message_words FROM ({body}) sub WHERE sub.id = {literal(event_id)};",
        ).strip()
    except RuntimeError as exc:
        return f"<sql error: {str(exc).splitlines()[0]}>"


def check(label: str, expected, actual):
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


# ── Fixture ──────────────────────────────────────────────────────────────────────────────


def seed() -> None:
    for mig in sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql")):
        psql(
            [],
            db=DB,
            stdin=DDL_TOKEN.sub(
                lambda m: DDL_TYPES[m.group(1).upper()], mig.read_text()
            ),
        )

    created = {
        "message_key": "verifactu.record_created",
        "record_type": "alta",
        "invoice_number": "F-1",
        "sequence_number": 27,
    }
    insert_event(
        HUB_A, "a-created", "record_created", "Registro alta #27 de F-1 creado", created
    )
    # The same event, word for word, in ANOTHER hub: it must never answer hub A's search.
    insert_event(
        HUB_B, "b-created", "record_created", "Registro alta #27 de F-1 creado", created
    )
    insert_event(
        HUB_A,
        "a-deferred",
        "transmission_deferred",
        "Pendiente de envío a la AEAT: hay registros anteriores pendientes",
        {
            "message_key": "verifactu.transmission_deferred",
            "why": "hay registros anteriores pendientes",
            "why_reason": {"code": "earlier_records_pending"},
        },
    )
    # A reason nested TWO levels in: the diagnostic's verdict, and the schema refusal inside it.
    insert_event(
        HUB_A,
        "a-diagnostic",
        "diagnostic",
        "Prueba VeriFactu contra pruebas: la configuración no produce un registro válido",
        {
            "message_key": "verifactu.diagnostic_sample_record_invalid",
            "environment": "testing",
            "cert_reason": {
                "code": "sample_record_schema_invalid",
                "detail_reason": {
                    "code": "schema_element_missing",
                    "element": "NombreRazon",
                },
            },
        },
    )
    # A row edited by hand: `details` is not JSON at all.
    insert_event(
        HUB_A, "a-not-json", "diagnostic", "Evento escrito a mano", "not json {"
    )
    # A code this catalogue has never heard of (an engine newer than the module).
    insert_event(
        HUB_A,
        "a-unknown",
        "diagnostic",
        "Evento de un motor nuevo",
        {"message_key": "verifactu.brand_new"},
    )


# ── Tests ────────────────────────────────────────────────────────────────────────────────


def test_the_painted_sentence_finds_the_event():
    print(
        "\n== 1. the words the screen paints for a new record find it, in both languages =="
    )
    for term in ("sealed", "SEALED", "sellado", "for invoice"):
        check(f"«{term}» finds hub A's record_created", ["a-created"], search(term))
    check(
        "the other hub's identical event answers its own hub only",
        ["b-created"],
        search("sealed", HUB_B),
    )


def test_a_nested_reason_is_searchable():
    print("\n== 2. a reason nested in `details` is searched by its own sentence ==")
    check(
        "«records reach the AEAT in order» (why_reason, en) finds the deferred event",
        ["a-deferred"],
        search("records reach the AEAT in order"),
    )
    check(
        "«a la AEAT se envian en orden» (why_reason, es, typed without the accent) finds it too",
        ["a-deferred"],
        search("a la AEAT se envian en orden"),
    )
    check(
        "«schema refused the test record» (cert_reason, en) finds the diagnostic",
        ["a-diagnostic"],
        search("schema refused the test record"),
    )
    check(
        "«is required and is not in the record» (detail_reason inside cert_reason) finds it",
        ["a-diagnostic"],
        search("is required and is not in the record"),
    )
    check(
        "the sentence of a reason the row does NOT carry does not match it",
        [],
        search("could not be reached"),
    )


def test_placeholders_are_not_words():
    print("\n== 3. the `{placeholders}` of the catalogue are not searchable words ==")
    check("«invoice_number» matches nothing", [], search("invoice_number"))
    check("«{» matches nothing", [], search("{"))


def test_rows_the_catalogue_cannot_read_stay_listed():
    print(
        "\n== 4. a row the catalogue cannot read keeps the list alive and is found by its prose =="
    )
    check(
        "a `details` that is not JSON does not break the list",
        ["a-not-json"],
        search("escrito a mano"),
    )
    check("…and carries no catalogue words", "", words_of("a-not-json"))
    check(
        "a code the catalogue does not know is still found by its prose",
        ["a-unknown"],
        search("motor nuevo"),
    )
    check("…and carries no catalogue words", "", words_of("a-unknown"))


def main() -> int:
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
        seed()
        test_the_painted_sentence_finds_the_event()
        test_a_nested_reason_is_searchable()
        test_placeholders_are_not_words()
        test_rows_the_catalogue_cannot_read_stay_listed()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"✗ events_list_message_words.postgres: {len(failures)} failure(s)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        "✓ events_list_message_words.postgres: the message is searched by the words it paints"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
