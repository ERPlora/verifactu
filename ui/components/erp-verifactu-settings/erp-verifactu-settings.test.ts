// verifactu#50 — the «Emit test invoice» button speaks `invoice.create`'s WIRE contract.
//
// The test invoice is the only product caller of `invoice.create` outside invoice's own UI, and it
// was built when `quantity` still travelled as a bare logical number. Since ADR-0147 the quantity
// is a FIXED-POINT integer of scale 10⁶ (1 unit = 1000000) and `unit_price` is integer minor
// units (cents, ADR-0123). The button sent `quantity: 1` — 0,000001 units — so:
//
//   - before invoice 1.2.17 the test invoice was ISSUED for 0.00 € (numbered, `alta` record,
//     hash-chained): 0.000001 units × 100 cents prices to 0;
//   - since invoice 1.2.17 (invoice#49) the destination refuses it twice: the schema floor
//     `quantity.minimum: 1000` (422 `invalid_payload`) and, past the schema, the domain guard
//     `invoice.line_amount_underflow` (409) for any priced line whose amount rounds to 0.
//
// These tests pin the payload that leaves the button so the next test line cannot repeat the
// mistake. The component is imported STATICALLY on purpose (verifactu#31): a dynamic import
// inside a test charges the whole OutfitKit/SDK transform to that test's 5 s budget.
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-settings';

const commands: Array<{ name: string; payload: Record<string, unknown> }> = [];

beforeEach(() => {
  document.body.replaceChildren();
  commands.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => name === 'verifactu.config.get'
      ? [{ issuer_nif: 'B12345678', environment: 'testing', has_certificate: 1 }]
      : [],
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async (name: string, payload: Record<string, unknown>) => {
      commands.push({ name, payload });
      return {};
    },
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

async function mount() {
  const el = document.createElement('erp-verifactu-settings');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

async function emitTestInvoice(el: HTMLElement) {
  const wc = el as unknown as { createTestInvoice: () => Promise<void>; updateComplete: Promise<unknown> };
  await wc.createTestInvoice();
  await wc.updateComplete;
}

function lastInvoiceCreate() {
  return commands.find((c) => c.name === 'invoice.create');
}

describe('test invoice button: `invoice.create` wire contract (verifactu#50)', () => {
  it('sends quantity in µ-units (1 unit = 1000000, ADR-0147) and unit_price in cents', async () => {
    const el = await mount();
    await emitTestInvoice(el);

    const alta = lastInvoiceCreate();
    expect(alta, 'the button did not call invoice.create').toBeTruthy();
    expect(alta!.payload.items).toEqual([
      { description: 'Factura de PRUEBA VeriFactu (entorno de pruebas)', quantity: 1_000_000, unit_price: 100, tax_rate: 21, product_id: null },
    ]);
    // The rest of the diagnostic envelope stays as it was: F2 ticket, test source, TICKET series.
    expect(alta!.payload).toMatchObject({ series_code: 'TICKET', invoice_type: 'F2', source_type: 'test' });
  });

  it('clears both invoice#49 rejections: the schema floor (422) and the zero-amount line (409)', async () => {
    const el = await mount();
    await emitTestInvoice(el);

    const item = (lastInvoiceCreate()!.payload.items as Array<{ quantity: number; unit_price: number }>)[0];
    // Gate 1 — schemas/create_invoice.json: `quantity.minimum: 1000` (a bare `1` is the 422).
    expect(item.quantity, 'quantity below 1000 is a scale mistake, not a quantity').toBeGreaterThanOrEqual(1000);
    // Gate 2 — handler: a PRICED line whose amount rounds to 0 is `invoice.line_amount_underflow`.
    const base = Math.round((item.quantity / 1_000_000) * item.unit_price);
    expect(base, 'the line must price above 0 or no invoiceable line exists').toBeGreaterThan(0);
  });

  it('the derived VAT breakdown still squares: base + quota = total', async () => {
    const el = await mount();
    await emitTestInvoice(el);

    const item = (lastInvoiceCreate()!.payload.items as Array<{ quantity: number; unit_price: number; tax_rate: number }>)[0];
    // Same arithmetic the destination runs (manual line, tax-EXCLUSIVE): base = price × qty,
    // quota = base × rate/100, total = base + quota — all integer minor units.
    const base = Math.round((item.quantity / 1_000_000) * item.unit_price);
    const quota = Math.round((base * item.tax_rate) / 100);
    // 1 unit × 1.00 € at 21 %: base 1.00 € + quota 0.21 € — the real test invoice, not 0.00 €.
    expect(base).toBe(100);
    expect(quota).toBe(21);
    expect(base + quota).toBe(121);
  });
});
