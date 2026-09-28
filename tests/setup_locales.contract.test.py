#!/usr/bin/env python3
"""The «Set up VeriFactu» item of the hub's checklist speaks the language of whoever reads it.

Regression test for ERPlora/verifactu#143 (family: ERPlora/hub#2356).

The dashboard list «Finish setting up your business» paints each app's `module.json#setup` item
through the hub's i18n contract (ADR-0055, hub#762): the manifest `title`/`description` are the
English CANONICAL text, and the translation lives in `locales/<lang>.json#setup.{title,description}`
(`registry.setup_title_localized`: `locale → en → manifest`). This module shipped the manifest in
Spanish and no `setup` block in any catalogue, so a person with the app in English read
«Configura VeriFactu» in the middle of an English list, while `invoice` — which follows the
contract — read «Your invoice numbering».

Usage: tests/setup_locales.contract.test.py   (exit 0 = green)
"""

import json
import pathlib
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())
FIELDS = ("title", "description")

failures: list[str] = []


def check(label: str, got, want) -> None:
    if got != want:
        failures.append(f"{label} — expected [{want!r}], got [{got!r}]")
        print(f"  FAIL: {label} — expected [{want!r}], got [{got!r}]")
    else:
        print(f"  ok: {label}")


def catalogue_setup(lang: str) -> dict:
    return json.loads((MODULE_DIR / "locales" / f"{lang}.json").read_text()).get("setup") or {}


def main() -> int:
    setup = MANIFEST.get("setup") or {}
    en = catalogue_setup("en")
    es = catalogue_setup("es")
    for field in FIELDS:
        manifest_text = (setup.get(field) or "").strip()
        check(f"the manifest carries a setup.{field}", bool(manifest_text), True)
        # The manifest IS the English source (ADR-0055): the `en` catalogue repeats it, so a hub
        # that falls back to the manifest and one that reads `en` paint the same sentence.
        check(f"locales/en.json#setup.{field} is the manifest's English", en.get(field), setup.get(field))
        es_text = (es.get(field) or "").strip()
        check(f"locales/es.json#setup.{field} exists", bool(es_text), True)
        # Two languages, two sentences: the same text on both sides is an untranslated copy — the
        # very bug this pins, just moved from one catalogue to the other.
        check(f"setup.{field} is really translated (es ≠ en)", es_text != (en.get(field) or "").strip(), True)
    # A Spanish reader keeps the title they already knew — and it is on the `es` side, so a fix
    # that swapped the two catalogues (Spanish source, English «translation») cannot pass.
    check("the Spanish title is the one Spanish readers already saw", es.get("title"), "Configura VeriFactu")

    print()
    if failures:
        print(f"✗ setup_locales.contract: {len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("✓ setup_locales.contract: the checklist item is English at the source and has its Spanish")
    return 0


if __name__ == "__main__":
    sys.exit(main())
