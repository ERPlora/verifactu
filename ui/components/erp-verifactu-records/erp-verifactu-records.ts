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
import { eventMessage, type EventRow } from '../../lib/event-message';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
  /** Money (ADR-0123): takes the INTEGER in the minor unit; currency and scale of the hub. */
  formatMoney(minor: number): string;
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
  /** Cents (INTEGER, ADR-0123). */
  total_amount: number;
  status: string;
  retry_count: number;
  aeat_csv: string;
}

/**
 * The full row `verifactu.records.get` returns — one field per column of `record_get.sql`
 * (verifactu#86's contract test keeps the two lists in lockstep). Kept apart from
 * `VerifactuRecord`: the list only carries what its columns render, the detail carries
 * everything a support call may need to read off one record.
 */
interface VerifactuRecordDetail {
  id: string;
  sequence_number: number;
  invoice_number: string;
  invoice_date: string;
  invoice_type: string;
  record_type: string;
  issuer_nif: string;
  issuer_name: string;
  description: string;
  /** Amounts in cents (INTEGER, ADR-0123); `tax_rate` is a percentage. */
  base_amount: number;
  tax_rate: string;
  tax_amount: number;
  total_amount: number;
  record_hash: string;
  previous_hash: string;
  is_first_record: number;
  generation_timestamp: string;
  status: string;
  transmission_timestamp: string;
  retry_count: number;
  next_retry_at: string;
  aeat_response_code: string;
  aeat_response_message: string;
  aeat_csv: string;
  qr_url: string;
  xml_storage_path: string;
  /** Digest of the bytes that travelled, stamped once at transmission (migration 016). */
  xml_sha256: string;
  /** The `Idempotency-Key` the fiscal cell indexes by — NOT always `id` (verifactu#86). */
  transmission_id: string;
}

/**
 * Why a record that is not at the AEAT yet waits, and when it goes out on its own (verifactu#111).
 * Both already in the reader's language. `'loading'` while the two lookups are on their way.
 */
interface WaitingNote {
  why: string;
  when: string;
}

/** The statuses of a record that has not reached the AEAT and will go out on its own. */
const ON_ITS_WAY = new Set(['pending', 'error', 'retry']);

/**
 * The audit rows that say why a record did not go out: the deferral the engine files when a sale
 * leaves without a road or behind an older record, and a failed attempt. `record_created` is
 * written in the same instant as a deferral, so it is excluded by type, not by time.
 */
const REASON_EVENTS = new Set(['transmission_deferred', 'transmission_failure']);

/** Queue entries that still have an attempt ahead (`failed`/`cancelled` do not). */
const QUEUED = new Set(['pending', 'retrying']);

/**
 * `2026-09-19T10:20:00+02:00` → `2026-09-19 10:20`: the wall clock the hub wrote, without seconds
 * or offset. No timezone conversion on purpose — the time is the hub's, whatever the reader's.
 */
function wallClock(iso: string): string {
  return iso.length >= 16 ? iso.slice(0, 16).replace('T', ' ') : iso;
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
    ok-inline-feedback { display:block; margin-bottom:.75rem; }
    ok-inline-feedback ion-button { min-height:44px; }
    dl.grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:.75rem 1.5rem; margin:0 0 1rem; }
    dl.grid dt { font-size:.75rem; text-transform:uppercase; letter-spacing:.02em; color: var(--ion-color-medium, #6b6b6b); margin:0; }
    dl.grid dd { margin:.15rem 0 0; }
    section.fingerprint { border:1px solid var(--ion-color-light-shade, #e0e0e0); border-radius:8px; padding:.75rem 1rem; margin-bottom:1rem; }
    section.fingerprint h3 { margin:0 0 .5rem; font-size:.95rem; }
    code { font-family: ui-monospace, monospace; font-size:.8rem; word-break: break-all; }
  `;

  @state() tick = 0;

  /**
   * How many invoices this hub has issued, or `null` while it is unknown — either not read yet or
   * not readable (a cashier without `invoice.view_invoice`). `null` is NOT zero: it is the state in
   * which this screen is not entitled to claim anything about the chain (verifactu#59).
   */
  @state() private invoiceTotal: number | null = null;

  @state() private invoiceCountFailed = false;

  /** Why the open record waits and when it leaves (verifactu#111); `null` = nothing to explain. */
  @state() private waiting: WaitingNote | 'loading' | null = null;

  /** The open detail, or `null` when the screen is showing the list (verifactu#86). */
  @state() private detail: VerifactuRecordDetail | null = null;

  /** Set while `detail` stays `null` — a failed lookup or a missing record, shown over the list. */
  @state() private detailError = '';

  /**
   * True from the row press until `records.get` answers, whichever way. Painted over the list so
   * the press is seen to do something — a silent press invites a second one, and a second
   * `records.get` for the same row (verifactu#86).
   */
  @state() private detailLoading = false;

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
      format: (r) => erplora().formatMoney(Number(r.total_amount)),
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
    await this.loadInvoiceTotal();
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

  /**
   * How many invoices exist, so an empty chain can be told apart from an empty business.
   *
   * Reuses `invoice.list` — the module is a hard `depends_on`, and its every row is stamped
   * `status: issued` by the command that emits `invoice.created`, which is the very event this
   * module listens to. So «rows in `invoice.list`» IS «invoices the chain was meant to seal», with
   * no draft state to filter out and no new query to add. Asked for one row: only `total` is used.
   */
  private async loadInvoiceTotal(): Promise<void> {
    try {
      const page = await erplora().queryPage<Record<string, unknown>>('invoice.list', {
        limit: 1,
        offset: 0,
      });
      this.invoiceTotal = typeof page?.total === 'number' ? page.total : null;
      this.invoiceCountFailed = this.invoiceTotal === null;
    } catch {
      // Denied (no `invoice.view_invoice`) or unavailable. Not fatal to this screen and NOT
      // silent: `invoiceCountFailed` paints a note saying the comparison could not be made, which
      // is the honest state — a false calm here is what verifactu#59 exists to remove.
      this.invoiceTotal = null;
      this.invoiceCountFailed = true;
    }
    this.requestUpdate();
  }

  /** Invoices were issued and NOTHING got sealed: an incident, not an empty screen. */
  private get chainNotSealing(): boolean {
    return !this.ctrl?.loading
      && (this.ctrl?.total ?? 0) === 0
      && this.invoiceTotal !== null
      && this.invoiceTotal > 0;
  }

  /** 0 records and 0 invoices: nothing has been sold yet, which is not a problem. */
  private get nothingInvoicedYet(): boolean {
    return (this.ctrl?.total ?? 0) === 0 && this.invoiceTotal === 0;
  }

  private emptyMessage(t: (k: string) => string): string {
    if (this.ctrl?.loading) return t('ui.loading');
    if (this.nothingInvoicedYet) return t('ui.recordsEmptyNoInvoices');
    return t('ui.recordsEmpty');
  }

  /** Deep-links into the hub shell, the same way the Settings screen does (verifactu#49). */
  private go(path: string): void {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  /**
   * Opens the detail of one record (verifactu#86) — the door `record.get` never had a screen
   * behind before this. Mirrors `invoice`'s `openDetail`: on failure or a missing row, `detail`
   * stays `null` (the list keeps rendering) and `detailError` carries what to say about it.
   */
  private async openDetail(id: string): Promise<void> {
    this.detailError = '';
    this.detailLoading = true;
    try {
      const t = (k: string): string => erplora().t(CATALOG, k);
      const row = await erplora().query<VerifactuRecordDetail[] | VerifactuRecordDetail>(
        'verifactu.records.get',
        { record_id: id },
      );
      const record = Array.isArray(row) ? row[0] : row;
      if (!record) {
        this.detailError = t('ui.errRecordNotFound');
        return;
      }
      this.detail = record;
      void this.explainWaiting(record);
    } catch (e) {
      this.detailError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errLoadDetail');
    } finally {
      this.detailLoading = false;
    }
  }

  private closeDetail(): void {
    this.detail = null;
    this.detailError = '';
    this.waiting = null;
  }

  /**
   * WHY a record is not at the AEAT yet and WHEN it goes out on its own (verifactu#111).
   *
   * The engine sends these records by itself — in sequence order, declared as late remissions —
   * so the screen offers no button: it says what is going on. WHY is the sentence of the record's
   * own reason row, composed from its code; WHEN is its next attempt if it sits in the contingency
   * queue, and otherwise the next automatic send (every 5 minutes, once the hub can file).
   *
   * Only for a record on its way: one the AEAT holds or refused has nothing to wait for, and is
   * not worth two queries.
   */
  private async explainWaiting(record: VerifactuRecordDetail): Promise<void> {
    this.waiting = null;
    if (!ON_ITS_WAY.has(record.status)) return;
    this.waiting = 'loading';
    const client = erplora();
    const t = (k: string, params?: Record<string, unknown>): string => client.t(CATALOG, k, params);
    const filters = { record_id: record.id };
    const [events, queue] = await Promise.allSettled([
      client.queryPage<EventRow & { event_type: string }>('verifactu.events.list', {
        filters,
        sort: 'timestamp',
        dir: 'desc',
        limit: 20,
        offset: 0,
      }),
      client.queryPage<{ status: string; next_attempt_at: string | null }>(
        'verifactu.contingency.list',
        { filters, limit: 1, offset: 0 },
      ),
    ]);
    let why: string;
    if (events.status === 'rejected') {
      why = t('ui.pendingWhyUnavailable');
    } else {
      const reason = events.value.rows.find((row) => REASON_EVENTS.has(row.event_type));
      why = reason
        ? eventMessage(CATALOG, client.locale, (c, k, p) => client.t(c, k, p), reason)
        : t('ui.pendingWhyUnknown');
    }
    const entry = queue.status === 'fulfilled'
      ? queue.value.rows.find((row) => QUEUED.has(row.status) && row.next_attempt_at)
      : undefined;
    const when = entry?.next_attempt_at
      ? t('ui.pendingWhenQueued', { at: wallClock(entry.next_attempt_at) })
      : t('ui.pendingWhenNextSend');
    // The user may have gone back, or opened another record, while the lookups ran.
    if (this.detail?.id !== record.id) return;
    this.waiting = { why, when };
  }

  private renderWaiting(t: (k: string) => string) {
    if (!this.waiting) return nothing;
    return html`<ok-inline-feedback
      data-test="waiting"
      tone="warning"
      icon="hourglass-outline"
      heading=${t('ui.pendingTitle')}
    >
      ${this.waiting === 'loading'
        ? html`<p>${t('ui.loading')}</p>`
        : html`<p data-test="waiting-why">${this.waiting.why}</p>
            <p data-test="waiting-when">${this.waiting.when}</p>`}
    </ok-inline-feedback>`;
  }

  /** A hash, truncated for a screen — the same 16-char convention `erp-verifactu-recovery` uses. */
  private static shortHash(hash: string): string {
    return hash ? `${hash.slice(0, 16)}…` : '—';
  }

  private renderDetail() {
    const t = (k: string, params?: Record<string, unknown>): string =>
      erplora().t(CATALOG, k, params);
    const d = this.detail!;
    const statusLabels: Record<string, string> = {
      pending: t('ui.statusPending'),
      transmitted: t('ui.statusTransmitted'),
      accepted: t('ui.statusAccepted'),
      rejected: t('ui.statusRejected'),
      error: t('ui.statusError'),
      retry: t('ui.statusRetry'),
    };
    const typeLabels: Record<string, string> = {
      alta: t('ui.recTypeAlta'),
      anulacion: t('ui.recTypeAnulacion'),
    };
    return html`<div>
      <header>
        <h2>${t('ui.detailTitle', { number: d.invoice_number })}</h2>
        <ion-badge color=${STATUS_COLOR[d.status] ?? 'medium'}>${statusLabels[d.status] ?? d.status}</ion-badge>
        <ion-button data-test="detail-back" fill="outline" color="medium" @click=${() => this.closeDetail()}>
          ← ${t('ui.back')}
        </ion-button>
      </header>
      ${this.renderWaiting(t)}
      <dl class="grid">
        <div><dt>${t('ui.colSeq')}</dt><dd>${d.sequence_number}</dd></div>
        <div><dt>${t('ui.colDate')}</dt><dd>${d.invoice_date}</dd></div>
        <div><dt>${t('ui.colType')}</dt><dd>${typeLabels[d.record_type] ?? d.record_type}</dd></div>
        <div><dt>${t('ui.colInvoiceType')}</dt><dd>${d.invoice_type}</dd></div>
        <div><dt>${t('ui.colIssuer')}</dt><dd>${d.issuer_name} (${d.issuer_nif})</dd></div>
        <div><dt>${t('ui.colTotal')}</dt><dd>${erplora().formatMoney(Number(d.total_amount))}</dd></div>
        <div><dt>${t('ui.fieldGeneratedAt')}</dt><dd>${d.generation_timestamp}</dd></div>
        <div><dt>${t('ui.fieldTransmittedAt')}</dt><dd>${d.transmission_timestamp || '—'}</dd></div>
      </dl>
      <section class="fingerprint">
        <h3>${t('ui.chainSectionTitle')}</h3>
        <dl class="grid">
          <div><dt>${t('ui.recColHuella')}</dt><dd><code>${ErpVerifactuRecords.shortHash(d.record_hash)}</code></dd></div>
          <div><dt>${t('ui.fieldPreviousHash')}</dt><dd><code>${ErpVerifactuRecords.shortHash(d.previous_hash)}</code></dd></div>
        </dl>
      </section>
      <section class="fingerprint">
        <h3>${t('ui.deliveryFingerprintTitle')}</h3>
        <dl class="grid">
          <div>
            <dt>${t('ui.fieldTransmissionId')}</dt>
            <dd data-test="fingerprint">${d.transmission_id ? html`<code>${d.transmission_id}</code>` : t('ui.fingerprintNotStamped')}</dd>
          </div>
          <div>
            <dt>${t('ui.fieldXmlSha256')}</dt>
            <dd data-test="fingerprint">${d.xml_sha256 ? html`<code>${d.xml_sha256}</code>` : t('ui.fingerprintNotStamped')}</dd>
          </div>
          <div><dt>${t('ui.fieldXmlStoragePath')}</dt><dd>${d.xml_storage_path || '—'}</dd></div>
        </dl>
      </section>
      <section class="fingerprint">
        <h3>${t('ui.aeatSectionTitle')}</h3>
        <dl class="grid">
          <div><dt>${t('ui.recColCsv')}</dt><dd>${d.aeat_csv || '—'}</dd></div>
          <div><dt>${t('ui.fieldAeatResponseCode')}</dt><dd>${d.aeat_response_code || '—'}</dd></div>
          <div><dt>${t('ui.fieldAeatResponseMessage')}</dt><dd>${d.aeat_response_message || '—'}</dd></div>
          <div><dt>${t('ui.fieldRetryCount')}</dt><dd>${d.retry_count}</dd></div>
          <div><dt>${t('ui.fieldNextRetryAt')}</dt><dd>${d.next_retry_at || '—'}</dd></div>
          ${d.qr_url ? html`<div><dt>${t('ui.fieldQrUrl')}</dt><dd><a href=${d.qr_url} target="_blank" rel="noopener">${t('ui.fieldQrUrlLink')}</a></dd></div>` : nothing}
        </dl>
      </section>
    </div>`;
  }

  render() {
    if (this.detail) return this.renderDetail();
    const t = (k: string, params?: Record<string, unknown>): string =>
      erplora().t(CATALOG, k, params);
    return html`<div>
        <header>
          <h2>${t('ui.recordsTitle')}</h2>
        </header>
        ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
        ${this.detailError
          ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.detailError}</ok-inline-feedback>`
          : nothing}
        ${this.detailLoading
          ? html`<ok-inline-feedback data-test="detail-loading" tone="neutral" icon="hourglass-outline">${t('ui.loading')}</ok-inline-feedback>`
          : nothing}
        <!-- verifactu#59: an empty chain over a hub that HAS invoiced is an incident — an
             ungranted certificate capability, or a listener that died (hub#1119 / ADR-0399).
             The plain empty state reassures exactly when it should alarm, so the two are told
             apart here and each one points at where the cause lives.
             (No backticks in here: inside a lit template literal they close the template.) -->
        ${this.chainNotSealing
          ? html`<ok-inline-feedback
              tone="danger"
              icon="alert-circle-outline"
              heading=${t('ui.recordsNotSealingTitle')}
            >
              ${t('ui.recordsNotSealing', { count: this.invoiceTotal })}
              <div slot="actions">
                <ion-button size="small" fill="outline" @click=${() => this.go('/settings#permissions')}>
                  ${t('ui.recordsNotSealingGrant')}
                </ion-button>
                <ion-button size="small" fill="outline" @click=${() => this.go('/system#events')}>
                  ${t('ui.recordsNotSealingEvents')}
                </ion-button>
              </div>
            </ok-inline-feedback>`
          : nothing}
        ${this.invoiceCountFailed && (this.ctrl?.total ?? 0) === 0
          ? html`<ok-inline-feedback tone="warning" icon="help-circle-outline">
              ${t('ui.recordsSealingUnknown')}
            </ok-inline-feedback>`
          : nothing}
        <!-- rowClickable opens the detail verifactu#86 adds: record.get had no screen behind it. -->
        <ok-data-table .serverSide=${true} .views=${true} .rowClickable=${true} .cardTitle=${(row: Record<string, unknown>) => String(row.invoice_number ?? row.sequence_number ?? '')} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.recordsSearchPlaceholder')} .emptyMessage=${this.emptyMessage(t)} @rowClick=${(e: CustomEvent<{ row: Record<string, unknown> }>) => this.openDetail(String(e.detail.row.id))} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
      </div>`;
  }
}

define('erp-verifactu-records', ErpVerifactuRecords);
