// The two fingerprints of the delivery are visible without opening the database (verifactu#86).
//
// #75 stamped `xml_sha256` and `transmission_id` on every transmitted record and stopped there.
// They are the two numbers a support call runs on:
//
//   · `transmission_id` is the `Idempotency-Key` the fiscal cell indexes by — the only way to line
//     a record of this hub up with a line of the cell's log. It is NOT always the record id: the
//     automatic re-anchoring presents the same record as `{id}-rechain-{anchor}`.
//   · `xml_sha256` is the digest of the bytes that travelled. Against the sha256 of the archived
//     XML it says whether the store moved underneath.
//
// Until this, no screen read `verifactu.records.get` at all: the query existed for the harness and
// the assistant, and the Records screen was a table that ended at the table. So the door itself —
// the row that opens a detail — is part of the contract pinned here, not only what the detail
// paints once open.
//
// Statically imported on purpose — see the note in `erp-verifactu-recovery.test.ts` (verifactu#31).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-records';
import { ErpVerifactuRecords } from './erp-verifactu-records';
import enLocale from '../../../locales/en.json';
import esLocale from '../../../locales/es.json';

const DIGEST = 'a'.repeat(56) + 'f00d1234';
const ROW = { id: 'rec-1', invoice_number: 'FACT/2026/17', sequence_number: 17 };

/** What `verifactu.records.get` answers. Overwritten per test. */
let detailRow: Record<string, unknown> | Array<Record<string, unknown>> | null = null;
/** Makes `verifactu.records.get` fail, the way a dropped connection or a denied permission does. */
let detailFails = false;
/** Holds `verifactu.records.get` open until the test releases it — the only way to SEE the loading state. */
let detailGate: Promise<void> | null = null;
/** Every query the screen asked for, so the call itself can be asserted and not just its effect. */
const asked: Array<{ name: string; params?: Record<string, unknown> }> = [];

function fullRow(over: Record<string, unknown> = {}) {
  return {
    id: 'rec-1',
    sequence_number: 17,
    invoice_number: 'FACT/2026/17',
    invoice_date: '2026-09-03',
    invoice_type: 'F1',
    record_type: 'alta',
    issuer_nif: 'B12345678',
    issuer_name: 'Bar Pepe SL',
    description: 'Comida',
    base_amount: 1000,
    tax_rate: '21.00',
    tax_amount: 210,
    total_amount: 1210,
    record_hash: 'b'.repeat(64),
    previous_hash: 'c'.repeat(64),
    is_first_record: 0,
    generation_timestamp: '2026-09-03T10:00:00Z',
    status: 'accepted',
    transmission_timestamp: '2026-09-03T10:00:05Z',
    retry_count: 0,
    next_retry_at: '',
    aeat_response_code: '',
    aeat_response_message: '',
    aeat_csv: 'CSV-123',
    qr_url: 'https://prewww2.aeat.es/qr',
    xml_storage_path: 'verifactu/2026/09/rec-1.xml',
    xml_sha256: DIGEST,
    transmission_id: 'rec-1-rechain-9f2b',
    ...over,
  };
}

beforeEach(() => {
  document.body.replaceChildren();
  asked.length = 0;
  detailRow = fullRow();
  detailFails = false;
  detailGate = null;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string, params?: Record<string, unknown>) => {
      asked.push({ name, params });
      if (name === 'verifactu.records.get') {
        if (detailGate) await detailGate;
        if (detailFails) throw new Error('permission_denied');
        return detailRow;
      }
      return [];
    },
    queryPage: async (name: string) => {
      asked.push({ name });
      return name === 'invoice.list'
        ? { rows: [], total: 1, limit: 1, offset: 0 }
        : { rows: [ROW], total: 1, limit: 50, offset: 0 };
    },
    command: async () => ({}),
    on: () => () => {},
    locale: 'en',
    t: (_catalog: unknown, key: string) => key,

    formatMoney: (minor: number) => `MONEY(${minor})`,
  };
});

type Mounted = HTMLElement & { shadowRoot: ShadowRoot };

async function mount(): Promise<Mounted> {
  const el = document.createElement('erp-verifactu-records');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as Mounted;
}

function table(el: Mounted): (HTMLElement & { rowClickable?: boolean }) | null {
  return el.shadowRoot.querySelector('ok-data-table');
}

/** Opens the detail the way a user does: by pressing the row. */
async function openRow(el: Mounted, row: Record<string, unknown> = ROW): Promise<void> {
  table(el)!.dispatchEvent(new CustomEvent('rowClick', { detail: { row } }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
}

function text(el: Mounted): string {
  return el.shadowRoot.textContent ?? '';
}

describe('the row is the door to the detail', () => {
  it('the table is row-clickable, or the detail is unreachable', async () => {
    const el = await mount();
    expect(table(el)?.rowClickable, 'rows do not open anything').toBe(true);
  });

  it('pressing a row asks verifactu.records.get for THAT record', async () => {
    const el = await mount();
    await openRow(el);
    expect(asked.filter((q) => q.name === 'verifactu.records.get')).toEqual([
      { name: 'verifactu.records.get', params: { record_id: 'rec-1' } },
    ]);
  });

  it('the detail replaces the list, and going back brings it home', async () => {
    const el = await mount();
    await openRow(el);
    expect(table(el), 'the list is still on screen under the detail').toBeNull();
    const back = el.shadowRoot.querySelector('[data-test="detail-back"]') as HTMLElement;
    expect(back, 'no way back from the detail').toBeTruthy();
    back.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(table(el), 'back did not restore the list').not.toBeNull();
  });
});

describe('the fingerprints of the delivery', () => {
  it('paints the transmission id, which is NOT the record id', async () => {
    const el = await mount();
    await openRow(el);
    expect(text(el)).toContain('rec-1-rechain-9f2b');
  });

  it('paints the digest WHOLE — the detail is where support copies it', async () => {
    const el = await mount();
    await openRow(el);
    // The list truncates a hash (`recovery` shows 16 chars + ellipsis); the detail must not, or
    // the number cannot be compared with the one the fiscal cell logged.
    expect(text(el)).toContain(DIGEST);
  });

  it('gives both of them a monospaced <code>, not a paragraph', async () => {
    const el = await mount();
    await openRow(el);
    const monos = [...el.shadowRoot.querySelectorAll('code')].map((c) => c.textContent?.trim());
    expect(monos, 'the digest is not in a <code>').toContain(DIGEST);
    expect(monos, 'the transmission id is not in a <code>').toContain('rec-1-rechain-9f2b');
    // The CSS contract that makes those <code> readable. happy-dom does no layout, so what is
    // pinned here is the rule, not the rendering — the look is checked in a browser (verifactu#80).
    const css = ErpVerifactuRecords.styles.toString();
    expect(css, 'no monospaced family for <code>').toMatch(/code\s*\{[^}]*ui-monospace/);
    expect(css, 'a 64-char digest with no break-all overflows its column').toMatch(
      /code\s*\{[^}]*break-all/,
    );
  });

  it('an unstamped fingerprint SAYS so instead of leaving a hole', async () => {
    // NOT NULL DEFAULT '' — "nobody stamped anything" is the empty string. A record that was
    // never transmitted, or that travelled before #75 landed, has it empty, and a blank cell reads
    // as a bug in the screen rather than as the state of the record.
    detailRow = fullRow({ xml_sha256: '', transmission_id: '' });
    const el = await mount();
    await openRow(el);
    const stamped = [...el.shadowRoot.querySelectorAll('[data-test="fingerprint"]')];
    expect(stamped, 'the delivery block vanished when empty').toHaveLength(2);
    for (const node of stamped) {
      expect(node.textContent?.trim(), 'an empty fingerprint left a blank').toBe(
        'ui.fingerprintNotStamped',
      );
    }
  });
});

describe('the detail when it cannot be shown', () => {
  it('a failing query says so and keeps the list underneath', async () => {
    detailFails = true;
    const el = await mount();
    await openRow(el);
    expect(el.shadowRoot.querySelector('ok-inline-feedback[tone="danger"]')).not.toBeNull();
    expect(table(el), 'the failed detail swallowed the list').not.toBeNull();
  });

  it('an id with no row says NOT FOUND instead of an empty detail', async () => {
    detailRow = [];
    const el = await mount();
    await openRow(el);
    expect(text(el)).toContain('ui.errRecordNotFound');
    expect(table(el), 'a missing record swallowed the list').not.toBeNull();
  });
});

describe('while the detail is on its way', () => {
  // A press that answers nothing invites a second press — and a second `records.get` for the same
  // row. Loading is a state of THIS screen, exactly like error is: painted, not inferred from the
  // list standing still (root CLAUDE.md «UI completa»: loading/empty/error, all three).
  const settle = async (el: Mounted): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  };
  const loading = (el: Mounted): Element | null =>
    el.shadowRoot.querySelector('[data-test="detail-loading"]');

  it('says the record is loading, over the list, until records.get answers', async () => {
    let release!: () => void;
    detailGate = new Promise<void>((resolve) => (release = resolve));
    const el = await mount();
    await openRow(el);
    expect(loading(el), 'nothing tells the user the record is on its way').not.toBeNull();
    expect(text(el), 'the loading notice is not the translated one').toContain('ui.loading');
    expect(table(el), 'the list vanished before the detail arrived').not.toBeNull();
    release();
    await settle(el);
    expect(loading(el), 'the loading notice outlived the answer').toBeNull();
    expect(text(el)).toContain(DIGEST);
  });

  it('a failed lookup takes the loading notice down with it', async () => {
    let release!: () => void;
    detailGate = new Promise<void>((resolve) => (release = resolve));
    detailFails = true;
    const el = await mount();
    await openRow(el);
    expect(loading(el)).not.toBeNull();
    release();
    await settle(el);
    expect(loading(el), 'a failure left the screen «loading» forever').toBeNull();
    expect(el.shadowRoot.querySelector('ok-inline-feedback[tone="danger"]')).not.toBeNull();
  });
});

describe('every string the detail shows is translated (ADR-0055/0199)', () => {
  it('has an `es` for each new `ui.*` key the component asks for', async () => {
    // Read from disk, not `Class.toString()`: the transform is free to rewrite the body, and a
    // key list that comes back empty would turn this into a green light that checks nothing.
    const source = readFileSync(join(__dirname, 'erp-verifactu-records.ts'), 'utf8');
    const en = (enLocale as { ui: Record<string, string> }).ui;
    const es = (esLocale as { ui: Record<string, string> }).ui;
    const keys = [...new Set([...source.matchAll(/['"]ui\.([A-Za-z0-9_]+)['"]/g)].map((m) => m[1]))];
    // The control that keeps this from passing vacuously: the screen has always had a title.
    expect(keys, 'no ui.* key found in the source — the regex broke, not the locales').toContain(
      'recordsTitle',
    );
    expect(keys.filter((k) => !(k in en))).toEqual([]);
    expect(keys.filter((k) => !(k in es))).toEqual([]);
  });
});
