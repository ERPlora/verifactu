// The «Recent AEAT events» home widget speaks the same language as the Events tab (verifactu#139).
//
// It used to be a declarative `timeline` widget: the shell painted `event_type` as the title, the
// engine's Spanish `message` below and the raw ISO `timestamp` — «transmission_deferred» on the
// owner's home screen while the Events tab already said «Envío aplazado». The sentence is composed
// out of `details.message_key` against THIS module's catalogue, which no generic shell mapping can
// do, so the widget is the module's own component. These pin what it paints.
//
// Statically imported on purpose — see the note in `erp-verifactu-recovery.test.ts` (verifactu#31).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import './erp-verifactu-events-widget';
import enLocale from '../../../locales/en.json';
import esLocale from '../../../locales/es.json';
import { formatEventTime } from '../../lib/event-time';
import manifest from '../../../module.json';

/** What `records.rs` files for a sale that could not leave yet (verifactu#111). */
const DEFERRED = {
  id: 'ev-2',
  event_type: 'transmission_deferred',
  severity: 'warning',
  message: 'Pendiente de envío a la AEAT: este hub aún no tiene vía de envío',
  details: JSON.stringify({
    message_key: 'verifactu.transmission_deferred',
    why: 'este hub aún no tiene vía de envío',
    why_reason: { code: 'no_transmission_route' },
  }),
  timestamp: '2026-09-27T10:00:05+02:00',
};

const CREATED = {
  id: 'ev-1',
  event_type: 'record_created',
  severity: 'info',
  message: 'Registro Alta #1 de la factura F-2026-1 sellado',
  details: JSON.stringify({
    message_key: 'verifactu.record_created',
    record_type: 'alta',
    invoice_number: 'F-2026-1',
    sequence_number: 1,
    record_hash: 'a'.repeat(64),
    is_first_record: true,
  }),
  timestamp: '2026-09-27T10:00:00+02:00',
};

let locale = 'en';
let rows: unknown[] = [];
let failWith: Error | null = null;
const handlers = new Map<string, () => void>();
const unsubscribed: string[] = [];
const query = vi.fn();

function realT(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string {
  const dict = (catalog[locale] ?? catalog.en ?? {}) as Record<string, unknown>;
  let cur: unknown = dict;
  for (const part of key.split('.')) {
    cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[part] : undefined;
  }
  let out = typeof cur === 'string' ? cur : key;
  for (const [k, v] of Object.entries(params ?? {})) out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  return out;
}

/** The module-scoped client the shell hands the widget (`client.forModule('verifactu')`). */
function client() {
  return {
    query: (name: string, params?: Record<string, unknown>) => {
      query(name, params);
      return failWith ? Promise.reject(failWith) : Promise.resolve(rows);
    },
    on: (event: string, cb: () => void) => {
      handlers.set(event, cb);
      return () => unsubscribed.push(event);
    },
    get locale() {
      return locale;
    },
    timezone: 'Europe/Madrid',
    t: realT,
    // hub#2269: names the minor units it was handed, so a test can say WHICH amount reached it.
    formatMoney: (minor: number) => `MONEY(${minor})`,
  };
}

beforeEach(() => {
  document.body.replaceChildren();
  locale = 'en';
  rows = [DEFERRED, CREATED];
  failWith = null;
  handlers.clear();
  unsubscribed.length = 0;
  query.mockReset();
  // The shell also publishes the global client; the widget must use the one it was HANDED.
  (globalThis as Record<string, unknown>).erplora = undefined;
});

type Widget = HTMLElement & { client?: unknown; updateComplete: Promise<unknown> };

async function settle(el: Widget): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

/** Mounted the way `buildComponentRender` mounts it: create, hand the client, append. */
async function mount(): Promise<Widget> {
  const el = document.createElement('erp-verifactu-events-widget') as Widget;
  el.client = client();
  document.body.appendChild(el);
  await settle(el);
  return el;
}

interface Item { id: string; title: string; description?: string; time?: string; color?: string }

function items(el: Widget): Item[] {
  const tl = el.shadowRoot?.querySelector('ok-timeline') as (HTMLElement & { items?: Item[] }) | null;
  expect(tl, 'the widget paints no ok-timeline').not.toBeNull();
  return tl!.items ?? [];
}

function shownText(el: Widget): string {
  return el.shadowRoot?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

/** The muted card the shell's own widgets use for «nothing» and «failed» (`showMuted`). */
function mutedMessage(el: Widget): string | undefined {
  const empty = el.shadowRoot?.querySelector('ok-empty-state') as (HTMLElement & { message?: string }) | null;
  expect(empty, 'no ok-empty-state painted').not.toBeNull();
  return empty!.message;
}

describe('what each event reads as', () => {
  it('reads the latest events through the module query', async () => {
    await mount();
    expect(query).toHaveBeenCalledWith('verifactu.stats.events_recent', undefined);
  });

  it('titles every event with the translated type, never the internal code', async () => {
    const el = await mount();
    expect(items(el).map((i) => i.title)).toEqual([
      enLocale.ui.evtType.transmission_deferred,
      enLocale.ui.evtType.record_created,
    ]);
    locale = 'es';
    const es = await mount();
    expect(items(es).map((i) => i.title)).toEqual([
      esLocale.ui.evtType.transmission_deferred,
      esLocale.ui.evtType.record_created,
    ]);
  });

  it('composes the sentence from the catalogue, not the engine\'s Spanish prose', async () => {
    const el = await mount();
    const [deferred, created] = items(el);
    expect(deferred.description).not.toBe(DEFERRED.message);
    expect(created.description).toBe(
      enLocale.ui.evt.record_created
        .replace('{record_type}', enLocale.ui.recTypeAlta)
        .replace('{sequence_number}', '1')
        .replace('{invoice_number}', 'F-2026-1'),
    );
    for (const i of items(el)) expect(i.description).not.toMatch(/\{[a-z_]+\}/);
  });

  it('says when in the hub language and zone, not in ISO-8601', async () => {
    locale = 'es';
    const el = await mount();
    const [deferred] = items(el);
    expect(deferred.time).toBe(formatEventTime(DEFERRED.timestamp, { locale: 'es', timezone: 'Europe/Madrid' }));
    for (const i of items(el)) expect(i.time).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('colours a warning apart from an informative event', async () => {
    const el = await mount();
    const [deferred, created] = items(el);
    expect(deferred.color).toBe('warning');
    expect(created.color).toBeUndefined();
    rows = [{ ...CREATED, id: 'ev-9', severity: 'error' }, { ...CREATED, id: 'ev-8', severity: 'critical' }];
    const bad = await mount();
    expect(items(bad).map((i) => i.color)).toEqual(['danger', 'danger']);
  });

  it('keeps the code for an event type this module does not know yet', async () => {
    rows = [{ ...CREATED, event_type: 'something_new' }];
    const el = await mount();
    expect(items(el)[0].title).toBe('something_new');
  });

  it('keeps each event distinguishable by its id', async () => {
    const el = await mount();
    expect(items(el).map((i) => i.id)).toEqual(['ev-2', 'ev-1']);
  });
});

describe('loading, empty and error states', () => {
  it('says it is loading until the query answers', async () => {
    let answer: (v: unknown[]) => void = () => {};
    const el = document.createElement('erp-verifactu-events-widget') as Widget;
    el.client = { ...client(), query: () => new Promise((resolve) => { answer = resolve; }) };
    document.body.appendChild(el);
    await el.updateComplete;
    expect(shownText(el)).toBe(enLocale.ui.loading);
    answer([CREATED]);
    await settle(el);
    expect(items(el)).toHaveLength(1);
  });

  it('says there is nothing yet instead of an empty card', async () => {
    rows = [];
    const el = await mount();
    expect(el.shadowRoot?.querySelector('ok-timeline')).toBeNull();
    expect(mutedMessage(el)).toBe(enLocale.ui.eventsEmpty);
  });

  it('says it could not load, in the reader\'s language, when the query fails', async () => {
    failWith = new Error('network down');
    locale = 'es';
    const el = await mount();
    expect(el.shadowRoot?.querySelector('ok-timeline')).toBeNull();
    expect(mutedMessage(el)).toBe(esLocale.ui.eventsWidgetError);
    expect(esLocale.ui.eventsWidgetError).not.toBe(enLocale.ui.eventsWidgetError);
  });
});

describe('live refresh', () => {
  it('re-reads on the events that change the list and lets go of them when removed', async () => {
    const el = await mount();
    expect([...handlers.keys()].sort()).toEqual([
      'verifactu.contingency.processed',
      'verifactu.record.created',
      'verifactu.record.transmitted',
    ]);
    rows = [CREATED];
    query.mockClear();
    handlers.get('verifactu.record.created')!();
    await settle(el);
    expect(query).toHaveBeenCalledTimes(1);
    expect(items(el)).toHaveLength(1);
    el.remove();
    expect(unsubscribed.sort()).toEqual([...handlers.keys()].sort());
  });

  it('shows the failure, not the previous events, when a refresh fails', async () => {
    const el = await mount();
    failWith = new Error('network down');
    handlers.get('verifactu.record.transmitted')!();
    await settle(el);
    // Stale data never passes for fresh: the error replaces the list.
    expect(el.shadowRoot?.querySelector('ok-timeline')).toBeNull();
    expect(mutedMessage(el)).toBe(enLocale.ui.eventsWidgetError);
  });

  it('comes back to the events once a refresh after a failure answers', async () => {
    // A network blip must not leave the card on «could not load» until the page is reloaded.
    const el = await mount();
    failWith = new Error('network down');
    handlers.get('verifactu.record.transmitted')!();
    await settle(el);
    failWith = null;
    handlers.get('verifactu.record.created')!();
    await settle(el);
    expect(el.shadowRoot?.querySelector('ok-empty-state')).toBeNull();
    expect(items(el).map((i) => i.id)).toEqual(['ev-2', 'ev-1']);
  });

  it('follows a language change of the shell without being mounted again', async () => {
    const el = await mount();
    locale = 'es';
    window.dispatchEvent(new CustomEvent('erplora:locale-changed', { detail: { locale } }));
    await settle(el);
    expect(items(el).map((i) => i.title)).toEqual([
      esLocale.ui.evtType.transmission_deferred,
      esLocale.ui.evtType.record_created,
    ]);
  });
});

describe('the home widget is this component', () => {
  const widget = (manifest.widgets as Record<string, Record<string, unknown>>)['verifactu.events'];

  it('is declared through the component escape hatch, not the shell\'s raw timeline', () => {
    expect(widget.component).toBe('erp-verifactu-events-widget');
    expect(widget.kind).toBeUndefined();
    expect(customElements.get(widget.component as string)).toBeDefined();
  });

  it('is gated by the same permission as the query it reads', () => {
    const queries = manifest.queries as Record<string, { permission?: string }>;
    expect(widget.permission).toBe('verifactu.view_verifactu');
    expect(queries['verifactu.stats.events_recent'].permission).toBe(widget.permission);
  });
});

describe('the F2 ceiling refusal paints its amounts with the handed client formatter (hub#2269)', () => {
  it('hands client.formatMoney the three amounts instead of printing «4840.00 €»', async () => {
    rows = [{
      id: 'ev-3',
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
      timestamp: '2026-09-27T10:00:00+02:00',
    }];
    locale = 'es';
    const [item] = items(await mount());
    expect(item.description).toContain('MONEY(484000)');
    expect(item.description).toContain('MONEY(1000)');
    expect(item.description).not.toContain('4840.00');
  });
});
