import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

interface VerifactuRecord {
  id: string;
  sequence_number: number;
  invoice_number: string;
  invoice_date: string;
  record_type: string;
  invoice_type: string;
  issuer_nif: string;
  issuer_name: string;
  total_amount: string;
  status: string;
  retry_count: number;
  aeat_csv: string;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

// Estado del registro → color de badge Ionic. Los fallos de envío a la AEAT se ven a simple vista:
// rechazado/error = danger, pendiente/reintento = warning/medium (mismo patrón que STATUS_COLOR del módulo invoice).
const STATUS_COLOR: Record<string, string> = {
  pending: 'warning',
  retry: 'warning',
  transmitted: 'primary',
  accepted: 'success',
  rejected: 'danger',
  error: 'danger',
};

export class ErpVerifactuRecords extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .err { color:#d9480f; font-weight:600; }
  `;

  @state() tick = 0;

  private ctrl!: ListController<VerifactuRecord>;

  private unsub?: () => void;

  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const statusLabels: Record<string, string> = {
      pending: t('ui.statusPending'),
      transmitted: t('ui.statusTransmitted'),
      accepted: t('ui.statusAccepted'),
      rejected: t('ui.statusRejected'),
      error: t('ui.statusError'),
      retry: t('ui.statusRetry'),
    };
    return [
    { key: 'sequence_number', header: t('ui.colSeq'), align: 'right', sortable: true, filterable: true, filterType: 'text' },
    { key: 'invoice_number', header: t('ui.colInvoice'), sortable: true, filterable: true, filterType: 'text' },
    { key: 'invoice_date', header: t('ui.colDate'), sortable: true, filterable: true, filterType: 'daterange' },
    {
      key: 'record_type',
      header: t('ui.colType'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'alta', label: t('ui.recTypeAlta') },
        { value: 'anulacion', label: t('ui.recTypeAnulacion') },
      ],
    },
    { key: 'invoice_type', header: t('ui.colInvoiceType'), sortable: true, filterable: true, filterType: 'text' },
    { key: 'issuer_name', header: t('ui.colIssuer'), sortable: true, filterable: true, filterType: 'text' },
    {
      key: 'total_amount',
      header: t('ui.colTotal'),
      align: 'right',
      sortable: true,
      filterable: true,
      filterType: 'range',
      format: (r) => Number(r.total_amount).toFixed(2),
    },
    {
      key: 'status',
      header: t('ui.colStatus'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: [
        { value: 'pending', label: t('ui.statusPending') },
        { value: 'transmitted', label: t('ui.statusTransmitted') },
        { value: 'accepted', label: t('ui.statusAccepted') },
        { value: 'rejected', label: t('ui.statusRejected') },
        { value: 'error', label: t('ui.statusError') },
        { value: 'retry', label: t('ui.statusRetry') },
      ],
      render: (r) => {
        const s = r.status as string;
        return html`<ion-badge color=${STATUS_COLOR[s] ?? 'medium'}>${statusLabels[s] ?? s}</ion-badge>`;
      },
    },
    ];
  }

  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    this.ctrl = createListController<VerifactuRecord>(erplora(), 'verifactu.records.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'id',
      dir: 'asc',
    });
    await this.ctrl.load();
    try {
      const off1 = erplora().on('verifactu.record.created', () => this.ctrl.load());
      const off2 = erplora().on('verifactu.record.transmitted', () => this.ctrl.load());
      this.unsub = () => {
        off1();
        off2();
      };
    } catch {
      /* sin SDK (preview) → sin reactividad en vivo */
    }
  }

  disconnectedCallback() {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
    this.unsub?.();
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<div>
        <header>
          <h2>${t('ui.recordsTitle')}</h2>
        </header>
        ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
        <ok-data-table .serverSide=${true} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.recordsSearchPlaceholder')} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.recordsEmpty')} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
      </div>`;
  }
}

define('erp-verifactu-records', ErpVerifactuRecords);
