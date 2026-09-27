// An empty Records screen has to say WHICH empty it is (verifactu#59).
//
// «Sin registros VeriFactu» reads the same whether the business has not sold anything yet or has
// issued invoices that the chain never sealed. The second case is an incident — a `certificate`
// capability that was never granted, a listener that died (hub#1119 / ADR-0399) — and today the
// screen reassures the user at precisely the moment it should alarm them.
//
// Statically imported on purpose — see the note in `erp-verifactu-recovery.test.ts` (verifactu#31).
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-records';

/** Totals the fake transport reports, per query. */
let recordsTotal = 0;
let invoiceTotal = 0;
/** Makes `invoice.list` fail, the way a user without `invoice.view_invoice` sees it. */
let invoiceCountFails = false;

const translated: Array<{ key: string; params?: Record<string, unknown> }> = [];

beforeEach(() => {
  document.body.replaceChildren();
  translated.length = 0;
  recordsTotal = 0;
  invoiceTotal = 0;
  invoiceCountFails = false;
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryPage: async (name: string) => {
      if (name === 'invoice.list') {
        if (invoiceCountFails) throw new Error('permission_denied');
        return { rows: [], total: invoiceTotal, limit: 1, offset: 0 };
      }
      return { rows: [], total: recordsTotal, limit: 50, offset: 0 };
    },
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string, params?: Record<string, unknown>) => {
      translated.push({ key, params });
      return key;
    },

    formatMoney: (minor: number) => `MONEY(${minor})`,
  };
});

async function mount() {
  const el = document.createElement('erp-verifactu-records');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

/** The alarm banner, or null when the screen is not raising one. */
function alarm(el: HTMLElement & { shadowRoot: ShadowRoot }): Element | null {
  return el.shadowRoot.querySelector('ok-inline-feedback[tone="danger"]');
}

function emptyMessage(el: HTMLElement & { shadowRoot: ShadowRoot }): string {
  const table = el.shadowRoot.querySelector('ok-data-table') as HTMLElement & {
    emptyMessage?: string;
  };
  expect(table, 'the records table disappeared').toBeTruthy();
  return table.emptyMessage ?? '';
}

describe('invoices issued but nothing sealed — the chain is not working', () => {
  it('raises an alarm instead of the reassuring empty state', async () => {
    recordsTotal = 0;
    invoiceTotal = 3;
    const el = await mount();
    expect(alarm(el), 'no alarm on 3 invoices and 0 records').not.toBeNull();
  });

  it('says HOW MANY invoices are unsealed', async () => {
    recordsTotal = 0;
    invoiceTotal = 3;
    await mount();
    // Asserted on the key and its params, never on the sentence (ADR-0055).
    const call = translated.find((c) => c.key === 'ui.recordsNotSealing');
    expect(call, 'the alarm does not go through the catalogue').toBeDefined();
    expect(call?.params).toMatchObject({ count: 3 });
  });

  it('offers the two places where the cause lives', async () => {
    recordsTotal = 0;
    invoiceTotal = 3;
    const el = await mount();
    const actions = [...el.shadowRoot.querySelectorAll('ok-inline-feedback ion-button')];
    // Settings → Permissions (an ungranted `certificate` capability) and System → Dead events.
    expect(actions).toHaveLength(2);
    const keys = translated.map((c) => c.key);
    expect(keys).toContain('ui.recordsNotSealingGrant');
    expect(keys).toContain('ui.recordsNotSealingEvents');
  });
});

describe('nothing sold yet — an empty state, not an incident', () => {
  it('raises no alarm', async () => {
    recordsTotal = 0;
    invoiceTotal = 0;
    const el = await mount();
    expect(alarm(el)).toBeNull();
  });

  it('says there is nothing to seal yet, not just «no records»', async () => {
    recordsTotal = 0;
    invoiceTotal = 0;
    const el = await mount();
    expect(emptyMessage(el)).toBe('ui.recordsEmptyNoInvoices');
  });
});

describe('the chain IS sealing', () => {
  it('raises no alarm when records exist, however many invoices there are', async () => {
    recordsTotal = 5;
    invoiceTotal = 500;
    const el = await mount();
    expect(alarm(el)).toBeNull();
  });
});

describe('when the invoice count cannot be read, the screen claims nothing', () => {
  // A cashier without `invoice.view_invoice` must not be shown a false alarm — nor a false calm.
  it('raises no alarm it cannot justify', async () => {
    recordsTotal = 0;
    invoiceCountFails = true;
    const el = await mount();
    expect(alarm(el)).toBeNull();
  });

  it('says the check could not be made instead of failing silently', async () => {
    recordsTotal = 0;
    invoiceCountFails = true;
    const el = await mount();
    const note = el.shadowRoot.querySelector('ok-inline-feedback[tone="warning"]');
    expect(note, 'the failed check leaves no trace on screen').not.toBeNull();
    expect(translated.map((c) => c.key)).toContain('ui.recordsSealingUnknown');
    // And it falls back to the neutral wording, not to the "nothing sold" claim.
    expect(emptyMessage(el)).toBe('ui.recordsEmpty');
  });

  it('still renders the table', async () => {
    recordsTotal = 0;
    invoiceCountFails = true;
    const el = await mount();
    expect(el.shadowRoot.querySelector('ok-data-table')).toBeTruthy();
  });
});
