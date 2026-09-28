// The Events search finds an event by the words its MESSAGE shows on screen (verifactu#147).
//
// The Message cell is composed from `details.message_key` (and the reason codes nested in
// `details`) with the catalogue of the reader's language (`event-message.ts`), while the row stores
// the engine's own Spanish prose — «Registro alta #27 de F-1 creado» under a cell that reads
// «… sealed for invoice F-1», or «… sellado» in Spanish. The search runs in the list engine, over
// SQL, where the catalogue does not exist, so `queries/events_list.sql` carries a `message_words`
// column that spells every sentence the engine can file in BOTH languages the module ships. That
// copy is only right while it matches `locales/*.json`: this test walks EVERY message key and
// EVERY reason code, in every locale, so a sentence reworded in one place and not the other is red.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import enLocale from '../../locales/en.json';
import esLocale from '../../locales/es.json';
import {
  ENGINE_CERT_REASON_CODES,
  ENGINE_MESSAGE_KEYS,
  ENGINE_SCHEMA_REASON_CODES,
  ENGINE_WAIT_REASON_CODES,
  EVENT_MESSAGE_PREFIX,
} from './event-message';

const SQL = readFileSync(join(__dirname, '../../queries/events_list.sql'), 'utf8');
const LOCALES = { es: esLocale, en: enLocale } as const;
const REASON_CODES = [
  ...new Set([...ENGINE_CERT_REASON_CODES, ...ENGINE_WAIT_REASON_CODES, ...ENGINE_SCHEMA_REASON_CODES]),
];

/** Every `('<code>', '<words>')` row of the catalogue the query carries, unescaped. */
function catalogueRows(): Map<string, string> {
  const rows = new Map<string, string>();
  for (const m of SQL.matchAll(/\(\s*'([a-z0-9_.]+)'\s*,\s*'((?:[^']|'')*)'\s*\)/g)) {
    expect(rows.has(m[1]), `code ${m[1]} listed twice`).toBe(false);
    rows.set(m[1], m[2].replace(/''/g, "'"));
  }
  return rows;
}

/** The sentence `locales/<locale>.json` has under `ui.evt.<path>`. */
function sentence(locale: keyof typeof LOCALES, path: string): string {
  let cursor: unknown = LOCALES[locale].ui.evt;
  for (const part of path.split('.')) cursor = (cursor as Record<string, unknown>)?.[part];
  expect(typeof cursor, `${locale} has no ui.evt.${path}`).toBe('string');
  return cursor as string;
}

/** What the query has to carry for a code: the sentence in every locale, in a fixed order. */
function expectedWords(path: string): string {
  return (Object.keys(LOCALES) as (keyof typeof LOCALES)[]).map((l) => sentence(l, path)).join(' · ');
}

describe('message_words in events_list.sql', () => {
  const rows = catalogueRows();

  it('selects the column the manifest searches', () => {
    expect(SQL).toMatch(/\bAS\s+message_words\b/i);
  });

  it.each([...ENGINE_MESSAGE_KEYS])('spells the sentence of `%s` in every locale', (key) => {
    const path = key.slice(EVENT_MESSAGE_PREFIX.length);
    expect(rows.get(key), `no catalogue row for ${key}`).toBe(expectedWords(path));
  });

  it.each(REASON_CODES)('spells the reason `%s` in every locale', (code) => {
    expect(rows.get(code), `no catalogue row for reason ${code}`).toBe(expectedWords(`reason.${code}`));
  });

  it('carries no row the engine does not file', () => {
    const known = new Set<string>([...ENGINE_MESSAGE_KEYS, ...REASON_CODES]);
    expect([...rows.keys()].filter((code) => !known.has(code))).toEqual([]);
  });
});
