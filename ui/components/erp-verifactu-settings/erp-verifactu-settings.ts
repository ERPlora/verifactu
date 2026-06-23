import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
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
  certificate_path?: string;
  auto_transmit?: boolean;
  retry_interval_minutes?: number;
  max_retries?: number;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpVerifactuSettings extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ink, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .form { display:flex; flex-direction:column; gap:.6rem; max-width:32rem; }
    .form ion-input, .form ion-select { --background:var(--surface-2,#f7f4ec); border:1px solid var(--line,#e7e2d6); border-radius:8px; }
    .row { display:flex; gap:.5rem; align-items:center; }
    label { font-size:.85rem; color:var(--muted,#8b897f); }
    .err { color:#d9480f; font-weight:600; }
    .ok { color:#2b8a3e; font-weight:600; }
  `;

  @state() cfg: VerifactuConfig = {};

  @state() loading = true;

  @state() saving = false;

  @state() error = '';

  @state() saved = false;

  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    await this.refresh();
  }

  disconnectedCallback() {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
  }

  private async refresh() {
    this.loading = true;
    this.error = '';
    try {
      const c = await erplora().query<VerifactuConfig | null>('verifactu.config.get');
      this.cfg = c ?? {};
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errLoadConfig');
    } finally {
      this.loading = false;
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
        software_name: this.cfg.software_name || 'ERPlora Hub',
        software_version: this.cfg.software_version || '1.0.0',
        software_id: this.cfg.software_id || 'ERPLORA-001',
        software_nif: this.cfg.software_nif || '',
        certificate_path: this.cfg.certificate_path || '',
        certificate_password: '',
        certificate_expiry: null,
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

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`<div>
        <header>
          <h2>${t('ui.settingsTitle')}</h2>
        </header>
        ${this.error ? html`<p class="err">${this.error}</p>` : nothing}
        ${this.saved ? html`<p class="ok">${t('ui.settingsSaved')}</p>` : nothing}
        <form class="form" @submit=${(e) => this.save(e)}>
          <div class="row">
            <ion-checkbox ?checked=${!!this.cfg.enabled} @ionChange=${(e: any) => this.set('enabled', e.target.checked)}></ion-checkbox>
            <label>${t('ui.enableVerifactu')}</label>
          </div>
          <label>${t('ui.envAeat')}</label>
          <ion-select .value=${this.cfg.environment || 'testing'} @ionChange=${(e: any) => this.set('environment', e.target.value)}>
            <ion-select-option value="testing">${t('ui.envTesting')}</ion-select-option>
            <ion-select-option value="production">${t('ui.envProduction')}</ion-select-option>
          </ion-select>
          <label>${t('ui.softwareNif')}</label>
          <ion-input .value=${this.cfg.software_nif || ''} placeholder="B12345678" @ionInput=${(e: any) => this.set('software_nif', e.target.value)}></ion-input>
          <label>${t('ui.softwareName')}</label>
          <ion-input .value=${this.cfg.software_name || ''} placeholder="ERPlora Hub" @ionInput=${(e: any) => this.set('software_name', e.target.value)}></ion-input>
          <label>${t('ui.softwareId')}</label>
          <ion-input .value=${this.cfg.software_id || ''} placeholder="ERPLORA-001" @ionInput=${(e: any) => this.set('software_id', e.target.value)}></ion-input>
          <label>${t('ui.softwareVersion')}</label>
          <ion-input .value=${this.cfg.software_version || ''} placeholder="1.0.0" @ionInput=${(e: any) => this.set('software_version', e.target.value)}></ion-input>
          <label>${t('ui.certificatePath')}</label>
          <ion-input .value=${this.cfg.certificate_path || ''} placeholder=${t('ui.certificatePathPlaceholder')} @ionInput=${(e: any) => this.set('certificate_path', e.target.value)}></ion-input>
          <div class="row">
            <ion-checkbox ?checked=${this.cfg.auto_transmit !== false} @ionChange=${(e: any) => this.set('auto_transmit', e.target.checked)}></ion-checkbox>
            <label>${t('ui.autoTransmit')}</label>
          </div>
          <ion-button type="submit" ?disabled=${this.saving || this.loading}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
        </form>
      </div>`;
  }
}

define('erp-verifactu-settings', ErpVerifactuSettings);
