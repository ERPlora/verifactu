// The Events screen shows the CATALOGUE sentence, not the engine's Spanish (verifactu#63).
//
// `event-message.test.ts` proves the composition; this proves the SCREEN is wired to it. Both are
// needed: a perfect helper nothing calls leaves the audit trail exactly as broken as before.
//
// Statically imported on purpose — see the note in `erp-verifactu-recovery.test.ts` (verifactu#31).
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-events';
import enLocale from '../../../locales/en.json';
import esLocale from '../../../locales/es.json';

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
    timezone: 'Europe/Madrid',
    // hub#2269: names the minor units it was handed, so a test can say WHICH amount reached it.
    formatMoney: (minor: number) => `MONEY(${minor})`,
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

/** The engine's `cert_message` on the missing-NIF verdict: Spanish prose, constant for this key. */
const ENGINE_CERT_MESSAGE = 'Configura el NIF del obligado tributario (emisor) antes de probar la conexión.';

/** What `run_diagnostics` files when the cell road stops on the business's own NIF (hub#1531). */
const NIF_MISSING_ROW = {
  ...ROW,
  id: 'e-2',
  record_id: null,
  event_type: 'diagnostic',
  severity: 'warning',
  message: 'Prueba VeriFactu: falta el NIF del obligado tributario',
  details: JSON.stringify({
    message_key: 'verifactu.diagnostic_issuer_nif_missing',
    cert_ok: false,
    cert_message: ENGINE_CERT_MESSAGE,
    route: 'delegated',
    issuer_nif: '',
    environment: 'testing',
    gateway: { ok: true, status: 'ready', reason: '', transmission_enabled: true, holder_nif: 'B00000000' },
  }),
};

describe('the missing-NIF verdict of the cell road stands on its own (hub#1531)', () => {
  // The engine writes `cert_message` in Spanish, and for THIS verdict it says nothing the sentence
  // does not already say. Interpolating it hands an English reader a fiscal audit line that switches
  // language halfway through — the ADR-0055 defect, one placeholder further in. The sentence is
  // read off the catalogue (never a literal), so the wording stays free and the contract does not.
  it('reads in Spanish to a Spanish reader, and is not the English sentence', async () => {
    locale = 'es';
    const cell = await messageCell(NIF_MISSING_ROW);
    const expected = esLocale.ui.evt.diagnostic_issuer_nif_missing.replace('{environment}', esLocale.ui.envTesting);
    expect(cell).toBe(expected);
    expect(cell).not.toBe(
      enLocale.ui.evt.diagnostic_issuer_nif_missing.replace('{environment}', enLocale.ui.envTesting),
    );
    expect(cell).not.toBe(NIF_MISSING_ROW.message);
    expect(cell).not.toMatch(/\{[a-z_]+\}/);
  });

  it('reads in English to an English reader, with none of the engine\'s Spanish in it', async () => {
    locale = 'en';
    const cell = await messageCell(NIF_MISSING_ROW);
    const expected = enLocale.ui.evt.diagnostic_issuer_nif_missing.replace('{environment}', enLocale.ui.envTesting);
    expect(cell).toBe(expected);
    expect(cell).not.toContain(ENGINE_CERT_MESSAGE);
    expect(cell).not.toBe(NIF_MISSING_ROW.message);
    expect(cell).not.toMatch(/\{[a-z_]+\}/);
  });
});

describe('«When» reads as a date and time, not as ISO-8601 (verifactu#141)', () => {
  async function whenColumn(): Promise<Record<string, unknown>> {
    const el = await mount();
    const column = el.columns.find((c) => c.key === 'timestamp');
    expect(column, 'the When column disappeared from the table').toBeDefined();
    return column!;
  }

  it('paints the stored timestamp in the hub language and zone', async () => {
    locale = 'es';
    const column = await whenColumn();
    const format = column.format as ((r: Record<string, unknown>) => string) | undefined;
    expect(format, 'the When column carries no formatter: the screen still prints the ISO text')
      .toBeInstanceOf(Function);
    expect(format!(ROW)).toBe('29/08/2026, 10:00:00');
    locale = 'en';
    expect(format!(ROW)).toBe('08/29/2026, 10:00:00');
  });

  it('only changes the CELL: sorting and the date-range filter stay on the stored column', async () => {
    const column = await whenColumn();
    expect(column.sortable).toBe(true);
    expect(column.filterable).toBe(true);
    expect(column.filterType).toBe('daterange');
    expect(column.render).toBeUndefined();
  });
});

/** A transmission the schema refused: an F2 over the AEAT ceiling (hub#2269). */
const OVER_CEILING_ROW = {
  ...ROW,
  id: 'e-3',
  event_type: 'xsd_invalid',
  severity: 'error',
  message: 'XML no conforme al esquema de la AEAT; no se ha transmitido: … y suma 4840.00 €',
  details: JSON.stringify({
    message_key: 'verifactu.xsd_invalid',
    validation_error: 'una factura simplificada F2 no puede pasar de 3.000,00 € … y suma 4840.00 €',
    validation_error_reason: {
      code: 'schema_simplified_over_ceiling',
      total: '4840.00',
      ceiling: '3000.00',
      tolerance: '10.00',
      total_cents: 484000,
      ceiling_cents: 300000,
      tolerance_cents: 1000,
    },
  }),
};

describe('the F2 ceiling refusal paints its amounts with the hub formatter (hub#2269)', () => {
  it('hands erplora().formatMoney the three amounts instead of printing «4840.00 €»', async () => {
    locale = 'es';
    const cell = await messageCell(OVER_CEILING_ROW);
    expect(cell).toContain('MONEY(484000)');
    expect(cell).toContain('MONEY(300000)');
    expect(cell).toContain('MONEY(1000)');
    expect(cell).not.toContain('4840.00');
    expect(cell).not.toMatch(/\{[a-z_]+\}/);
  });
});
