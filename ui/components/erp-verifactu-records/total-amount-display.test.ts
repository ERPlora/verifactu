// The total of a VeriFactu record is painted by the shell's single money formatter (pm#289).
//
// `verifactu_record.total_amount` is an INTEGER in cents (migration 001, ADR-0123), and the
// dispatcher hands it to the screen as that integer. The Records list and the detail painted it
// with `Number(total_amount).toFixed(2)`: a 12,10 € record read «1210.00» — a hundred times the
// amount filed at the AEAT — with no currency and the reader's separators ignored.
//
// Both now go through `erplora().formatMoney(minor)`: currency and scale of the hub, locale of the
// reader. The double echoes what it was given, so the assertion is on the integer that reached the
// formatter, not on a separator.
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-records';

const ROW = { id: 'rec-1', invoice_number: 'FACT/2026/17', sequence_number: 17, total_amount: 1210 };

/** Every amount the screen handed to the shell's formatter. */
const formatted: number[] = [];

beforeEach(() => {
  document.body.replaceChildren();
  formatted.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) =>
      name === 'verifactu.records.get'
        ? {
            id: 'rec-1',
            sequence_number: 17,
            invoice_number: 'FACT/2026/17',
            invoice_date: '2026-09-03',
            invoice_type: 'F1',
            record_type: 'alta',
            issuer_nif: 'B12345678',
            issuer_name: 'Bar Pepe SL',
            base_amount: 1000,
            tax_rate: '21.00',
            tax_amount: 210,
            total_amount: 1210,
            status: 'accepted',
            record_hash: 'b'.repeat(64),
            previous_hash: 'c'.repeat(64),
            xml_sha256: '',
            transmission_id: '',
          }
        : [],
    queryPage: async (name: string) =>
      name === 'invoice.list'
        ? { rows: [], total: 1, limit: 1, offset: 0 }
        : { rows: [ROW], total: 1, limit: 50, offset: 0 },
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    formatMoney: (minor: number) => {
      formatted.push(minor);
      return `MONEY(${minor})`;
    },
  };
});

type Mounted = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

async function mount(): Promise<Mounted> {
  const el = document.createElement('erp-verifactu-records') as Mounted;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
  return el;
}

type Column = { key: string; format?: (row: Record<string, unknown>) => string };

describe('the record total is money of the hub, not a hundredfold number (pm#289)', () => {
  it('the Total column formats the cents through erplora().formatMoney', async () => {
    const el = await mount();
    const table = el.shadowRoot.querySelector('ok-data-table') as HTMLElement & { columns: Column[] };
    const total = table.columns.find((c) => c.key === 'total_amount');
    expect(total?.format, 'the Total column lost its formatter').toBeTypeOf('function');
    expect(total!.format!(ROW)).toBe('MONEY(1210)');
    // The table also calls it while painting the row (table and card views): what matters is that
    // the formatter only ever got the integer the query returned.
    expect(new Set(formatted)).toEqual(new Set([1210]));
  });

  it('the detail paints the total through erplora().formatMoney, never «1210.00»', async () => {
    const el = await mount();
    el.shadowRoot
      .querySelector('ok-data-table')!
      .dispatchEvent(new CustomEvent('rowClick', { detail: { row: ROW } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
    const text = el.shadowRoot.textContent ?? '';
    expect(text, 'the detail did not open').toContain('Bar Pepe SL');
    expect(text).toContain('MONEY(1210)');
    expect(text).not.toContain('1210.00');
  });
});
