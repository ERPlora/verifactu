#!/usr/bin/env python3
"""This module declares the OLDEST core it can run on, and the number is the one it earned
(verifactu#91).

Why this exists. `compatibility.min_erplora_version` (hub#521) is the only way a module tells the
hub «this terminal is too old for me». Without it the hub installs the module anyway and the
owner meets the missing pieces one screen at a time: verifactu#91 opens on the «Probar» button,
which an old engine answers by looking at a certificate the delegated road never has, so the
business is told to fix something it does not own and cannot get. With the floor declared, the
hub refuses the install with an actionable message instead.

Why the number was not writable until now. The floor has to name a core that EXISTS: a floor
above every published tag refuses the module on the whole fleet. When verifactu#91 was filed the
engine lived only in the hub's `develop`, so the issue shipped as two steps — first the tag, then
this declaration. The tag landed; this is step two.

**How the floor is derived, and the trap in the obvious method.** The issue's acceptance criterion
said «the first tag that contains `b620990c`, verified with `git tag --contains`». That command is
not sound in the hub repo: `main` is an ORPHAN branch — releases are promoted onto it with
`commit-tree`, which `crates/runtime/src/core_version.rs` documents as the reason `git describe`
answers eight releases stale there — so a `develop` sha is simply not an ancestor of most release
tags and `--contains` under-reports. Read by CONTENT instead (`git show <tag>:<file>`), the engine
of hub#1528 has shipped since `v1.1.14`, not `v1.1.24`.

So the floor is not one commit: it is the NEWEST tag among everything this module asks the core
for today, and that is what the table below records — each requirement with the first tag that
shipped it, measured by content. The test re-derives the floor from the requirements it can still
SEE in `ui/`, so the table cannot quietly rot: drop a dependency and the expected floor drops with
it; add one whose tag is newer and the test goes red until the floor is raised.

Usage: tests/core_floor_is_declared.contract.test.py   (exit 0 = green; needs nothing but Python)
"""

import json
import pathlib
import re
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

# What this module needs from the core, and the FIRST release tag that shipped it — every tag
# below was read by content out of the hub repo (`git show <tag>:<path>`), never with
# `git tag --contains`. `marker` is what proves the module still asks for it: a string this repo
# would have to delete to stop needing that core.
CORE_REQUIREMENTS = (
    (
        "hub#1943 — a record sold without a road leaves on its own, in chain order and declared "
        "late; the records screen promises exactly that («you do not have to do anything») and "
        "reads the reason the engine files (verifactu#111)",
        (1, 1, 29),
        "transmission_deferred",
        "crates/plugins/verifactu/src/records.rs: `transmission_deferred` absent in v1.1.28, "
        "present in v1.1.29 — below it the drain never picks up a record that was never queued",
    ),
    (
        "hub#1871 — the road switch is decided by the core (`PATCH /api/business/certificate`)",
        (1, 1, 24),
        "use_for_transmission",
        "crates/server/src/settings.rs: absent in v1.1.23, present in v1.1.24",
    ),
    (
        "hub#1847 — the grant reads the business address out of the core's settings",
        (1, 1, 23),
        r"business_(street|postal_code|city)",
        "crates/runtime/src/settings.rs: absent in v1.1.22, present in v1.1.23",
    ),
    (
        "hub#1528 — the fiscal diagnosis answers by ROAD, so «Probar» can run on the cell",
        (1, 1, 14),
        "canRunLiveTest",
        "crates/plugins/verifactu/src/diagnostics.rs: `sample_envelope` absent in v1.1.13, "
        "present in v1.1.14",
    ),
)

failures: list[str] = []


def check(label: str, got, want) -> None:
    if got != want:
        failures.append(f"{label} — expected [{want!r}], got [{got!r}]")
        print(f"  FAIL: {label} — expected [{want!r}], got [{got!r}]")
    else:
        print(f"  ok: {label} = {got!r}")


def version_triple(value):
    """The core's own reader, ported (`crates/runtime/src/manifest.rs` → `version_triple`).

    A floor this function cannot read is NOT treated as «any version works»: the hub raises
    `ManifestCoreFloorUnreadable` and refuses the module everywhere. That is why a leading `v` —
    the shape every git tag carries and the one a human copies by reflex — has to be caught here
    and not in production.
    """
    if not isinstance(value, str):
        return None
    core = re.split(r"[-+]", value.strip())[0]
    parts = core.split(".")
    if len(parts) > 3 or not all(p.isdigit() for p in parts if p != ""):
        return None
    try:
        nums = [int(p) for p in parts]
    except ValueError:
        return None
    while len(nums) < 3:
        nums.append(0)
    return tuple(nums)


def module_sources() -> str:
    """Every line of module UI source, minus its tests — a marker that survives only in a test
    would say this module still needs a core it no longer calls."""
    files = [
        path
        for path in (MODULE_DIR / "ui").rglob("*.ts")
        if not path.name.endswith(".test.ts")
    ]
    return "\n".join(path.read_text() for path in files)


def main() -> int:
    sources = module_sources()
    print(f"  ({len(sources.splitlines())} lines of ui/ source scanned)")

    required = []
    for label, tag, marker, evidence in CORE_REQUIREMENTS:
        if re.search(marker, sources):
            required.append((label, tag, evidence))
            print(f"  needs {'.'.join(map(str, tag))}: {label}")
        else:
            print(f"  no longer asks for it (`{marker}` is gone): {label}")

    compatibility = MANIFEST.get("compatibility")
    check(
        "the manifest carries a `compatibility` block",
        isinstance(compatibility, dict),
        True,
    )
    if not isinstance(compatibility, dict):
        # Nothing below can be read, and saying so once beats three cascading failures.
        print(
            "\nFAILED: the manifest declares no core floor, so every hub installs this module —"
        )
        print(
            "        including the ones whose engine cannot run its screens (verifactu#91)."
        )
        return 1

    declared = compatibility.get("min_erplora_version")
    check("…declaring a core floor", isinstance(declared, str) and declared != "", True)

    floor = version_triple(declared)
    check(
        f"…that the core can read (`version_triple({declared!r})`, no leading `v`)",
        floor is not None,
        True,
    )

    if required and floor is not None:
        want = max(tag for _, tag, _ in required)
        check(
            "…equal to the newest core this module still asks for",
            floor,
            want,
        )
        for label, tag, evidence in required:
            if floor < tag:
                failures.append(
                    f"floor {declared} is below {'.'.join(map(str, tag))} — {label}"
                )
                print(f"  FAIL: below {'.'.join(map(str, tag))} — {label} ({evidence})")

    if failures:
        print(f"\nFAILED ({len(failures)}):")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("\nPASSED: the declared core floor is exactly the one this module earned.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
