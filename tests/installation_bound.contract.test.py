#!/usr/bin/env python3
"""The fiscal chain is bound to the installation that produced it — and the MANIFEST says so.

Regression test for ERPlora/hub#1264 (contract «El Hub se CIERRA como KERNEL» §5), pinning
ADR-0202 §4.2 / hub#312 / hub#380 from the side that owns the fact.

`NumeroInstalacion` = `hub_id`, so `verifactu_record` (plus the contingency queue, the events and
the AEAT log) is the fiscal history of ONE installation. Restored under ANOTHER hub, its next
record would chain on a `RegistroAnterior` the AEAT never received for that installation, and a
pending queue would be transmitted under the wrong `NumeroInstalacion`. The same hub restoring its
own backup resumes its own chain (AEAT developer FAQ §4) — this is PORTABILITY, not secrecy: the
rows still export, they simply do not land elsewhere.

**Why this test is in the module and not in the hub.** The kernel used to ask whether the section
was the literal `modules/verifactu`, which put one country's regime inside a generic engine.
hub#380 replaced it with the manifest flag `installation_bound_data` — the module declares its own
nature — and left `INSTALLATION_BOUND_BY_LEGACY_NAME` in `crates/runtime/src/import.rs` as a
BRIDGE, because the published `verifactu` predated the flag and answering «portable» would have
let another installation's chain land in this hub. That constant's own doc names its exit
condition: «until the module is republished declaring `installation_bound_data: true`». Declaring
it is what this module owes the kernel; the bridge stays until every deployed hub carries a
manifest that says it, which is not this repo's call to make.

The hub's `verifactu_chain_import_e2e.rs` proved the same fact by installing five published
modules into a runtime to export and re-import them. The end-to-end behaviour is the KERNEL's
(`export_hub`/`import_sections`) and stays there, proven against its own fixture; what belongs
here is the declaration the kernel reads.

Usage: tests/installation_bound.contract.test.py   (exit 0 = green)
"""

import json
import pathlib
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

failures: list[str] = []


def check(label: str, got, want) -> None:
    if got != want:
        failures.append(f"{label} — expected [{want!r}], got [{got!r}]")
        print(f"  FAIL: {label} — expected [{want!r}], got [{got!r}]")
    else:
        print(f"  ok: {label} = {got!r}")


def main() -> int:
    check(
        "the manifest declares its data bound to the installation that produced it",
        MANIFEST.get("installation_bound_data"),
        True,
    )
    # It is a boolean, not a truthy string: `Manifest::installation_bound_data` is a `bool` and
    # serde would refuse the module outright on anything else (`ManifestUnknownField` is the
    # kernel's way of never dropping a declaration in silence).
    check(
        "…as a JSON boolean",
        type(MANIFEST.get("installation_bound_data")).__name__,
        "bool",
    )
    # The fact this flag protects is the chain, and the chain is scoped by the fiscal regime this
    # module implements. If the regime declaration ever went away, the flag would be guarding
    # nothing recognisable.
    regime = MANIFEST.get("fiscal_regime") or {}
    check("the module still declares its fiscal regime", regime.get("regime"), "verifactu")
    check("…for Spain", regime.get("country"), "ES")

    print()
    if failures:
        print(f"✗ installation_bound.contract: {len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        "✓ installation_bound.contract: the manifest declares the fiscal chain non-portable, so "
        "the kernel no longer needs this module's NAME to know it"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
