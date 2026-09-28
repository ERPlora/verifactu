// The Severity and Type of an audit row read as words, not as the engine's codes (verifactu#134).
//
// `severity` and `event_type` are CODES the engine files in `verifactu_event` — they are what the
// list filters on (`op: eq`) and they never change. What changes is the CELL: `warning` and
// `transmission_deferred` in the middle of a Spanish table told the owner nothing. These tests pin
// the vocabulary; `severity-and-type-labels.test.ts` pins that the screen uses it.
import { describe, expect, it } from 'vitest';
import enLocale from '../../locales/en.json';
import esLocale from '../../locales/es.json';
import {
  ENGINE_EVENT_TYPES,
  EVENT_SEVERITIES,
  eventTypeLabel,
  severityLabel,
} from './event-labels';
import type { Translate } from './event-message';

const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

/** The real lookup shape of the shell's `t`: the key back when the catalogue lacks it. */
function translator(locale: string): Translate {
  return (catalog, key) => {
    let cur: unknown = catalog[locale] ?? catalog.en;
    for (const part of key.split('.')) {
      cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[part] : undefined;
    }
    return typeof cur === 'string' ? cur : key;
  };
}

describe('the event types the engine files', () => {
  it('are the set `hub/crates/plugins/verifactu/src` writes', () => {
    // Verified against hub origin/develop@f8f3dfdb: records.rs, transmission.rs, validation.rs,
    // recovery.rs, diagnostics.rs. A type added to the engine still renders (as its code) without
    // touching this list; the list is the surface the parity test below walks.
    expect([...ENGINE_EVENT_TYPES].sort()).toEqual([
      'aeat_queried',
      'chain_error',
      'chain_recovered',
      'chain_validated',
      'contingency_processed',
      'diagnostic',
      'invoice_type_downgraded',
      'record_created',
      'transmission_deferred',
      'transmission_failure',
      'transmission_success',
      'transmission_warning',
    ]);
  });

  for (const locale of ['en', 'es']) {
    it(`each has its own ${locale} label, never the code`, () => {
      const t = translator(locale);
      for (const code of ENGINE_EVENT_TYPES) {
        const label = eventTypeLabel(CATALOG, locale, t, code);
        expect(label, `${code} in ${locale}`).not.toBe(code);
        expect(label, `${code} in ${locale}`).not.toMatch(/^ui\./);
        expect(label.trim(), `${code} in ${locale}`).not.toBe('');
      }
      const labels = ENGINE_EVENT_TYPES.map((code) => eventTypeLabel(CATALOG, locale, t, code));
      expect(new Set(labels).size, `two types share a label in ${locale}`).toBe(labels.length);
    });
  }

  it('follows the reader: the Spanish label is not the English one', () => {
    const en = eventTypeLabel(CATALOG, 'en', translator('en'), 'transmission_deferred');
    const es = eventTypeLabel(CATALOG, 'es', translator('es'), 'transmission_deferred');
    expect(es).not.toBe(en);
  });

  it('keeps the code for a type this catalogue does not know yet', () => {
    // A hub newer than the module files a type we have never heard of: the code says more than
    // an empty cell, and the filter still matches it.
    expect(eventTypeLabel(CATALOG, 'es', translator('es'), 'certificate_warning')).toBe('certificate_warning');
  });

  it('never walks out of its namespace with a code that is not one', () => {
    const t = translator('es');
    for (const code of ['', 'Record_Created', 'evt.record_created', '__proto__', 'constructor', null, 7]) {
      expect(eventTypeLabel(CATALOG, 'es', t, code)).toBe(code === null ? '' : String(code));
    }
  });
});

describe('the severities', () => {
  for (const locale of ['en', 'es']) {
    it(`each has its own ${locale} label`, () => {
      const t = translator(locale);
      for (const code of EVENT_SEVERITIES) {
        const label = severityLabel(CATALOG, locale, t, code);
        expect(label, `${code} in ${locale}`).not.toMatch(/^ui\./);
        expect(label.trim(), `${code} in ${locale}`).not.toBe('');
      }
    });
  }

  it('reads warning and info in Spanish to a Spanish reader', () => {
    const t = translator('es');
    // Asserted against the catalogue, not a literal (ADR-0055) — and against the code it replaces.
    expect(severityLabel(CATALOG, 'es', t, 'warning')).toBe(esLocale.ui.sevWarning);
    expect(severityLabel(CATALOG, 'es', t, 'warning')).not.toBe('warning');
    expect(severityLabel(CATALOG, 'es', t, 'info')).toBe(esLocale.ui.sevInfo);
    expect(esLocale.ui.sevInfo).not.toBe(enLocale.ui.sevInfo);
    expect(esLocale.ui.sevDebug).not.toBe(enLocale.ui.sevDebug);
  });

  it('keeps the code for a severity this catalogue does not know', () => {
    expect(severityLabel(CATALOG, 'es', translator('es'), 'notice')).toBe('notice');
    expect(severityLabel(CATALOG, 'es', translator('es'), 'toString')).toBe('toString');
  });
});
