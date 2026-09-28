import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
import { eventMessage, type Translate } from '../../lib/event-message';
import { ENGINE_EVENT_TYPES, EVENT_SEVERITIES, eventTypeLabel, severityLabel } from '../../lib/event-labels';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

interface VerifactuEvent {
  id: string;
  record_id: string | null;
  event_type: string;
  severity: string;
  /** The engine's own Spanish prose. Kept as the fallback for keys this catalogue lacks. */
  message: string;
  /** `TEXT NOT NULL DEFAULT '{}'` — carries the stable `message_key` plus its params. */
  details: string;
  timestamp: string;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpVerifactuEvents extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .err { color:#d9480f; font-weight:600; }
  `;

  @state() tick = 0;

  private ctrl!: ListController<VerifactuEvent>;

  private get columns(): DataTableColumn[] {
    const client = erplora();
    const t = (k: string): string => client.t(CATALOG, k);
    const translate: Translate = (catalog, key, params) => client.t(catalog, key, params);
    return [
    { key: 'timestamp', header: t('ui.colWhen'), sortable: true, filterable: true, filterType: 'daterange' },
    {
      key: 'severity',
      header: t('ui.colSeverity'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: EVENT_SEVERITIES.map((code) => ({ value: code, label: severityLabel(CATALOG, client.locale, translate, code) })),
      // verifactu#134: the CELL says the word; the stored code, the sort and the `eq` filter stay
      // on the code. `format` and not `render`, for the same reason as the Message column below.
      format: (r) => severityLabel(CATALOG, client.locale, translate, r.severity),
    },
    {
      key: 'event_type',
      header: t('ui.colType'),
      sortable: true,
      filterable: true,
      // A select and not a text box: the list compares `event_type` with `eq`, so a typed word only
      // ever matched when the owner knew the internal code.
      filterType: 'select',
      options: ENGINE_EVENT_TYPES.map((code) => ({ value: code, label: eventTypeLabel(CATALOG, client.locale, translate, code) })),
      format: (r) => eventTypeLabel(CATALOG, client.locale, translate, r.event_type),
    },
    {
      key: 'message',
      header: t('ui.colMessage'),
      sortable: true,
      filterable: true,
      filterType: 'text',
      // verifactu#63: the sentence is built from `details.message_key` against this module's
      // catalogue, so the fiscal audit trail speaks the reader's language. `message` — Spanish
      // prose formatted by the engine — stays as the fallback for a key we do not know.
      //
      // `format` and not `render`: the table is `serverSide`, so sorting and filtering travel to
      // the query over the raw column and only the CELL changes. A `render` would also have to
      // return a template for something that is a sentence.
      format: (r) => eventMessage(CATALOG, client.locale, translate, {
        message: String(r.message ?? ''),
        details: r.details,
      }),
    },
    ];
  }

  /** The mobile card is titled by the event's type, in words — the Message says the rest. */
  private readonly cardTitle = (row: Record<string, unknown>): string => {
    const client = erplora();
    const translate: Translate = (catalog, key, params) => client.t(catalog, key, params);
    return row.event_type
      ? eventTypeLabel(CATALOG, client.locale, translate, row.event_type)
      : String(row.message ?? '');
  };

  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    this.ctrl = createListController<VerifactuEvent>(erplora(), 'verifactu.events.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'id',
      dir: 'asc',
    });
    await this.ctrl.load();
  }

  disconnectedCallback() {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<div>
        <header>
          <h2>${t('ui.eventsTitle')}</h2>
        </header>
        ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
        <ok-data-table .serverSide=${true} .views=${true} .cardTitle=${this.cardTitle} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.eventsSearchPlaceholder')} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.eventsEmpty')} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
      </div>`;
  }
}

define('erp-verifactu-events', ErpVerifactuEvents);
