import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-status-pill';
import '@erplora/outfitkit/ok-inline-feedback';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface ErploraClientLike {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

interface VerifactuConfig {
  id?: string;
  enabled?: boolean;
  mode?: string;
  environment?: string;
  software_name?: string;
  software_version?: string;
  software_id?: string;
  software_nif?: string;
  issuer_nif?: string;
  issuer_name?: string;
  certificate_path?: string;
  certificate_expiry?: string;
  has_certificate?: number;
  has_password?: number;
  auto_transmit?: boolean;
  retry_interval_minutes?: number;
  max_retries?: number;
}

interface AeatResult {
  ok?: boolean;
  estado_envio?: string;
  estado_registro?: string;
  csv?: string;
  codigo_error?: string;
  descripcion_error?: string;
  error?: string;
}

interface Diagnostic {
  cert_ok?: boolean;
  cert_message?: string;
  issuer_nif?: string;
  invoice_type?: string;
  recipient_nif?: string;
  environment?: string;
  sample_number?: string;
  huella?: string;
  qr_url?: string;
  aeat?: AeatResult | null;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

const GREEN = '--track-background-checked: rgba(var(--ion-color-success-rgb, 45,211,111), 0.5); --handle-background-checked: var(--ion-color-success, #2dd36f);';

// Identificación del PRODUCTOR del software (fija, la misma para todos los hubs): es ERPlora
// como fabricante, lo que se declara a la AEAT en el bloque SistemaInformatico de cada registro.
// No es configurable por el cliente → no son inputs; se muestran tras un icono ⓘ.
const PRODUCER = {
  // IdSistemaInformatico: la AEAT lo limita a 2 caracteres (validación del XSD VeriFactu).
  software_id: 'EC',
  software_version: '1.0.0',
  software_nif: 'B27593136',
  software_name: 'ERPLORA CLOUD SL',
};

export class ErpVerifactuSettings extends LitElement {
  static styles = css`
    :host { display:block; height:100%; overflow:auto; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    h2 { font-size:1.1rem; margin:0 0 .75rem; }
    h3 { font-size:1rem; margin:0 0 .35rem; }
    .cols { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:1rem; align-items:start; }
    @media (max-width: 980px) { .cols { grid-template-columns:1fr; } }
    .card { background: var(--ion-card-background, #fff); border:1px solid var(--ion-border-color, #e6e2d8); border-radius:12px; overflow:hidden; }
    .card-actions { display:flex; justify-content:flex-end; padding:.75rem 1rem; }
    .test-body { display:flex; flex-direction:column; gap:.7rem; padding:1rem 1.1rem 1.2rem; }
    .test-actions { display:flex; gap:.5rem; flex-wrap:wrap; }
    .cert { display:flex; flex-direction:column; gap:.4rem; width:100%; padding:.25rem 0; }
    .cert-head { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; }
    .cert-head ion-label { margin:0; }
    .hint { font-size:.78rem; color: var(--ion-color-medium, #6b7280); margin:0; }
    .kv { display:flex; flex-direction:column; gap:.15rem; }
    .kv .k { font-size:.75rem; color: var(--ion-color-medium, #6b7280); }
    .kv code { font-family: ui-monospace, monospace; font-size:.8rem; word-break:break-all; }
    .link { color: var(--ion-color-primary, #3880ff); font-weight:600; text-decoration:none; }
    .prod { display:flex; flex-direction:column; gap:.5rem; width:100%; padding:.25rem 0; }
    .prod-head { display:flex; gap:.35rem; align-items:center; }
    .prod-head .t { font-size:.9rem; }
    .prod-head ion-button { --padding-start:.35rem; --padding-end:.35rem; --color: var(--ion-color-primary, #3880ff); margin:0; height:1.6rem; font-size:1.25rem; font-weight:700; }
    .info { display:flex; flex-direction:column; gap:.45rem; padding:.5rem .75rem; border-radius:8px; background: var(--ion-color-light, #f4f5f8); }
    ok-inline-feedback { display:block; }
  `;

  @state() cfg: VerifactuConfig = {};

  @state() loading = true;

  @state() saving = false;

  @state() error = '';

  @state() saved = false;

  @state() diag: Diagnostic | null = null;

  @state() testing = false;

  @state() testType = 'F2';

  @state() showProducer = false;

  @state() private creatingInvoice = false;

  @state() private invoiceCreated = false;

  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    await this.refresh();
    await this.loadDiag();
  }

  disconnectedCallback() {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
  }

  private async refresh() {
    this.loading = true;
    this.error = '';
    try {
      // config.get es una query plana → ARRAY de filas; desempaquetamos la 1ª.
      const rows = await erplora().query<VerifactuConfig[] | VerifactuConfig | null>('verifactu.config.get');
      const c = Array.isArray(rows) ? rows[0] : rows;
      this.cfg = c ?? {};
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errLoadConfig');
    } finally {
      this.loading = false;
    }
  }

  private async loadDiag() {
    try {
      const rows = await erplora().query<Array<{ details?: string }> | { details?: string } | null>('verifactu.diagnostics.last');
      const row = Array.isArray(rows) ? rows[0] : rows;
      this.diag = row?.details ? (JSON.parse(row.details) as Diagnostic) : null;
    } catch {
      this.diag = null;
    }
  }

  private set<K extends keyof VerifactuConfig>(key: K, value: VerifactuConfig[K]) {
    this.cfg = { ...this.cfg, [key]: value };
    this.saved = false;
  }

  private async save(ev: Event) {
    ev.preventDefault();
    this.saving = true;
    this.error = '';
    this.saved = false;
    try {
      await erplora().command('verifactu.config.save', {
        enabled: !!this.cfg.enabled,
        mode: this.cfg.mode || 'verifactu',
        environment: this.cfg.environment || 'testing',
        // Identificación del productor: SIEMPRE fija (no editable por el cliente).
        software_name: PRODUCER.software_name,
        software_version: PRODUCER.software_version,
        software_id: PRODUCER.software_id,
        software_nif: PRODUCER.software_nif,
        // Obligado tributario (emisor) — editable por el cliente.
        issuer_nif: (this.cfg.issuer_nif || '').trim().toUpperCase(),
        issuer_name: this.cfg.issuer_name || '',
        // El certificado fiscal ya NO se gestiona aquí: se sube en Ajustes → Negocio (core,
        // `_hub_certificate`, ADR-0081) y el host lo superpone en firma. Este formulario solo
        // configura los parámetros VeriFactu (entorno, emisor, auto-transmisión).
        auto_transmit: this.cfg.auto_transmit !== false,
        retry_interval_minutes: Number(this.cfg.retry_interval_minutes) || 5,
        max_retries: Number(this.cfg.max_retries) || 10,
      });
      this.saved = true;
      await this.refresh();
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errSaveConfig');
    } finally {
      this.saving = false;
    }
  }

  private async runTest() {
    this.testing = true;
    this.error = '';
    try {
      await erplora().command('verifactu.diagnostics.run', { invoice_type: this.testType });
      await this.loadDiag();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'No se pudo ejecutar la prueba';
    } finally {
      this.testing = false;
    }
  }

  /**
   * Crea una factura de prueba (tiquet F2) vía el comando cross-módulo `invoice.create`.
   * F2 NO necesita el bloque Destinatarios → evita el error AEAT 1189. El Hub auto-transmite
   * al crearla (auto_transmit), así que se envía sola a la AEAT y aparece en /m/invoice.
   * GUARDA: solo en entorno de pruebas y con NIF del emisor configurado.
   */
  private async createTestInvoice() {
    this.creatingInvoice = true;
    this.invoiceCreated = false;
    this.error = '';
    try {
      // NO pasamos issuer_nif/issuer_name: el emisor (obligado tributario) lo resuelve el runtime
      // desde la identidad fiscal GLOBAL del hub (/settings → hub_settings), fuente única. Así la
      // prueba usa el mismo NIF que las ventas reales, sin depender de la config de VeriFactu.
      await erplora().command('invoice.create', {
        series_code: 'TICKET',
        invoice_type: 'F2',
        source_type: 'test',
        notes: 'Prueba VeriFactu',
        items: [{ description: 'Factura de PRUEBA VeriFactu (entorno de pruebas)', quantity: 1, unit_price: 100, tax_rate: 21, product_id: null }],
      });
      this.invoiceCreated = true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'No se pudo crear la factura de prueba';
    } finally {
      this.creatingInvoice = false;
    }
  }

  /** Días que faltan para la caducidad del certificado (negativo si ya caducó). */
  private daysRemaining(iso?: string): number | null {
    if (!iso) return null;
    const exp = new Date(`${iso}T23:59:59`);
    if (Number.isNaN(exp.getTime())) return null;
    return Math.ceil((exp.getTime() - Date.now()) / 86400000);
  }

  /** ISO `YYYY-MM-DD` → `DD/MM/YYYY` para mostrar. */
  private fmtDate(iso?: string): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return d && m && y ? `${d}/${m}/${y}` : iso;
  }

  private renderCertStatus(t: (k: string) => string) {
    const days = this.daysRemaining(this.cfg.certificate_expiry);
    if (days === null) return nothing;
    if (days <= 0) {
      return html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${t('ui.certExpired')}</ok-inline-feedback>`;
    }
    const tone = days <= 60 ? 'warning' : 'success';
    return html`<ok-status-pill dot tone=${tone} label=${`${days} ${t('ui.certDaysRemaining')}`}></ok-status-pill>`;
  }

  private renderAeat(t: (k: string) => string) {
    const a = this.diag?.aeat;
    if (!a) {
      return html`<ok-inline-feedback tone="neutral" icon="information-circle-outline">${t('ui.testAeatNotSent')}</ok-inline-feedback>`;
    }
    if (a.error) {
      return html`<ok-inline-feedback tone="danger" heading=${t('ui.testAeatError')} icon="alert-circle-outline">${a.error}</ok-inline-feedback>`;
    }
    if (a.ok) {
      const csv = a.csv ? ` · CSV ${a.csv}` : '';
      return html`<ok-inline-feedback tone="success" heading=${t('ui.testAeatAccepted')} icon="checkmark-circle-outline">${a.estado_registro || a.estado_envio || ''}${csv}</ok-inline-feedback>`;
    }
    return html`<ok-inline-feedback tone="danger" heading=${a.estado_registro || a.estado_envio || '—'} icon="alert-circle-outline">${[a.codigo_error, a.descripcion_error].filter(Boolean).join(': ')}</ok-inline-feedback>`;
  }

  private renderTestCard(t: (k: string) => string) {
    const d = this.diag;
    const isTesting = this.cfg.environment === 'testing';
    const hasIssuer = !!(this.cfg.issuer_nif || '').trim();
    const canCreateInvoice = isTesting && hasIssuer;
    return html`<div class="card">
      <div class="test-body">
        <h3>${t('ui.testTitle')}</h3>
        <p class="hint">${t('ui.testHint')}</p>
        <ion-item lines="none">
          <ion-select label=${t('ui.testType')} label-placement="stacked" .value=${this.testType} @ionChange=${(e: any) => { this.testType = e.target.value; }}>
            <ion-select-option value="F2">${t('ui.testTypeTicket')}</ion-select-option>
            <ion-select-option value="F1">${t('ui.testTypeInvoice')}</ion-select-option>
          </ion-select>
        </ion-item>
        <div class="test-actions">
          <ion-button @click=${() => this.runTest()} ?disabled=${this.testing || !this.cfg.has_certificate}>${this.testing ? t('ui.testRunning') : t('ui.testRun')}</ion-button>
          <ion-button fill="outline" @click=${() => this.createTestInvoice()} ?disabled=${this.creatingInvoice || !canCreateInvoice}>${this.creatingInvoice ? t('ui.testCreateInvoiceRunning') : t('ui.testCreateInvoice')}</ion-button>
        </div>
        ${!isTesting ? html`<p class="hint">${t('ui.testInvoiceTestingOnly')}</p>` : nothing}
        ${this.invoiceCreated ? html`<ok-inline-feedback tone="success" icon="checkmark-circle-outline">${t('ui.testInvoiceCreated')}</ok-inline-feedback>` : nothing}
        ${!this.cfg.has_certificate ? html`<p class="hint">${t('ui.certNotConfigured')} — ${t('ui.certManagedInBusiness')}</p>` : nothing}
        ${d
          ? html`
              <ok-inline-feedback tone=${d.cert_ok ? 'success' : 'danger'} heading=${t('ui.testCert')} icon="ribbon-outline">${d.cert_message ?? ''}</ok-inline-feedback>
              <div class="kv"><span class="k">${t('ui.testEnv')}</span><code>${d.environment ?? ''}</code></div>
              <div class="kv"><span class="k">${t('ui.testHuella')}</span><code>${d.huella ?? ''}</code></div>
              <div class="kv">
                <span class="k">${t('ui.testAeatLink')}</span>
                ${d.qr_url ? html`<a class="link" href=${d.qr_url} target="_blank" rel="noopener noreferrer">${t('ui.testAeatLinkGo')}</a>` : nothing}
              </div>
              <div class="kv"><span class="k">${t('ui.testAeatResp')}</span>${this.renderAeat(t)}</div>
            `
          : html`<p class="hint">${t('ui.testNoRun')}</p>`}
      </div>
    </div>`;
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`
      <h2>${t('ui.settingsTitle')}</h2>
      ${this.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : nothing}
      ${this.saved ? html`<ok-inline-feedback tone="success" icon="checkmark-circle-outline">${t('ui.settingsSaved')}</ok-inline-feedback>` : nothing}
      <div class="cols">
        <form class="card" @submit=${(e: Event) => this.save(e)}>
          <ion-list>
            <ion-item>
              <ion-toggle style=${GREEN} ?checked=${!!this.cfg.enabled} @ionChange=${(e: any) => this.set('enabled', e.target.checked)}>${t('ui.enableVerifactu')}</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-select label=${t('ui.envAeat')} label-placement="stacked" .value=${this.cfg.environment || 'testing'} @ionChange=${(e: any) => this.set('environment', e.target.value)}>
                <ion-select-option value="testing">${t('ui.envTesting')}</ion-select-option>
                <ion-select-option value="production">${t('ui.envProduction')}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input label=${t('ui.obligadoNif')} label-placement="stacked" .value=${this.cfg.issuer_nif || ''} readonly></ion-input>
            </ion-item>
            <ion-item>
              <ion-input label=${t('ui.obligadoName')} label-placement="stacked" .value=${this.cfg.issuer_name || ''} readonly></ion-input>
            </ion-item>
            <ion-item lines="none">
              <p class="hint">${t('ui.obligadoFromBusiness')}</p>
            </ion-item>
            <ion-item>
              <div class="prod">
                <div class="prod-head">
                  <span class="t">${t('ui.producerTitle')}</span>
                  <ion-button fill="clear" size="small" aria-label=${t('ui.producerInfo')} @click=${() => { this.showProducer = !this.showProducer; }}>ⓘ</ion-button>
                </div>
                ${this.showProducer
                  ? html`<div class="info">
                      <p class="hint">${t('ui.producerInfo')}</p>
                      <div class="kv"><span class="k">${t('ui.softwareId')}</span><code>${PRODUCER.software_id}</code></div>
                      <div class="kv"><span class="k">${t('ui.softwareVersion')}</span><code>${PRODUCER.software_version}</code></div>
                      <div class="kv"><span class="k">${t('ui.producerNif')}</span><code>${PRODUCER.software_nif}</code></div>
                      <div class="kv"><span class="k">${t('ui.producerName')}</span><code>${PRODUCER.software_name}</code></div>
                    </div>`
                  : nothing}
              </div>
            </ion-item>
            <ion-item lines="none">
              <div class="cert">
                <div class="cert-head">
                  <ion-label>${t('ui.certPkcs12')}</ion-label>
                  <ok-status-pill dot tone=${this.cfg.has_certificate ? 'success' : 'neutral'} label=${this.cfg.has_certificate ? t('ui.certLoaded') : t('ui.certNotConfigured')}></ok-status-pill>
                </div>
                <p class="hint">${t('ui.certManagedInBusiness')}</p>
              </div>
            </ion-item>
            ${this.cfg.has_certificate
              ? html`<ion-item lines="none">
                  <div class="cert">
                    <div class="cert-head">
                      <span class="k">${t('ui.certExpiry')}</span>
                      <code>${this.fmtDate(this.cfg.certificate_expiry)}</code>
                      ${this.renderCertStatus(t)}
                    </div>
                    <p class="hint">${t('ui.certExpiryHint')}</p>
                  </div>
                </ion-item>`
              : nothing}
            <ion-item lines="none">
              <ion-toggle style=${GREEN} ?checked=${this.cfg.auto_transmit !== false} @ionChange=${(e: any) => this.set('auto_transmit', e.target.checked)}>${t('ui.autoTransmit')}</ion-toggle>
            </ion-item>
          </ion-list>
          <div class="card-actions">
            <ion-button type="submit" ?disabled=${this.saving || this.loading}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
          </div>
        </form>

        ${this.renderTestCard(t)}
      </div>
    `;
  }
}

define('erp-verifactu-settings', ErpVerifactuSettings);
