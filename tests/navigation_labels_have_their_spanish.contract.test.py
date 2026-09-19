#!/usr/bin/env python3
"""Every tab the manifest declares carries its Spanish (verifactu#119, ADR-0055/0199).

The tab bar is the module's front door, and its label is the one string every user reads. The
runtime translates `navigation[].label` by mirroring `navigation.<id>.label` in the module's
locale file (`hub/crates/runtime/src/manifest.rs`, `NavLocale`), falling back to the manifest's
canonical English. Half a pair fails in silence: no error, no warning — the tab just renders
«Configuration» between «Registros · Contingencia · Eventos · Recuperación · Ajustes», which is
what the Play reviewer saw on tag v1.1.26 (verifactu#119): a half-translated screen in the
middle of a Spanish app, on the very screen where the merchant configures her certificate.

Why a test and not just the missing key: the NEXT tab someone adds is born the same way — the
manifest entry in one commit, the `es` half forgotten — and no reviewer catches it, because
`en` looks complete (it is the manifest itself). This reads the manifest and both catalogues
as they are, so a new tab is covered the day it lands.

| Rule | Because |
|---|---|
| every `navigation[]` id resolves `navigation.<id>.label` in `locales/es.json` | the missing half: the tab reads English on a Spanish screen |
| the same key exists in `locales/en.json` | English is the SOURCE (ADR-0055): the pair must exist even though the manifest label already says it |
| no `navigation.*` key outlives its tab | a leftover translation hides the drift the next time a tab is added or removed |
| the `es` label is not the `en` one pasted across | the pair exists and the tab still reads English |
| the manifest declares at least one tab | a sweep that reads ZERO tabs passes by knowing nothing |

Usage: tests/navigation_labels_have_their_spanish.contract.test.py   (exit 0 = green)
  No Postgres, no hub: it reads the manifest and the catalogues.
"""

import json
import pathlib
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent

#: `en` is the source, `es` is what the merchant reads. Both are mandatory (ADR-0055/0199).
LANGS = ("en", "es")

#: Labels whose Spanish IS the English, on purpose. `id: why`. Empty today — keep it that way.
SAME_IN_BOTH: dict[str, str] = {}

#: The floor is the check on the check: if the manifest reader ever returns nothing — `navigation`
#: renamed, the manifest moved — the sweep below would find no tabs and pass by knowing nothing.
NAV_FLOOR = 1

failures: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)


def main() -> int:
    manifest = json.loads((MODULE_DIR / "module.json").read_text(encoding="utf-8"))
    nav = manifest.get("navigation") or []
    if len(nav) < NAV_FLOOR:
        print(
            f"FAIL: only {len(nav)} navigation entr(ies) read from module.json; this module ships "
            f"at least {NAV_FLOOR}. The manifest reader is broken, and a broken sweep passes."
        )
        return 1

    ids = [entry.get("id") for entry in nav]
    for entry in nav:
        if not entry.get("id"):
            fail(
                f"a navigation entry ({json.dumps(entry, ensure_ascii=False)}) has no `id`: the "
                f"shell cannot mirror what it cannot name"
            )

    catalogs = {}
    for lang in LANGS:
        path = MODULE_DIR / "locales" / f"{lang}.json"
        if not path.exists():
            print(
                f"FAIL: locales/{lang}.json is missing — the module ships half a catalogue"
            )
            return 1
        catalogs[lang] = json.loads(path.read_text(encoding="utf-8"))

    nav_blocks = {lang: (catalogs[lang].get("navigation") or {}) for lang in LANGS}

    # 1 · every tab the manifest declares is translated in BOTH catalogues.
    for entry in nav:
        eid = entry.get("id")
        if not eid:
            continue
        for lang in LANGS:
            label = (nav_blocks[lang].get(eid) or {}).get("label")
            if not isinstance(label, str) or not label.strip():
                if lang == "es":
                    why = (
                        f"the runtime falls back to the manifest's English "
                        f"(`{entry.get('label')}`) and the tab reads English on a Spanish screen"
                    )
                else:
                    why = (
                        f"English is the SOURCE (ADR-0055): the key must exist in the source "
                        f"catalogue even though the manifest label already says it in English"
                    )
                fail(
                    f"module.json navigation id `{eid}` has no `navigation.{eid}.label` in "
                    f"locales/{lang}.json: {why}"
                )

    # 2 · no `navigation.*` key outlives its tab — the pair agrees on shape.
    for lang in LANGS:
        for key in sorted(set(nav_blocks[lang]) - {i for i in ids if i}):
            fail(
                f"`navigation.{key}` exists in locales/{lang}.json but no `navigation[]` entry in "
                f"module.json declares it: a dead key hides the drift the next time a tab moves"
            )

    # 3 · the Spanish is not the English pasted across.
    for eid in ids:
        if not eid or eid in SAME_IN_BOTH:
            continue
        en = (nav_blocks["en"].get(eid) or {}).get("label")
        es = (nav_blocks["es"].get(eid) or {}).get("label")
        if en and es and en == es:
            fail(
                f"navigation.{eid}.label is the same string in both catalogues ({es!r}): it is "
                f"untranslated. If it is genuinely identical in Spanish, declare it in "
                f"SAME_IN_BOTH with the reason"
            )

    if failures:
        print(f"FAIL ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        return 1

    print(
        f"OK: all {len(nav)} navigation tabs of the manifest carry their label in both catalogues, "
        f"and no key outlives its tab"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
