#!/usr/bin/env python3
"""Turning VeriFactu ON persists on a DEMO hub, and a refusal always NAMES itself (verifactu#40).

Runs against a REAL Postgres 18 in Docker, applying the module's `migrations/postgres/*.sql` the
way the runtime does (portable types shimmed to native ones, ADR-0007 §4b) and running
`verifactu.config.save` through its OWN declared `sql[]` chain, bound like the runtime binds
(`:hub_id`, `:current_user_id`, `:now` and the BUSINESS IDENTITY injected as system params; a
`:param` absent from the payload is NULL).

Why the test exists. The demo report (#40, 2026-08-10) said the switch came back OFF after
navigating away, and the re-triage concluded a demo could never persist it because "the fiscal
identity of a demo is nobody's". That premise is stale: since hub#684 the core SEEDS the demo's
identity at boot (`settings::ensure_demo_fiscal_identity` -> `business_tax_id = B00000000`,
`business_legal_name = ERPlora Demo SL`), so the taxpayer gate of verifactu#49 has what it asks
for. A demo is a hub with a fiscal identity it may not CHANGE - not a hub without one.

So the contract this battery pins is the one the demo actually needs:

  1. demo-shaped params (identity injected, `issuer_nif` NOT in the payload, environment
     `testing`) -> `config.save` applies and `config.get` answers `enabled = 1` with the hub's
     tax id as the effective issuer.
  2. no fiscal identity at all -> refused, and the refusal NAMES `config_save_requires_issuer`.
     The screen keys off that string to say WHAT is missing; without the name in the text it
     falls through to the go-live message and tells the operator the wrong thing.

Usage: tests/demo_activation.postgres.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: VERIFACTU_TEST_PG_CONTAINER,
  or ERPLORA_TEST_PG_CONTAINER - both are what `erplora test` hands over in the gate).
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
DB = f"verifactu_demo_activation_test_{os.getpid()}"
HUB = "22222222-2222-4222-8222-222222222222"
USER = "hub_user:demo-visitor"
NOW = "2026-08-24T10:00:00+02:00"

# What `settings::ensure_demo_fiscal_identity` (hub#684) writes into `hub_settings` at boot, and
# therefore what the dispatcher injects as `:business_tax_id` / `:business_legal_name` on a demo.
DEMO_TAX_ID = "B00000000"
DEMO_LEGAL_NAME = "ERPlora Demo SL"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

failures: list[str] = []


# -- Postgres plumbing ---------------------------------------------------------------------


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


# -- The runtime, in miniature -------------------------------------------------------------

PARAM = re.compile(r":([a-z_][a-z0-9_]*)", re.IGNORECASE)
DDL_TOKEN = re.compile(r"\b(INTEGER|REAL|BLOB)\b", re.IGNORECASE)
DDL_TYPES = {"INTEGER": "BIGINT", "REAL": "DOUBLE PRECISION", "BLOB": "BYTEA"}


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


def system_params(payload: dict, *, tax_id: str, legal_name: str, has_certificate: int) -> dict:
    """`crate::system_params`: what the dispatcher injects on TOP of the caller's payload. The
    caller cannot forge these - which is exactly why the module can trust `:business_tax_id`."""
    params = dict(payload)
    params["hub_id"] = HUB
    params["current_user_id"] = USER
    params["now"] = NOW
    params["new_id"] = "cfg-" + HUB[:8]
    params["business_tax_id"] = tax_id
    params["business_legal_name"] = legal_name
    params["business_address"] = "Calle Demo 1, Vigo"
    params["has_certificate"] = has_certificate
    return params


def as_the_caller_sees_it(pg_stderr: str) -> str:
    """What the RUNTIME hands the browser, which is much less than psql prints.

    A refusal travels `sqlx::Error::Database` -> `PgDatabaseError`, and that type's `Display`
    writes the PRIMARY message and nothing else (sqlx-postgres `src/error.rs`: `f.write_str(
    self.message())` plus an optional line number). Postgres puts the failing ROW - and therefore
    the `gate` value - in the separate `DETAIL` field (`D`), which `message()` never includes.

    So a battery that greps psql's whole stderr proves nothing about the screen: it would find a
    gate name the UI can never receive. Keep only the `ERROR:` line, which is exactly the string
    the component's `catch` gets."""
    for line in pg_stderr.splitlines():
        line = line.strip()
        if line.startswith("ERROR:"):
            return line[len("ERROR:") :].strip()
    return " ".join(pg_stderr.split())


def run_command(name: str, payload: dict, **ctx) -> tuple[bool, str]:
    """Execute a manifest command's `sql[]` like the runtime: ONE transaction, system params
    injected. Returns (ok, error-text-as-the-caller-would-see-it)."""
    cmd = MANIFEST["commands"].get(name)
    if cmd is None:
        return False, f"command `{name}` is not declared in module.json"
    files = cmd.get("sql")
    if not files:
        return False, f"command `{name}` declares no sql[]"
    params = system_params(payload, **ctx)
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
        return False, as_the_caller_sees_it(str(exc))


def config_get(*, tax_id: str, legal_name: str, has_certificate: int) -> dict:
    """`verifactu.config.get`, bound the way `queries::execute` binds it."""
    sql = (MODULE_DIR / "queries" / "config_get.sql").read_text()
    params = system_params({}, tax_id=tax_id, legal_name=legal_name, has_certificate=has_certificate)
    inner = bind(sql, params).strip().rstrip(";")
    raw = q("SELECT row_to_json(r) FROM (" + inner + ") r")
    if not raw or raw.startswith("<sql error"):
        return {"__error__": raw}
    return json.loads(raw)


# -- Assertions ----------------------------------------------------------------------------


def check(label: str, expected, actual):
    if expected != actual:
        failures.append(f"{label} - expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} - expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


def check_contains(label: str, needle: str, haystack: str):
    if needle in haystack:
        print(f"  ok: {label} names `{needle}`")
    else:
        one_line = " ".join(haystack.split())[:220]
        failures.append(f"{label} - `{needle}` is not in the refusal text: {one_line}")
        print(f"  FAIL: {label} - `{needle}` is not in the refusal text: {one_line}")


# -- Migrations ----------------------------------------------------------------------------


def load_migrations() -> None:
    for mig in sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql")):
        sql = DDL_TOKEN.sub(lambda m: DDL_TYPES[m.group(1).upper()], mig.read_text())
        psql([], db=DB, stdin=sql)


# -- The tests -----------------------------------------------------------------------------

# What the settings screen actually posts (`erp-verifactu-settings.ts` -> `save()`): no
# `issuer_nif`, no `issuer_name` - the issuer is the hub's and `config_save.sql` resolves it.
SCREEN_PAYLOAD = {
    "enabled": True,
    "mode": "verifactu",
    "environment": "testing",
    "software_name": "ERPLORA CLOUD SL",
    "software_version": "1.0.0",
    "software_id": "EC",
    "software_nif": "B27593136",
    "retry_interval_minutes": 5,
    "max_retries": 10,
}


def test_a_demo_hub_can_turn_verifactu_on_and_it_stays_on() -> None:
    """#40, the half the demo lives or dies by.

    A demo hub is NOT a hub without a taxpayer: hub#684 seeds one at boot precisely so the fiscal
    gate has what it asks for. Enabling therefore has to APPLY and SURVIVE a reload - the switch
    coming back OFF is the reported symptom, and a silent revert is the worst possible shape for
    it because nothing on screen ever said no."""
    print("\ndemo hub: activation applies and survives the reload")
    ok, err = run_command(
        "verifactu.config.save",
        SCREEN_PAYLOAD,
        tax_id=DEMO_TAX_ID,
        legal_name=DEMO_LEGAL_NAME,
        has_certificate=1,
    )
    check("the save is accepted", True, ok)
    if not ok:
        print(f"    refusal: {' '.join(err.split())[:220]}")
        return
    row = config_get(tax_id=DEMO_TAX_ID, legal_name=DEMO_LEGAL_NAME, has_certificate=1)
    check("config.get answers enabled", 1, row.get("enabled"))
    check("the effective issuer is the hub's", DEMO_TAX_ID, row.get("issuer_nif"))
    check("the effective issuer name is the hub's", DEMO_LEGAL_NAME, row.get("issuer_name"))
    check("the environment stayed in the sandbox", "testing", row.get("environment"))
    # The demo carries NO certificate: the delegated slot was retired (hub#1435) and an OWN one
    # is refused (`demo_business_certificate_locked`). `has_certificate` answers «can this hub
    # transmit» (hub#1489), and on the delegated road that is 1 — ERPlora's fiscal cell files for
    # it. So the screen must still be able to see a road.
    check("the road the runtime probed is reported", 1, row.get("has_certificate"))


def test_a_hub_with_no_taxpayer_is_refused_and_the_refusal_names_itself() -> None:
    """#40 residue 2: a save that reverts has to SAY SO, and say WHICH gate.

    `verifactu__gate` now hosts two gates. The screen maps the refusal by looking for
    `config_save_requires_issuer` in the error text and falls back to the GO-LIVE message
    otherwise - so if the gate name never reaches the caller, a hub with no tax id is told that
    "going live is one way", which is not its problem and names nothing it can fix."""
    print("\nno fiscal identity: refused, and the refusal names the gate")
    psql(["-c", f"DELETE FROM verifactu_config WHERE hub_id = '{HUB}'"], db=DB)
    ok, err = run_command(
        "verifactu.config.save",
        SCREEN_PAYLOAD,
        tax_id="",
        legal_name="",
        has_certificate=0,
    )
    check("the save is refused", False, ok)
    check_contains("the refusal", "config_save_requires_issuer", err)
    check(
        "nothing was left enabled",
        "0",
        q(f"SELECT COALESCE((SELECT enabled FROM verifactu_config WHERE hub_id = '{HUB}'), 0)"),
    )


def test_every_gate_names_itself_and_an_undeclared_one_fails_closed() -> None:
    """The migration's whole contract, at the table where it lives.

    Three gates share `verifactu__gate`, and until now all three refused with the same
    auto-named constraint - so every screen that wanted to explain a rollback had to guess.
    Each one now carries its own name into the PRIMARY message, which is the only part that
    survives the trip to the browser.

    The last case is the one that keeps this from being a downgrade: the anonymous
    `CHECK (ok = 1)` was the catch-all, and dropping it without a replacement would let a gate
    nobody declared insert `ok = 0` and pass. `verifactu__gate_is_declared` refuses it instead,
    so forgetting to register a new gate fails CLOSED and says so."""
    print("\ngate table: every gate refuses under its own name")
    for gate in (
        "config_save_requires_issuer",
        "config_save_go_live_is_one_way",
        "contingency_cancel_requires_accepted_record",
    ):
        try:
            psql([], db=DB, stdin=f"INSERT INTO verifactu__gate (gate, ok) VALUES ('{gate}', 0);")
            failures.append(f"gate `{gate}` accepted ok = 0")
            print(f"  FAIL: gate `{gate}` accepted ok = 0")
        except RuntimeError as exc:
            seen = as_the_caller_sees_it(str(exc))
            check_contains(f"the `{gate}` refusal", gate, seen)
            # The relation name has to stay in the text too: it is what the screens that have not
            # been taught the specific gate yet still key on, so this migration must not silently
            # break their mapping.
            check_contains(f"the `{gate}` refusal", "verifactu__gate", seen)

    print("\ngate table: a gate nobody declared fails CLOSED")
    try:
        psql([], db=DB, stdin="INSERT INTO verifactu__gate (gate, ok) VALUES ('a_gate_nobody_declared', 0);")
        failures.append("an undeclared gate was accepted - the table fails OPEN")
        print("  FAIL: an undeclared gate was accepted - the table fails OPEN")
    except RuntimeError as exc:
        check_contains("the undeclared gate", "verifactu__gate_is_declared", as_the_caller_sees_it(str(exc)))

    # And a gate that PASSES still writes its row, so `_gate_clear.sql` has something to drain
    # and the happy path is untouched.
    psql([], db=DB, stdin="INSERT INTO verifactu__gate (gate, ok) VALUES ('config_save_requires_issuer', 1);")
    check("a passing gate still inserts", "1", q("SELECT count(*) FROM verifactu__gate"))
    psql([], db=DB, stdin="DELETE FROM verifactu__gate;")


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
        # Same contract as the sibling batteries: no container, no verdict - say so and stand down
        # instead of reporting a green that nothing backs.
        print(f"SKIPPED: no Postgres in container {CONTAINER}")
        return 0

    psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])
    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        load_migrations()
        test_a_demo_hub_can_turn_verifactu_on_and_it_stays_on()
        test_a_hub_with_no_taxpayer_is_refused_and_the_refusal_names_itself()
        test_every_gate_names_itself_and_an_undeclared_one_fails_closed()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED - {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS - a demo hub can turn VeriFactu on, and a refusal names itself (verifactu#40)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
