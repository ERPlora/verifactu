import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';

interface ErploraClientLike {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
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
  async connectedCallback() {
    super.connectedCallback();
    await this.refresh();
  }

  private async refresh() {
    this.loading = true;
    this.error = '';
    try {
      const c = await erplora().query<VerifactuConfig | null>('verifactu.config.get');
      this.cfg = c ?? {};
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Error cargando la configuración';
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
      this.error = e instanceof Error ? e.message : 'No se pudo guardar la configuración';
    } finally {
      this.saving = false;
    }
  }

  render() {
    return html`<div>
        <header>
          <h2>Configuración VeriFactu</h2>
        </header>
        ${this.error ? html`<p class="err">${this.error}</p>` : nothing}
        ${this.saved ? html`<p class="ok">Configuración guardada correctamente.</p>` : nothing}
        <form class="form" @submit=${(e) => this.save(e)}>
          <div class="row">
            <ion-checkbox ?checked=${!!this.cfg.enabled} @ionChange=${(e: any) => this.set('enabled', e.target.checked)}></ion-checkbox>
            <label>Activar VeriFactu</label>
          </div>
          <label>Entorno AEAT</label>
          <ion-select .value=${this.cfg.environment || 'testing'} @ionChange=${(e: any) => this.set('environment', e.target.value)}>
            <ion-select-option value="testing">Pruebas (AEAT Test)</ion-select-option>
            <ion-select-option value="production">Producción</ion-select-option>
          </ion-select>
          <label>NIF del software / emisor</label>
          <ion-input .value=${this.cfg.software_nif || ''} placeholder="B12345678" @ionInput=${(e: any) => this.set('software_nif', e.target.value)}></ion-input>
          <label>Nombre del software</label>
          <ion-input .value=${this.cfg.software_name || ''} placeholder="ERPlora Hub" @ionInput=${(e: any) => this.set('software_name', e.target.value)}></ion-input>
          <label>ID del software</label>
          <ion-input .value=${this.cfg.software_id || ''} placeholder="ERPLORA-001" @ionInput=${(e: any) => this.set('software_id', e.target.value)}></ion-input>
          <label>Versión del software</label>
          <ion-input .value=${this.cfg.software_version || ''} placeholder="1.0.0" @ionInput=${(e: any) => this.set('software_version', e.target.value)}></ion-input>
          <label>Ruta del certificado (.p12)</label>
          <ion-input .value=${this.cfg.certificate_path || ''} placeholder="/ruta/al/certificado.p12" @ionInput=${(e: any) => this.set('certificate_path', e.target.value)}></ion-input>
          <div class="row">
            <ion-checkbox ?checked=${this.cfg.auto_transmit !== false} @ionChange=${(e: any) => this.set('auto_transmit', e.target.checked)}></ion-checkbox>
            <label>Transmisión automática a AEAT</label>
          </div>
          <ion-button type="submit" ?disabled=${this.saving || this.loading}>${this.saving ? 'Guardando…' : 'Guardar configuración'}</ion-button>
        </form>
      </div>`;
  }
}

define('erp-verifactu-settings', ErpVerifactuSettings);
