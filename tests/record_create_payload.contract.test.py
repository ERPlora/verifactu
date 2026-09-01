#!/usr/bin/env python3
"""The public door declares every field the engine reads, and none it computes (verifactu#58).

`verifactu.records.create` is the MANUAL door: numbering recovery, the alta a listener never
caught, any integration — and the assistant, which has the command declared with its `ai` block.
Its payload is validated against `schemas/record_create.json` BEFORE the native handler ever sees
it (`hub/crates/runtime/src/registry.rs`, `Validator::validate`), and the schema says
`additionalProperties: false`. So a field the schema does not declare is not "empty": the whole
call is REJECTED.

Six fields the engine reads were missing — `tax_breakdown`, the three `substitutes_*` and the two
`recipient_*` — while the automatic path (`invoice.created` -> `records.ingest_invoice`) filled all
of them, because that path does not go through this schema. The same operation came out whole
through one door and mutilated through the other: a bar ticket declared by hand lost its two VAT
rates, an F3 lost `FacturasSustituidas` (ADR-0140), and an F1 lost `Destinatarios` — which the AEAT
rejects with 1189, with the chain number already spent. Same hole #55 closed for the rectification
block, in fields that had been in the table since `005`.

**The control is the LIST, not six assertions.** The source of truth that lives in THIS repo is
`commands/_insert_record.sql`: every value that reaches the row passes through one of its
`:param`s. Split them in three and the rule writes itself —

  * the runtime injects `:hub_id`, `:current_user_id`, `:now`;
  * the engine COMPUTES the chain (`record_id`, `sequence_number`, `previous_hash`, `record_hash`,
    `is_first_record`, `generation_timestamp`, `qr_url`) and resolves `environment` from the hub's
    live config (guard R4, ADR-0202 §3, hub#313);
  * everything else comes from the caller's payload, so the schema has to declare it.

That makes the check hold for the NEXT field too: the engine cannot persist one without adding its
`:param` here, and the day it does, this test goes red until the schema declares it.

It runs in the other direction as well, and that half is not decoration: a field the engine
COMPUTES must NOT be declared. Declaring `environment` would look like letting the caller pick the
chain, and the engine would overwrite it in silence — a knob that lies is worse than no knob. (The
original body of #58 asked for exactly that; hub#313 had already landed.)

Two fields never reach a column: `recipient_nif` / `recipient_name` feed the `Destinatarios` block
of the SOAP envelope in the inline transmission (`hub/crates/verifactu/src/lib.rs:1586`), and
`verifactu_record` has no column for them. They are pinned by name, with this comment as the reason.

Pure contract test — no hub, no Postgres.

Usage: tests/record_create_payload.contract.test.py   (exit 0 = green)
"""

import json
import pathlib
import re
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
INSERT_SQL = MODULE_DIR / "commands" / "_insert_record.sql"
SCHEMA = MODULE_DIR / "schemas" / "record_create.json"

# Injected by the runtime on every command, never by the caller.
RUNTIME_INJECTED = {"hub_id", "current_user_id", "now"}

# Computed by the native engine (`build_record_output`), never taken from the payload. Declaring
# any of these in the public schema would advertise a knob the engine overwrites without a word.
ENGINE_COMPUTED = {
    "record_id",
    "sequence_number",
    "previous_hash",
    "record_hash",
    "is_first_record",
    "generation_timestamp",
    "qr_url",
    # Guard R4 (ADR-0202 §3, hub#313): the record joins the chain of the hub's CURRENT config
    # environment, read in `build_record_output`. The caller does not get to choose it.
    "environment",
}

# Read from the payload but never persisted: they build `Destinatarios` in the inline SOAP.
NON_PERSISTED_PAYLOAD_FIELDS = {"recipient_nif", "recipient_name"}

failures: list[str] = []


def check(label: str, expected, actual) -> None:
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


PARAM = re.compile(r":([a-z_][a-z0-9_]*)", re.IGNORECASE)
LINE_COMMENT = re.compile(r"--[^\n]*")


def sql_params(path: pathlib.Path) -> set[str]:
    """Every `:param` the statement binds. Comments are stripped first: the file explains its own
    guardrails by naming `:hub_id` and friends in prose, and prose is not a binding."""
    body = LINE_COMMENT.sub("", path.read_text())
    return set(PARAM.findall(body))


def test_every_caller_supplied_field_is_declared():
    schema = json.loads(SCHEMA.read_text())
    declared = set(schema.get("properties", {}))

    check(
        "the schema still refuses what it does not declare",
        False,
        schema.get("additionalProperties"),
    )

    params = sql_params(INSERT_SQL)
    check("`_insert_record` binds the columns it is expected to", True, len(params) > 20)

    caller_supplied = params - RUNTIME_INJECTED - ENGINE_COMPUTED
    missing = sorted(caller_supplied - declared)
    check("every persisted field the caller supplies is declared", [], missing)

    dead_knobs = sorted(ENGINE_COMPUTED & declared)
    check("...and no field the ENGINE computes is offered to the caller", [], dead_knobs)

    check(
        "the two fields that feed `Destinatarios` are declared too",
        [],
        sorted(NON_PERSISTED_PAYLOAD_FIELDS - declared),
    )

    # Nothing else: a property that is neither a bound param nor one of the two SOAP-only fields
    # is a field nobody reads, and the caller cannot tell that from one that works.
    orphans = sorted(declared - params - NON_PERSISTED_PAYLOAD_FIELDS)
    check("no declared field goes nowhere", [], orphans)


def test_the_new_fields_cannot_change_an_existing_call():
    """Every string field the engine reads with `str_field` defaults to `""`, which is exactly what
    `str_field` already answers for an absent key. Declaring them is a door that opens, never a
    behaviour that shifts under a caller who omits them."""
    schema = json.loads(SCHEMA.read_text())
    props = schema.get("properties", {})
    required = set(schema.get("required", []))

    for field in sorted(
        {
            "tax_breakdown",
            "substitutes_number",
            "substitutes_date",
            "substitutes_nif",
        }
        | NON_PERSISTED_PAYLOAD_FIELDS
    ):
        spec = props.get(field)
        if spec is None:
            check(f"`{field}` is declared", True, False)
            continue
        check(f"`{field}` is a string", "string", spec.get("type"))
        check(f"`{field}` defaults to the empty string", "", spec.get("default"))
        check(f"`{field}` is not suddenly required", False, field in required)


def main() -> int:
    print("== the public payload contract of `verifactu.records.create` ==")
    test_every_caller_supplied_field_is_declared()
    print()
    print("== declaring a field cannot move an existing caller ==")
    test_the_new_fields_cannot_change_an_existing_call()

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — the public door declares what the engine reads (verifactu#58)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
