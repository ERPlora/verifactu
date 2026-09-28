// The Events screen paints Severity and Type as words, in the cell, the filter and the card
// (verifactu#134). `event-labels.test.ts` pins the vocabulary; this pins that the SCREEN uses it —
// a perfect label nothing calls leaves «transmission_deferred» in front of the owner.
//
// Statically imported on purpose — see the note in `erp-verifactu-recovery.test.ts` (verifactu#31).
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-events';
import enLocale from '../../../locales/en.json';
import esLocale from '../../../locales/es.json';
import { ENGINE_EVENT_TYPES, EVENT_SEVERITIES } from '../../lib/event-labels';

const ROW = {
  id: 'e-1',
  record_id: 'r-1',
  event_type: 'transmission_deferred',
  severity: 'warning',
  message: 'Registro 3 pendiente de envío',
  details: '{}',
  timestamp: '2026-09-27T10:00:00+02:00',
};

let locale = 'es';

beforeEach(() => {
  document.body.replaceChildren();
  locale = 'es';
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryPage: async () => ({ rows: [ROW], total: 1 }),
    command: async () => ({}),
    on: () => () => {},
    get locale() {
      return locale;
    },
    t: (catalog: Record<string, unknown>, key: string) => {
      let cur: unknown = catalog[locale] ?? catalog.en;
      for (const part of key.split('.')) {
        cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[part] : undefined;
      }
      return typeof cur === 'string' ? cur : key;
    },
  };
});

type Column = {
  key: string;
  filterType?: string;
  options?: Array<{ value: string; label: string }>;
  format?: (r: Record<string, unknown>) => string;
};

async function mount() {
  const el = document.createElement('erp-verifactu-events');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as unknown as HTMLElement & { columns: Column[] };
}

async function column(key: string): Promise<Column> {
  const el = await mount();
  const col = el.columns.find((c) => c.key === key);
  expect(col, `the ${key} column disappeared from the table`).toBeDefined();
  return col!;
}

describe('the Severity column', () => {
  it('paints the translated label, not the code', async () => {
    const col = await column('severity');
    expect(col.format, 'Severity carries no formatter: the cell prints the code').toBeInstanceOf(Function);
    expect(col.format!(ROW)).toBe(esLocale.ui.sevWarning);
    expect(col.format!(ROW)).not.toBe('warning');
  });

  it('follows the active language', async () => {
    locale = 'en';
    expect((await column('severity')).format!(ROW)).toBe(enLocale.ui.sevWarning);
  });

  it('still filters by the code the list compares with `eq`', async () => {
    const col = await column('severity');
    expect(col.filterType).toBe('select');
    expect(col.options!.map((o) => o.value)).toEqual([...EVENT_SEVERITIES]);
    expect(col.options!.find((o) => o.value === 'info')!.label).toBe(esLocale.ui.sevInfo);
  });
});

describe('the Type column', () => {
  it('paints the translated label, not the code', async () => {
    const col = await column('event_type');
    expect(col.format, 'Type carries no formatter: the cell prints the code').toBeInstanceOf(Function);
    expect(col.format!(ROW)).toBe(esLocale.ui.evtType.transmission_deferred);
    expect(col.format!(ROW)).not.toBe('transmission_deferred');
  });

  it('follows the active language', async () => {
    locale = 'en';
    expect((await column('event_type')).format!(ROW)).toBe(enLocale.ui.evtType.transmission_deferred);
  });

  it('filters by picking a label, sending the exact code the list compares with `eq`', async () => {
    // A text box over an `op: eq` filter only ever matched when the owner typed the internal code.
    const col = await column('event_type');
    expect(col.filterType).toBe('select');
    expect(col.options!.map((o) => o.value)).toEqual([...ENGINE_EVENT_TYPES]);
    for (const option of col.options!) {
      expect(option.label).toBe((esLocale.ui.evtType as Record<string, string>)[option.value]);
    }
  });
});

describe('the card view (mobile)', () => {
  it('titles each card with the translated type, not the code', async () => {
    const el = await mount();
    const table = el.shadowRoot!.querySelector('ok-data-table') as unknown as {
      cardTitle: (row: Record<string, unknown>) => string;
    };
    expect(table.cardTitle(ROW)).toBe(esLocale.ui.evtType.transmission_deferred);
  });
});
