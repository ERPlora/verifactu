// erp-verifactu-events-widget — the «Recent AEAT events» card of the home dashboard (verifactu#139).
//
// It was a declarative `timeline` widget, and the shell can only copy columns into `ok-timeline`:
// the owner's home screen read «transmission_deferred», the engine's Spanish prose and a raw ISO
// timestamp, while the Events tab already said «Envío aplazado». The sentence is composed from
// `details.message_key` against THIS module's catalogue (verifactu#63), which no generic mapping in
// the shell can do — so the widget is the module's own component (ADR-0054 escape hatch), built
// from the very helpers the Events tab uses. Same data, same query, same permission.
//
// The shell mounts it inside the widget card and hands it `client` (scoped to this module); the
// live refresh the declarative path got from `refresh_on` is done here, on the same events.

import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-timeline';
import '@erplora/outfitkit/ok-empty-state';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
import { eventMessage, type Translate } from '../../lib/event-message';
import { eventTypeLabel } from '../../lib/event-labels';
import { formatEventTime } from '../../lib/event-time';

const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

/** The query behind the card, and the domain events after which it is stale. */
const QUERY = 'verifactu.stats.events_recent';
const REFRESH_ON = [
  'verifactu.record.created',
  'verifactu.record.transmitted',
  'verifactu.contingency.processed',
] as const;

/** Dot colour of the severities that deserve one; the rest keep the timeline's neutral dot. */
const SEVERITY_COLOR: Record<string, string> = { warning: 'warning', error: 'danger', critical: 'danger' };

interface WidgetClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  locale: string;
  timezone?: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

interface RecentEvent {
  id: string;
  event_type: string;
  severity: string;
  message: string;
  details: string;
  timestamp: string;
}

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  time: string;
  color?: string;
}

export class ErpVerifactuEventsWidget extends LitElement {
  static styles = css`
    :host { display: block; }
    .loading { display: flex; align-items: center; gap: .5rem; opacity: .6; }
  `;

  /** Handed by the shell (`client.forModule('verifactu')`). */
  @property({ attribute: false }) client?: WidgetClient;

  @state() private rows: RecentEvent[] | null = null;
  @state() private failed = false;

  private unsubs: Array<() => void> = [];
  private readonly onLocaleChange = (): void => this.requestUpdate();

  private api(): WidgetClient {
    const c = this.client ?? (globalThis as { erplora?: WidgetClient }).erplora;
    if (!c) throw new Error('erplora SDK not initialised by the shell');
    return c;
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    const client = this.api();
    this.unsubs = REFRESH_ON.map((event) => client.on(event, () => void this.load()));
    void this.load();
  }

  disconnectedCallback(): void {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    super.disconnectedCallback();
  }

  private async load(): Promise<void> {
    try {
      const rows = await this.api().query<RecentEvent[]>(QUERY);
      this.rows = Array.isArray(rows) ? rows : [];
      this.failed = false;
    } catch {
      // A failed refresh never leaves the previous list passing for fresh.
      this.rows = null;
      this.failed = true;
    }
  }

  private items(rows: RecentEvent[]): TimelineItem[] {
    const client = this.api();
    const translate: Translate = (catalog, key, params) => client.t(catalog, key, params);
    return rows.map((r) => ({
      id: String(r.id),
      title: eventTypeLabel(CATALOG, client.locale, translate, r.event_type),
      description: eventMessage(CATALOG, client.locale, translate, { message: String(r.message ?? ''), details: r.details }),
      time: formatEventTime(r.timestamp, { locale: client.locale, timezone: client.timezone ?? '' }),
      color: SEVERITY_COLOR[r.severity],
    }));
  }

  render() {
    const t = (k: string): string => this.api().t(CATALOG, k);
    if (this.failed) {
      return html`<ok-empty-state icon="alert-circle-outline" .message=${t('ui.eventsWidgetError')}></ok-empty-state>`;
    }
    if (this.rows === null) {
      return html`<div class="loading"><ion-spinner name="crescent"></ion-spinner><span>${t('ui.loading')}</span></div>`;
    }
    if (this.rows.length === 0) {
      return html`<ok-empty-state icon="file-tray-outline" .message=${t('ui.eventsEmpty')}></ok-empty-state>`;
    }
    return html`<ok-timeline align="left" .items=${this.items(this.rows)}></ok-timeline>`;
  }
}

define('erp-verifactu-events-widget', ErpVerifactuEventsWidget);
