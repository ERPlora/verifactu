// A record that is not at the AEAT yet says WHY, and WHEN it goes out on its own (verifactu#111).
//
// A business that sold before it had any way to file saw its records sit in «Pending» with nothing
// to explain it: no reason, no date, no button. The engine now sends those records on its own —
// in order, declared as late remissions — and writes why each one waited. The detail of a record
// is where the owner looks, so that is where both halves have to be:
//
//   · WHY — the sentence of the record's own audit row (the deferral, or the failed attempt),
//     composed from its code in the reader's language, never the engine's Spanish prose;
//   · WHEN — its next attempt if it sits in the contingency queue, otherwise the next automatic
//     send, which runs every 5 minutes and takes it as soon as the hub can file.
//
// Assertions are on KEYS (ADR-0055): `t` echoes the key it was asked for.
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-records';

const ROW = { id: 'rec-7', invoice_number: 'TICKET-2026-000007', sequence_number: 7 };

function record(over: Record<string, unknown> = {}) {
  return {
    id: 'rec-7',
    sequence_number: 7,
    invoice_number: 'TICKET-2026-000007',
    invoice_date: '2026-09-19',
    invoice_type: 'F2',
    record_type: 'alta',
    issuer_nif: 'B12345674',
    issuer_name: 'Salon Lucia SL',
    description: 'Corte',
    base_amount: '24.71',
    tax_rate: '21.00',
    tax_amount: '5.19',
    total_amount: '29.90',
    record_hash: 'b'.repeat(64),
    previous_hash: 'c'.repeat(64),
    is_first_record: 0,
    generation_timestamp: '2026-09-19T10:00:00+02:00',
    status: 'pending',
    transmission_timestamp: '',
    retry_count: 0,
    next_retry_at: '',
    aeat_response_code: '',
    aeat_response_message: '',
    aeat_csv: '',
    qr_url: '',
    xml_storage_path: '',
    xml_sha256: '',
    transmission_id: '',
    ...over,
  };
}

/** The deferral row the engine writes when a sale leaves no road behind it. */
const DEFERRED = {
  id: 'evt-2',
  record_id: 'rec-7',
  event_type: 'transmission_deferred',
  severity: 'warning',
  message: 'Pendiente de envío a la AEAT: este hub aún no tiene vía de envío',
  details: JSON.stringify({
    message_key: 'verifactu.transmission_deferred',
    why: 'este hub aún no tiene vía de envío',
    why_reason: { code: 'no_transmission_route' },
  }),
  timestamp: '2026-09-19T10:00:00+02:00',
};

/** Written in the same instant as the deferral: it must not be taken for the reason. */
const CREATED = {
  id: 'evt-1',
  record_id: 'rec-7',
  event_type: 'record_created',
  severity: 'info',
  message: 'Registro alta #7 de TICKET-2026-000007 creado',
  details: JSON.stringify({ message_key: 'verifactu.record_created' }),
  timestamp: '2026-09-19T10:00:00+02:00',
};

let detailRow: Record<string, unknown> = record();
let events: Array<Record<string, unknown>> = [];
let queue: Array<Record<string, unknown>> = [];
let lookupsFail = false;
const asked: Array<{ name: string; params?: Record<string, unknown> }> = [];

beforeEach(() => {
  document.body.replaceChildren();
  asked.length = 0;
  detailRow = record();
  events = [CREATED, DEFERRED];
  queue = [];
  lookupsFail = false;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string, params?: Record<string, unknown>) => {
      asked.push({ name, params });
      return name === 'verifactu.records.get' ? detailRow : [];
    },
    queryPage: async (name: string, params?: Record<string, unknown>) => {
      asked.push({ name, params });
      if (name === 'verifactu.events.list' || name === 'verifactu.contingency.list') {
        if (lookupsFail) throw new Error('permission_denied');
        const rows = name === 'verifactu.events.list' ? events : queue;
        return { rows, total: rows.length, limit: 20, offset: 0 };
      }
      return name === 'invoice.list'
        ? { rows: [], total: 1, limit: 1, offset: 0 }
        : { rows: [ROW], total: 1, limit: 50, offset: 0 };
    },
    command: async () => ({}),
    on: () => () => {},
    locale: 'en',
    t: (_catalog: unknown, key: string, params?: Record<string, unknown>) =>
      params && Object.keys(params).length ? `${key} ${JSON.stringify(params)}` : key,
  };
});

type Mounted = HTMLElement & { shadowRoot: ShadowRoot };

const settle = async (el: Mounted): Promise<void> => {
  for (let i = 0; i < 4; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  }
};

async function openPending(): Promise<Mounted> {
  const el = document.createElement('erp-verifactu-records') as Mounted;
  document.body.appendChild(el);
  await settle(el);
  el.shadowRoot
    .querySelector('ok-data-table')!
    .dispatchEvent(new CustomEvent('rowClick', { detail: { row: ROW } }));
  await settle(el);
  return el;
}

const waiting = (el: Mounted) => el.shadowRoot.querySelector('[data-test="waiting"]');
const why = (el: Mounted) =>
  el.shadowRoot.querySelector('[data-test="waiting-why"]')?.textContent?.trim() ?? '';
const when = (el: Mounted) =>
  el.shadowRoot.querySelector('[data-test="waiting-when"]')?.textContent?.trim() ?? '';

describe('a record that is not at the AEAT yet says why and when', () => {
  it('asks for THIS record’s audit rows and queue entry, not the whole lists', async () => {
    await openPending();
    const lookups = asked.filter(
      (q) => q.name === 'verifactu.events.list' || q.name === 'verifactu.contingency.list',
    );
    expect(lookups.map((q) => q.name).sort()).toEqual([
      'verifactu.contingency.list',
      'verifactu.events.list',
    ]);
    for (const q of lookups) {
      expect(q.params?.filters, `${q.name} was not filtered by the record`).toEqual({
        record_id: 'rec-7',
      });
    }
  });

  it('WHY is the deferral the engine filed, composed from its code', async () => {
    const el = await openPending();
    expect(waiting(el), 'a pending record explains nothing').not.toBeNull();
    // The sentence of `verifactu.transmission_deferred`, not the row written in the same instant
    // (`record_created`) and never the engine's Spanish prose.
    expect(why(el)).toContain('ui.evt.transmission_deferred');
    expect(why(el)).not.toContain('Pendiente de envío');
  });

  it('WHEN, outside the queue, is the next automatic send', async () => {
    const el = await openPending();
    expect(when(el)).toBe('ui.pendingWhenNextSend');
  });

  it('WHEN, inside the queue, is its own next attempt', async () => {
    queue = [
      {
        id: 'q-1',
        record_id: 'rec-7',
        status: 'retrying',
        attempts: 2,
        next_attempt_at: '2026-09-19T10:20:00+02:00',
        last_error: 'the wire failed',
      },
    ];
    const el = await openPending();
    expect(when(el)).toContain('ui.pendingWhenQueued');
    // Its own next attempt, as the wall clock the hub wrote it — not a raw ISO stamp.
    expect(when(el)).toContain('"at":"2026-09-19 10:20"');
  });

  it('a record older than the audit trail of its reason still says something true', async () => {
    // Born before the engine wrote deferrals: its only row is `record_created`.
    events = [CREATED];
    const el = await openPending();
    expect(why(el)).toBe('ui.pendingWhyUnknown');
    expect(when(el)).toBe('ui.pendingWhenNextSend');
  });

  it('a lookup that fails says the reason could not be read, and still says when', async () => {
    lookupsFail = true;
    const el = await openPending();
    expect(waiting(el)).not.toBeNull();
    expect(why(el)).toBe('ui.pendingWhyUnavailable');
    expect(when(el)).toBe('ui.pendingWhenNextSend');
  });

  it('a failed attempt in the queue is also on its way, and says so', async () => {
    detailRow = record({ status: 'error' });
    events = [
      CREATED,
      {
        ...DEFERRED,
        event_type: 'transmission_failure',
        details: JSON.stringify({ message_key: 'verifactu.not_transmitted', reason: 'transmission_failed', error: 'x', attempts: 1 }),
      },
    ];
    const el = await openPending();
    expect(why(el)).toContain('ui.evt.not_transmitted');
  });

  it('a record the AEAT holds has nothing to explain, and nothing is asked', async () => {
    detailRow = record({ status: 'accepted', aeat_csv: 'A-1' });
    const el = await openPending();
    expect(waiting(el)).toBeNull();
    expect(asked.some((q) => q.name === 'verifactu.events.list')).toBe(false);
  });
});
