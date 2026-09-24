#!/usr/bin/env python3
"""Every tab this module declares carries its label in every translated locale (verifactu#119).

Why this exists. The hub asks the runtime for `/api/navigation?locale=<l>` and the runtime resolves
each tab's label as `locales/<l>.json → navigation.<id>.label`, then `en`, then the manifest's
English `label`. A tab missing from `es.json` does not fail anywhere: it silently shows up in
English. That is how «Configuration» sat in the Spanish tab bar between «Recuperación» and
«Ajustes» — the `config` tab was added to `navigation[]` and nobody added its Spanish.

So the guard is structural, not a list of today's tabs: for each locale file other than the
canonical English one, every `navigation[].id` of the manifest must have a non-empty
`navigation.<id>.label`. The next tab added without its translation turns this red.

Usage: tests/navigation_tabs_are_translated.contract.test.py   (exit 0 = green; needs only Python)
"""

import json
import pathlib
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())
CANONICAL_LOCALE = "en"


def missing_tab_labels(manifest, locales):
    """Return `(locale, tab_id)` pairs whose tab has no translated label in that locale."""
    tab_ids = [item["id"] for item in manifest.get("navigation", [])]
    missing = []
    for locale, catalog in sorted(locales.items()):
        if locale == CANONICAL_LOCALE:
            continue
        navigation = catalog.get("navigation", {})
        for tab_id in tab_ids:
            label = navigation.get(tab_id, {}).get("label", "")
            if not isinstance(label, str) or not label.strip():
                missing.append((locale, tab_id))
    return missing


def load_locales():
    return {
        path.stem: json.loads(path.read_text())
        for path in sorted((MODULE_DIR / "locales").glob("*.json"))
    }


def main():
    failures = []

    # The guard must see the positive: a translated locale that lacks one tab is reported.
    probe_manifest = {"navigation": [{"id": "records"}, {"id": "config"}]}
    probe_locales = {
        "en": {"navigation": {}},
        "es": {"navigation": {"records": {"label": "Registros"}}},
    }
    if missing_tab_labels(probe_manifest, probe_locales) != [("es", "config")]:
        failures.append(
            "self_check_blind: the guard does not report a tab missing its label"
        )

    locales = load_locales()
    if not any(locale != CANONICAL_LOCALE for locale in locales):
        failures.append(
            "no_translated_locale: locales/ has no locale besides en to check"
        )
    if not MANIFEST.get("navigation"):
        failures.append("no_navigation: module.json declares no tabs to check")

    for locale, tab_id in missing_tab_labels(MANIFEST, locales):
        failures.append(
            f"tab_label_missing: locales/{locale}.json has no navigation.{tab_id}.label"
        )

    if failures:
        print("FAIL navigation_tabs_are_translated")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print("OK navigation_tabs_are_translated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
