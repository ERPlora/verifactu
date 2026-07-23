import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import '@erplora/outfitkit/ok-inline-feedback';
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

interface AeatRecord {
  id: string;
  issuer_nif: string;
  invoice_number: string;
  invoice_date: string;
  record_type: string;
  record_hash: string;
  aeat_csv: string;
  estado: string;
  query_timestamp: string;
}

interface ChainStatus {
  event_type?: string;
  severity?: string;
  message?: string;
  timestamp?: string;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

const HEX64 = /^[0-9a-fA-F]{64}$/;

export class ErpVerifactuRecovery extends LitElement {
  static styles = css`
    :host { display:block; height:100%; overflow:auto; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    h2 { font-size:1.1rem; margin:0 0 .75rem; }
    h3 { font-size:.95rem; margin:1.4rem 0 .55rem; color: var(--ion-text-color, #1c1b18); }
    .card { background: var(--ion-card-background, #fff); border:1px solid var(--ion-border-color, #e6e2d8); border-radius: var(--ok-radius, 12px); overflow:hidden; max-width:40rem; }
    .toolbar { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; margin:.5rem 0; }
    .actions { display:flex; justify-content:flex-end; margin:.85rem 0; max-width:40rem; }
    ok-inline-feedback { display:block; margin-bottom:.5rem; max-width:40rem; }
  `;

  @state() nif = '';

  @state() status: ChainStatus | null = null;

  @state() manualHash = '';

  @state() manualInvoice = '';

  @state() manualDate = '';

  @state() busy = '';

  @state() error = '';

  @state() done = '';

  private ctrl!: ListController<AeatRecord>;

  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      { key: 'invoice_number', header: t('ui.colInvoice'), sortable: true, filterable: true, filterType: 'text' },
      { key: 'invoice_date', header: t('ui.colDate'), sortable: true, filterable: true, filterType: 'text' },
      {
        key: 'record_hash',
        header: t('ui.recColHuella'),
        sortable: true,
        format: (r) => (r.record_hash ? `${String(r.record_hash).slice(0, 16)}…` : ''),
      },
      { key: 'estado', header: t('ui.recColEstado'), sortable: true, filterable: true, filterType: 'text' },
      { key: 'aeat_csv', header: t('ui.recColCsv'), sortable: true },
      { key: 'query_timestamp', header: t('ui.colWhen'), sortable: true },
    ];
  }

  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    this.ctrl = createListController<AeatRecord>(erplora(), 'verifactu.aeat.records.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'query_timestamp',
      dir: 'desc',
    });
    await this.loadMeta();
    await this.ctrl.load();
  }

  disconnectedCallback() {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
  }

  /** NIF por defecto (config) + último estado de validación de la cadena. */
  private async loadMeta() {
    try {
      // config.get es una query plana → ARRAY de filas; desempaquetamos la 1ª.
      type Cfg = { issuer_nif?: string; software_nif?: string };
      const cfgRows = await erplora().query<Cfg[] | Cfg | null>('verifactu.config.get');
      const cfg = Array.isArray(cfgRows) ? cfgRows[0] : cfgRows;
      const nif = cfg?.issuer_nif || cfg?.software_nif;
      if (nif && !this.nif) this.nif = nif;
      const st = await erplora().query<ChainStatus[] | ChainStatus | null>('verifactu.chain.status');
      this.status = Array.isArray(st) ? (st[0] ?? null) : (st ?? null);
    } catch (e) {
      this.error = e instanceof Error ? e.message : '';
    }
  }

  private async run(action: string, fn: () => Promise<unknown>, errKey: string) {
    this.busy = action;
    this.error = '';
    this.done = '';
    try {
      await fn();
      this.done = erplora().t(CATALOG, 'ui.recDone');
      await this.loadMeta();
      await this.ctrl.load();
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, errKey);
    } finally {
      this.busy = '';
    }
  }

  private validate() {
    return this.run('validate', () => erplora().command('verifactu.chain.validate', { issuer_nif: this.nif }), 'ui.recErrValidate');
  }

  private consult() {
    return this.run('consult', () => erplora().command('verifactu.aeat.query_recent', { issuer_nif: this.nif }), 'ui.recErrConsult');
  }

  private recoverAeat() {
    return this.run('recoverAeat', () => erplora().command('verifactu.recovery.from_aeat', { issuer_nif: this.nif }), 'ui.recErrRecover');
  }

  private recoverManual() {
    const hash = this.manualHash.trim();
    if (!HEX64.test(hash)) {
      this.error = erplora().t(CATALOG, 'ui.recErrHash');
      return undefined;
    }
    return this.run('recoverManual', () => erplora().command('verifactu.recovery.manual', {
      issuer_nif: this.nif,
      record_hash: hash,
      invoice_number: this.manualInvoice || '',
      invoice_date: this.manualDate || '',
    }), 'ui.recErrRecover');
  }

  private statusTone(): string {
    if (!this.status?.event_type) return 'neutral';
    return this.status.event_type === 'chain_validated' ? 'success' : 'danger';
  }

  private statusLabel(t: (k: string) => string): string {
    if (!this.status?.event_type) return t('ui.recChainUnknown');
    return this.status.event_type === 'chain_validated' ? t('ui.recChainValid') : t('ui.recChainBroken');
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const blocked = this.busy !== '' || !this.nif;
    return html`
      <h2>${t('ui.recoveryTitle')}</h2>
      ${this.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : nothing}
      ${this.done ? html`<ok-inline-feedback tone="success" icon="checkmark-circle-outline">${this.done}</ok-inline-feedback>` : nothing}

      <div class="card">
        <ion-list>
          <ion-item lines="none">
            <ion-input label=${t('ui.recManualNif')} label-placement="stacked" .value=${this.nif} placeholder="B12345678" @ionInput=${(e: any) => { this.nif = e.target.value; }}></ion-input>
          </ion-item>
        </ion-list>
      </div>

      <h3>${t('ui.recChainStatus')}</h3>
      <ok-inline-feedback tone=${this.statusTone()} heading=${this.statusLabel(t)} icon="shield-checkmark-outline">${this.status?.message ?? ''}</ok-inline-feedback>
      <div class="toolbar">
        <ion-button size="small" ?disabled=${blocked} @click=${() => this.validate()}>${this.busy === 'validate' ? t('ui.recValidating') : t('ui.recValidate')}</ion-button>
        <ion-button size="small" fill="outline" ?disabled=${blocked} @click=${() => this.consult()}>${this.busy === 'consult' ? t('ui.recConsulting') : t('ui.recConsultAeat')}</ion-button>
        <ion-button size="small" fill="outline" color="warning" ?disabled=${blocked} @click=${() => this.recoverAeat()}>${this.busy === 'recoverAeat' ? t('ui.recRecovering') : t('ui.recRecoverFromAeat')}</ion-button>
      </div>

      <h3>${t('ui.recAeatTitle')}</h3>
      <ok-data-table
        .serverSide=${true}
        .columns=${this.columns}
        .rows=${this.ctrl?.rows ?? []}
        .total=${this.ctrl?.total ?? 0}
        .page=${this.ctrl?.state.page ?? 0}
        .pageSize=${this.ctrl?.state.pageSize ?? 50}
        .sort=${this.ctrl?.state.sort}
        .sortDir=${this.ctrl?.state.dir ?? 'desc'}
        .searchable=${true}
        .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.recAeatEmpty')}
        @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)}
        @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)}
        @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)}
        @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}
      ></ok-data-table>

      <h3>${t('ui.recManualTitle')}</h3>
      <ok-inline-feedback tone="info" icon="information-circle-outline">${t('ui.recManualHint')}</ok-inline-feedback>
      <div class="card">
        <ion-list>
          <ion-item>
            <ion-input label=${t('ui.recManualHash')} label-placement="stacked" .value=${this.manualHash} placeholder="A1B2…(64)" @ionInput=${(e: any) => { this.manualHash = e.target.value; }}></ion-input>
          </ion-item>
          <ion-item>
            <ion-input label=${t('ui.recManualInvoice')} label-placement="stacked" .value=${this.manualInvoice} placeholder="2024/001" @ionInput=${(e: any) => { this.manualInvoice = e.target.value; }}></ion-input>
          </ion-item>
          <ion-item lines="none">
            <ion-input label=${t('ui.recManualDate')} label-placement="stacked" .value=${this.manualDate} placeholder="2024-12-31" @ionInput=${(e: any) => { this.manualDate = e.target.value; }}></ion-input>
          </ion-item>
        </ion-list>
      </div>
      <div class="actions">
        <ion-button color="warning" ?disabled=${blocked} @click=${() => this.recoverManual()}>${this.busy === 'recoverManual' ? t('ui.recRecovering') : t('ui.recRecoverManual')}</ion-button>
      </div>
    `;
  }
}

define('erp-verifactu-recovery', ErpVerifactuRecovery);
