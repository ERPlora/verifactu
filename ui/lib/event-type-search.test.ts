// The Events search finds a type by the words the screen paints for it (verifactu#140).
//
// `event_type` is stored as a code (`transmission_deferred`) and the Type cell shows its label
// («Envío aplazado» / «Submission postponed», verifactu#134). The search runs in the list engine,
// over SQL, where the locale catalogue does not exist — so `queries/events_list.sql` carries a
// `type_label` column that spells every type in BOTH languages the module ships, and the manifest
// searches it. That copy is only right while it matches `locales/*.json`: this test walks EVERY
// type the engine files and EVERY locale, so a label renamed in one place and not the other is red.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import enLocale from '../../locales/en.json';
import esLocale from '../../locales/es.json';
import { ENGINE_EVENT_TYPES } from './event-labels';

const SQL = readFileSync(join(__dirname, '../../queries/events_list.sql'), 'utf8');
const LOCALES = { es: esLocale, en: enLocale } as const;

/** The literal the `CASE event_type WHEN '<code>' THEN '<words>'` branch gives a code, or null. */
function searchWordsOf(code: string): string | null {
  const m = SQL.match(new RegExp(`WHEN\\s+'${code}'\\s+THEN\\s+'((?:[^']|'')*)'`));
  return m ? m[1].replace(/''/g, "'") : null;
}

describe('type_label in events_list.sql', () => {
  it.each([...ENGINE_EVENT_TYPES])('spells `%s` in every locale the module ships', (code) => {
    const words = searchWordsOf(code);
    expect(words, `no CASE branch for ${code}`).not.toBeNull();
    for (const [locale, catalog] of Object.entries(LOCALES)) {
      const label = (catalog.ui.evtType as Record<string, string>)[code];
      expect(label, `${locale} has no ui.evtType.${code}`).toBeTruthy();
      expect(words, `${locale} label «${label}» missing from the ${code} branch`).toContain(label);
    }
  });

  it('keeps a type the catalogue does not know searchable by its code', () => {
    expect(SQL).toMatch(/ELSE\s+event_type\s+END\s+AS\s+type_label/i);
  });

  it('does not let one type answer to another type\'s words', () => {
    for (const code of ENGINE_EVENT_TYPES) {
      const words = searchWordsOf(code) ?? '';
      for (const other of ENGINE_EVENT_TYPES) {
        if (other === code) continue;
        for (const catalog of Object.values(LOCALES)) {
          const label = (catalog.ui.evtType as Record<string, string>)[other];
          // Only a label that is not itself part of this type's own words is a false match.
          const own = Object.values(LOCALES).some(
            (c) => (c.ui.evtType as Record<string, string>)[code].includes(label),
          );
          if (!own) expect(words, `${code} branch carries «${label}» (${other})`).not.toContain(label);
        }
      }
    }
  });
});
