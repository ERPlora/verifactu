// The Events screen shows the CATALOGUE sentence, not the engine's Spanish (verifactu#63).
//
// `event-message.test.ts` proves the composition; this proves the SCREEN is wired to it. Both are
// needed: a perfect helper nothing calls leaves the audit trail exactly as broken as before.
//
// Statically imported on purpose — see the note in `erp-verifactu-recovery.test.ts` (verifactu#31).
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-events';
import enLocale from '../../../locales/en.json';

/** The prose `records.rs` formats, verbatim. This is what must STOP reaching an English reader. */
const ENGINE_PROSE = 'Registro alta #27 de F-2026-1 creado';

const ROW = {
  id: 'e-1',
  record_id: 'r-1',
  event_type: 'record_created',
  severity: 'info',
  message: ENGINE_PROSE,
  details: JSON.stringify({
    message_key: 'verifactu.record_created',
    record_type: 'alta',
    invoice_number: 'F-2026-1',
    sequence_number: 27,
    record_hash: 'a'.repeat(64),
    is_first_record: false,
  }),
  timestamp: '2026-08-29T10:00:00+02:00',
};

let locale = 'en';

beforeEach(() => {
  document.body.replaceChildren();
  locale = 'en';
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryPage: async () => ({ rows: [ROW], total: 1 }),
    command: async () => ({}),
    on: () => () => {},
    get locale() {
      return locale;
    },
    // The real `t`, so this test exercises the catalogue the module actually ships.
    t: (catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>) => {
      const dict = (catalog[locale] ?? catalog.en ?? {}) as Record<string, unknown>;
      let cur: unknown = dict;
      for (const part of key.split('.')) {
        cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[part] : undefined;
      }
      let out = typeof cur === 'string' ? cur : key;
      for (const [k, v] of Object.entries(params ?? {})) {
        out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
      return out;
    },
  };
});

async function mount() {
  const el = document.createElement('erp-verifactu-events');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as unknown as { columns: Array<Record<string, unknown>> };
}

/** The formatter the table will call for the Message cell. */
async function messageCell(row: Record<string, unknown>): Promise<string> {
  const el = await mount();
  const column = el.columns.find((c) => c.key === 'message');
  expect(column, 'the Message column disappeared from the table').toBeDefined();
  const format = column!.format as ((r: Record<string, unknown>) => string) | undefined;
  expect(format, 'the Message column carries no formatter: the screen still prints `message` raw')
    .toBeInstanceOf(Function);
  return format!(row);
}

describe('the audit sentence is composed, not copied', () => {
  it('does not print the engine\'s Spanish to an English reader', async () => {
    expect(await messageCell(ROW)).not.toBe(ENGINE_PROSE);
  });

  it('builds the sentence out of the catalogue and the params in `details`', async () => {
    const cell = await messageCell(ROW);
    // Asserted through the catalogue entry, never against a literal sentence (ADR-0055): the
    // wording is free to change, the composition is not.
    const expected = enLocale.ui.evt.record_created
      .replace('{record_type}', enLocale.ui.recTypeAlta)
      .replace('{sequence_number}', '27')
      .replace('{invoice_number}', 'F-2026-1');
    expect(cell).toBe(expected);
    // No placeholder survived into what the user reads.
    expect(cell).not.toMatch(/\{[a-z_]+\}/);
  });

  it('follows the active language', async () => {
    locale = 'es';
    const cell = await messageCell(ROW);
    expect(cell).not.toBe(ENGINE_PROSE);
    expect(cell).not.toBe(enLocale.ui.evt.record_created);
    expect(cell).not.toMatch(/\{[a-z_]+\}/);
  });

  it('keeps the engine sentence for a key the catalogue does not know', async () => {
    const unknown = { ...ROW, details: JSON.stringify({ message_key: 'verifactu.something_new' }) };
    expect(await messageCell(unknown)).toBe(ENGINE_PROSE);
  });

  it('keeps the engine sentence for a row written before the key existed', async () => {
    expect(await messageCell({ ...ROW, details: '{}' })).toBe(ENGINE_PROSE);
  });
});
