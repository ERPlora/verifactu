import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
}

interface ContingencyEntry {
  id: string;
  record_id: string;
  priority: number;
  queued_at: string;
  attempts: number;
  last_error: string;
  next_attempt_at: string | null;
  status: string;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpVerifactuContingency extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ink, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .err { color:#d9480f; font-weight:600; }
    .actions { display:flex; gap:.35rem; }
  `;

  @state() error = '';

  @state() busy = false;

  @state() tick = 0;

  private ctrl!: ListController<ContingencyEntry>;

  private unsub?: () => void;

  private columns: DataTableColumn[] = [
    { key: 'record_id', header: 'Registro', sortable: true, filterable: true, filterType: 'text' },
    { key: 'priority', header: 'Prioridad', align: 'right', sortable: true, filterable: true, filterType: 'text' },
    { key: 'attempts', header: 'Intentos', align: 'right', sortable: true, filterable: true, filterType: 'text' },
    { key: 'status', header: 'Estado', sortable: true, filterable: true, filterType: 'text' },
    {
      key: 'next_attempt_at',
      header: 'Próximo intento',
      sortable: true,
      filterable: true,
      filterType: 'daterange',
      format: (r) => (r.next_attempt_at as string) ?? '—',
    },
    {
      key: 'last_error',
      header: 'Último error',
      sortable: true,
      filterable: true,
      filterType: 'text',
      format: (r) => ((r.last_error as string) || '').slice(0, 80),
    },
  ];

  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
    this.ctrl = createListController<ContingencyEntry>(erplora(), 'verifactu.contingency.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'id',
      dir: 'asc',
    });
    await this.ctrl.load();
    try {
      const off1 = erplora().on('verifactu.contingency.retried', () => this.ctrl.load());
      const off2 = erplora().on('verifactu.contingency.cancelled', () => this.ctrl.load());
      const off3 = erplora().on('verifactu.contingency.processed', () => this.ctrl.load());
      this.unsub = () => {
        off1();
        off2();
        off3();
      };
    } catch {
      /* sin SDK (preview) */
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsub?.();
  }

  private async processQueue() {
    this.busy = true;
    this.error = '';
    try {
      await erplora().command('verifactu.contingency.process', { limit: 100 });
      await this.ctrl.load();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'No se pudo procesar la cola';
    } finally {
      this.busy = false;
    }
  }

  private async retry(queueId: string) {
    this.busy = true;
    this.error = '';
    try {
      await erplora().command('verifactu.contingency.retry', { queue_id: queueId });
      await this.ctrl.load();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'No se pudo reencolar';
    } finally {
      this.busy = false;
    }
  }

  private async cancel(queueId: string) {
    this.busy = true;
    this.error = '';
    try {
      await erplora().command('verifactu.contingency.cancel', { queue_id: queueId });
      await this.ctrl.load();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'No se pudo cancelar';
    } finally {
      this.busy = false;
    }
  }

  render() {
    return html`<div>
        <header>
          <h2>Cola de contingencia</h2>
          <ion-button size="small" ?disabled=${this.busy} @click=${() => this.processQueue()}>${this.busy ? 'Procesando…' : 'Procesar cola'}</ion-button>
        </header>
        ${this.error ? html`<p class="err">${this.error}</p>` : nothing}
        ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
        <ok-data-table .serverSide=${true} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${"Buscar registro o estado…"} .emptyMessage=${this.ctrl?.loading ? 'Cargando…' : 'Cola vacía.'} .actions=${[
            { id: 'retry', label: 'Reintentar' },
            { id: 'cancel', label: 'Cancelar', color: 'danger' },
          ]} @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => {
            const { actionId, row } = e.detail;
            if (actionId === 'retry') this.retry(row.id as string);
            else if (actionId === 'cancel') this.cancel(row.id as string);
          }} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
      </div>`;
  }
}

define('erp-verifactu-contingency', ErpVerifactuContingency);
