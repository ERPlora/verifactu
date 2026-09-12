import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-status-pill';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-dropzone';
import { coreFetch } from '../../lib/core-fetch';
import '../erp-verifactu-grant/erp-verifactu-grant';
import {
  GATEWAY_ENROL_PATH,
  GATEWAY_IDENTITY_PATH,
  type GatewayIdentityWire,
  type GatewayState,
  enrolOutcome,
  gatewayFetch,
  gatewayState,
  refusalKey as gatewayRefusalKey,
} from '../../lib/gateway-identity';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';

const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface ErploraClientLike {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

/**
 * Tope del `.p12`, en bytes. Un certificado de empresa pesa unos pocos KB; algo de megas no es un
 * certificado, y decirlo en la zona ahorra esperar a que el runtime lo rechace.
 */
const MAX_CERTIFICATE_BYTES = 1024 * 1024;

/** La puerta del core que custodia el `.p12`. La clave NUNCA sale de ahí (ADR-0081). */
const CERTIFICATE_PATH = '/api/business/certificate';

/** Los ajustes del hub, donde vive la identidad del negocio (ADR-0061). Cualquier sesión los lee. */
const SETTINGS_PATH = '/api/settings';

/** Las dos vías de ADR-0320 §1, con las palabras estables de `certificate::route_of`. */
const ROUTE_OWN = 'own';

/**
 * The pill and the sentence each state of the MACHINE identity earns (verifactu#76). Keyed by the
 * state {@link gatewayState} derives, so the table that decides and the table that paints cannot
 * drift apart.
 *
 * `action` is the ONE thing there is to ask for, or `null` when there is nothing: an identity that
 * works needs no button, and one whose door could not even be read must not be offered a shot in
 * the dark — pressing it would spend an allowance on a hub that is not answering.
 */
const GATEWAY_STATES: Record<GatewayState, { tone: string; label: string; hint: string; action: string | null }> = {
  unknown: { tone: 'neutral', label: 'ui.gwUnknown', hint: 'ui.gwUnknownHint', action: null },
  absent: { tone: 'warning', label: 'ui.gwAbsent', hint: 'ui.gwAbsentHint', action: 'ui.gwEnrol' },
  pending: { tone: 'warning', label: 'ui.gwPending', hint: 'ui.gwPendingHint', action: 'ui.gwCheck' },
  active: { tone: 'success', label: 'ui.gwActive', hint: 'ui.gatewayHint', action: null },
  expiring: { tone: 'warning', label: 'ui.gwExpiring', hint: 'ui.gwExpiringHint', action: 'ui.gwRenew' },
  expired: { tone: 'danger', label: 'ui.gwExpired', hint: 'ui.gwExpiredHint', action: 'ui.gwRenew' },
};

/**
 * Las dos pestañas SON las dos vías de ADR-0320 §1, que es como estaba antes en el core: o remite
 * ERPlora en tu nombre (y entonces lo que hay que hacer es firmar el otorgamiento) o remites tú
 * con tu certificado. La delegada abre porque es la que no pide nada y por la que empieza todo el
 * mundo — el mismo defecto que Holded: si no subes el tuyo, usa el suyo.
 */
const TABS = ['delegated', 'own'] as const;
type Tab = (typeof TABS)[number];

/** Lo que publica `GET /api/business/certificate`: presencia, sujeto y fecha. Nunca bytes. */
interface CertificateStatus {
  present?: boolean;
  subject?: string | null;
  uploaded_at?: string | null;
  transmission_route?: string;
}

/** Una fila de `hub.fiscal.transmission`: la palabra del CORE sobre qué vía lleva este hub. */
interface FiscalTransmission {
  transmission_route?: string;
  representation_status?: string;
  representation_at?: string;
}

/**
 * **Configuración de VeriFactu** — la credencial y el papeleo, separados de Ajustes.
 *
 * Ajustes son los interruptores que se tocan a menudo (activar, entorno, probar). Esto se toca una
 * vez en la vida del negocio, y por eso tiene pantalla propia: es el reparto de Odoo («activar» en
 * Ajustes, «gestionar certificados» en su propia vista) y el de Holded (Conformidad → subir
 * certificado).
 *
 * Dos pestañas, direccionables por hash para que el aviso de «todavía no puedes facturar» pueda
 * llevar a la que toca: `#certificate` y `#documents`.
 */
export class ErpVerifactuConfig extends LitElement {
  static styles = css`
    :host { display:block; height:100%; overflow:auto; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .wrap { padding: .75rem; display:flex; flex-direction:column; gap:.75rem; }
    .card { background: var(--ion-card-background, #fff); border:1px solid var(--ion-border-color, #e6e2d8); border-radius: var(--ok-radius, 12px); overflow:hidden; }
    .card-body { padding: .85rem; display:flex; flex-direction:column; gap:.6rem; }
    h2 { margin:0; font-size:1.05rem; }
    h3 { margin:0; font-size:.95rem; }
    .hint { font-size:.82rem; color: var(--ion-color-medium, #6b7280); margin:0; }
    .kv { display:flex; gap:.4rem; flex-wrap:wrap; align-items:baseline; }
    .kv .k { font-size:.75rem; color: var(--ion-color-medium, #6b7280); }
    .row { display:flex; align-items:center; justify-content:space-between; gap:.75rem; }
    .actions { display:flex; gap:.5rem; flex-wrap:wrap; }
    ion-button { min-height:44px; }
    ion-input, ion-select { min-height:44px; }
    ok-inline-feedback { display:block; }
    ok-dropzone { --ok-dropzone-max-width: 100%; }
    .cert { display:flex; flex-direction:column; gap:.4rem; width:100%; padding:.25rem 0; }
    .cert-head { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; }
    .cert-head ion-label { margin:0; }
  `;

  /** La pestaña abierta. Pública porque el shell y los tests la leen. */
  @state() tab: Tab = 'delegated';

  @state() private cert: CertificateStatus | null = null;

  @state() private transmission: FiscalTransmission | null = null;

  @state() private loading = true;

  /** El obligado tributario, resuelto por `config.get` desde la identidad fiscal del hub. */
  @state() private issuerNif = '';

  @state() private issuerName = '';

  /**
   * El domicilio fiscal del negocio, de Ajustes → Negocio (`GET /api/settings`). Es la fuente única
   * del hub, y el otorgamiento lo lee de aquí en vez de pedirlo otra vez.
   */
  @state() private business: { street: string; number: string; city: string } = {
    street: '',
    number: '',
    city: '',
  };

  /**
   * What the hub answered about its MACHINE identity (verifactu#76). `null` = we could not ask —
   * and then the section says so instead of guessing at a state.
   */
  @state() private gateway: GatewayIdentityWire | null = null;

  /** The identity read is in flight, so the pill says «checking» rather than «not available». */
  @state() private gatewayLoading = true;

  /** An enrolment is being asked for: the button is busy and cannot be pressed twice. */
  @state() private enrolling = false;

  /**
   * What the enrol door said last, already resolved to a sentence and a tone. `detail` is the
   * extra a person needs beside it, and `mono` says which of the two kinds it is: a reviewer's
   * own words (prose) or a machine code to quote to support (monospace).
   */
  @state() private gatewayNotice: { key: string; tone: string; detail: string; mono: boolean } | null = null;

  private readonly onPopState = (): void => this.serveHash();

  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    // 🔴 En CADA `popstate`, nunca «una vez»: el shell mantiene viva la vista del módulo y no la
    // remonta con la misma ruta, así que el segundo atajo llega a esta MISMA instancia solo como
    // `popstate` (flows#57). Una guarda de «ya servido» deja al usuario en la pestaña equivocada.
    window.addEventListener('popstate', this.onPopState);
    this.serveHash();
    await this.refresh();
  }

  disconnectedCallback() {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    window.removeEventListener('popstate', this.onPopState);
    super.disconnectedCallback();
  }

  /** Abre la pestaña que nombre el hash. Uno que no conocemos abre la primera, no un hueco. */
  private serveHash(): void {
    const hash = (globalThis.location?.hash ?? '').replace(/^#/, '');
    this.tab = (TABS as readonly string[]).includes(hash) ? (hash as Tab) : 'delegated';
  }

  /** Cambia de pestaña y lo escribe en la dirección, para que se pueda compartir y volver. */
  private goTab(tab: Tab): void {
    this.tab = tab;
    const { pathname, search } = globalThis.location;
    window.history.pushState({}, '', `${pathname}${search}#${tab}`);
  }

  /**
   * Lee el estado del certificado y la vía que dice el CORE.
   *
   * El interruptor sale de `route_of`, **nunca** de `has_certificate`: desde hub#1489 ese 0/1
   * responde «¿tiene este hub una VÍA?» y vale 1 en las dos, así que un negocio sin ningún
   * certificado leería que tiene el suyo.
   */
  private async refresh(): Promise<void> {
    this.loading = true;
    const [certReply, rows, cfgRows, settingsReply] = await Promise.all([
      coreFetch(CERTIFICATE_PATH),
      erplora()
        .query<FiscalTransmission[] | FiscalTransmission | null>('hub.fiscal.transmission')
        .catch(() => null),
      erplora()
        .query<Array<{ issuer_nif?: string; issuer_name?: string }>>('verifactu.config.get')
        .catch(() => []),
      coreFetch(SETTINGS_PATH),
    ]);
    // `GET /api/settings` contesta el objeto PLANO (no el sobre): es la puerta que el shell usa
    // desde siempre. Un fallo deja el domicilio vacío, y el otorgamiento lo dice y lleva a arreglarlo.
    const settings = settingsReply.ok ? settingsReply.body : {};
    const text = (v: unknown): string => (typeof v === 'string' ? v : '');
    this.business = {
      street: text(settings.business_street),
      number: text(settings.business_street_number),
      city: text(settings.business_city),
    };
    const cfg = Array.isArray(cfgRows) ? (cfgRows[0] ?? {}) : {};
    this.issuerNif = String(cfg.issuer_nif ?? '');
    this.issuerName = String(cfg.issuer_name ?? '');
    const envelope = certReply.body as { data?: CertificateStatus };
    this.cert = certReply.ok ? (envelope?.data ?? null) : null;
    this.transmission = Array.isArray(rows) ? (rows[0] ?? null) : rows;
    this.loading = false;
    // The road is settled by the line above, so this is a decision and not a race: on the `own`
    // road there is nothing to ask for, and the flag drops so no state keeps claiming a read that is
    // never going to happen (verifactu#82).
    if (this.usesGatewayIdentity) await this.loadGatewayIdentity();
    else this.gatewayLoading = false;
  }

  /** Los textos de la zona de subida en el idioma de quien mira (el componente trae inglés). */
  private dropzoneLabels(t: (k: string) => string) {
    return {
      title: t('ui.dropTitle'),
      browse: t('ui.dropBrowse'),
      errorType: t('ui.dropErrorType'),
      errorSize: t('ui.dropErrorSize'),
      removeLabel: t('ui.dropRemove'),
    };
  }

  /**
   * **Does the fiscal cell speak for this hub?** — ONE rule for the two places that ask it (the
   * read on open and the section itself), because a screen that fetches what it never paints is
   * how a pointless call to the core survives a review.
   *
   * The machine identity is what the cell presents when it files IN THE NAME of the business
   * (ADR-0320 §1 / ADR-0419); a hub holding its own `.p12` reaches the AEAT by itself and its
   * identity takes part in nothing, so showing it there is technical noise on a business screen.
   *
   * Hidden ONLY when the core has SAID `own`, never «shown only when it said `delegated`»: a
   * runtime that does not publish `hub.fiscal.transmission` can perfectly well be on the cell, and
   * hiding the section from it would take away its only way to enrol (verifactu#82).
   */
  private get usesGatewayIdentity(): boolean {
    return (this.transmission?.transmission_route ?? '').trim() !== ROUTE_OWN;
  }
  /**
   * Reads this hub's MACHINE identity from the core route (hub#1457).
   *
   * A failure lands in `gateway = null` and NOT in `this.error`: that slot belongs to the whole
   * screen, and a side read must not blank out the configuration the owner came here to change.
   * The section says «not available» in its own place, where a person can act on it.
   */
  private async loadGatewayIdentity() {
    this.gatewayLoading = true;
    const reply = await gatewayFetch(GATEWAY_IDENTITY_PATH, 'GET');
    this.gateway = reply.ok ? (reply.body as GatewayIdentityWire) : null;
    this.gatewayLoading = false;
  }
  /**
   * Asks the hub to enrol: it files the CSR in this hub's legal-document file at the control plane
   * with its machine credential and collects the certificate once a person has signed it.
   *
   * Idempotent by contract — pressing it while a request is pending does not open a second review
   * (the control plane deduplicates the same bytes) and, once approved, it installs. So the ONE
   * button covers «request», «check» and «renew»; three buttons for one call would be three ways
   * of spending the same allowance.
   *
   * The answer carries the fresh status in the same body, so the row updates from what the door
   * just said rather than from a second round trip.
   */
  private async enrolGateway() {
    this.enrolling = true;
    this.gatewayNotice = null;
    try {
      const reply = await gatewayFetch(GATEWAY_ENROL_PATH, 'POST');
      const body = reply.body;
      if (reply.ok) {
        const outcome = enrolOutcome(typeof body.state === 'string' ? body.state : '');
        // A rejection carries the reason the reviewer WROTE. It is prose for this customer, so it
        // is shown as prose — the operator took the trouble to say why, and a monospaced blob
        // reads like a fault code nobody can act on.
        const reason = typeof body.rejected_reason === 'string' ? body.rejected_reason : '';
        this.gatewayNotice = { ...outcome, detail: reason, mono: false };
        // The door answers with `has_key`/`has_certificate`/`not_after` alongside the outcome.
        this.gateway = body as GatewayIdentityWire;
        return;
      }
      // 401 is the admin gate of `POST …/enrol`; a refusal the runtime NAMED is 422 with a code
      // (ADR-0055). Anything else is the hub not answering, which is still an answer to show.
      const code = typeof body.code === 'string' ? body.code : '';
      const key = reply.status === 401 || reply.status === 403
        ? 'ui.gwErrNotAdmin'
        : code
          ? gatewayRefusalKey(code)
          : 'ui.gwErrHttp';
      // The CODE stays visible even once translated: it is the word support and the control plane
      // share, and collapsing several codes into one sentence must not lose which one it was.
      this.gatewayNotice = { key, tone: 'danger', detail: code, mono: true };
    } finally {
      this.enrolling = false;
    }
  }
/**
   * **The secure connection with ERPlora** (verifactu#76): what this hub's MACHINE identity is, and
   * the one thing there is to do about it.
   *
   * That identity is what lets the fiscal cell file on the business's behalf (ADR-0320 §1): the
   * private key is born on the hub and never leaves it (ADR-0419), the CSR travels, and an operator
   * signs it with the internal CA — offline, so a person is always in the loop. Until hub#1457 both
   * legs were a human errand; the screen is the half that was still missing.
   *
   * There is deliberately NO way to forget the identity from here. `DELETE …/gateway-identity`
   * exists and is the operator's rotation path, but it destroys the private key: a module screen
   * must not be able to shut a business's road to the tax authority with one press.
   */
  private renderGatewayIdentity(t: (k: string) => string) {
    const state = this.gatewayLoading ? null : gatewayState(this.gateway, Date.now());
    const row = state
      ? GATEWAY_STATES[state]
      : { tone: 'neutral', label: 'ui.gwLoading', hint: 'ui.gatewayHint', action: null };
    const commonName = (this.gateway?.common_name ?? '').trim();
    const validUntil = state === 'active' || state === 'expiring' || state === 'expired'
      ? (this.gateway?.not_after ?? '').trim()
      : '';
    const notice = this.gatewayNotice;
    return html`<ion-item lines="none">
      <div class="cert">
        <div class="cert-head">
          <ion-label>${t('ui.gatewayTitle')}</ion-label>
          <ok-status-pill dot tone=${row.tone} label=${t(row.label)}></ok-status-pill>
        </div>
        <p class="hint">${t(row.hint)}</p>
        ${commonName ? html`<div class="kv"><span class="k">${t('ui.gatewayCommonName')}</span><code>${commonName}</code></div>` : nothing}
        ${validUntil ? html`<div class="kv"><span class="k">${t('ui.gatewayValidUntil')}</span><code>${validUntil}</code></div>` : nothing}
        ${row.action
          ? html`<ion-button
              size="small"
              fill="outline"
              data-testid="gateway-enrol"
              ?disabled=${this.enrolling}
              @click=${() => this.enrolGateway()}
            >${this.enrolling ? t('ui.gwWorking') : t(row.action)}</ion-button>`
          : nothing}
        ${notice
          ? html`<ok-inline-feedback tone=${notice.tone} icon="shield-checkmark-outline">
              ${t(notice.key)}
              ${notice.detail
                ? notice.mono
                  ? html` <code>${notice.detail}</code>`
                  : html` ${notice.detail}`
                : nothing}
            </ok-inline-feedback>`
          : nothing}
      </div>
    </ion-item>`;
  }
  /** La fecha de subida en el idioma de quien mira, o `''` si no hay ninguna que enseñar. */
  private uploadedLabel(): string {
    const raw = (this.cert?.uploaded_at ?? '').trim();
    if (!raw) return '';
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString(erplora().locale || undefined);
  }

  /**
   * **Mi certificado** — subirlo, verlo y quitarlo. Nada más.
   *
   * El interruptor de la vía vive en Ajustes: eso se enciende y se apaga. Esto se hace una vez.
   */
  private renderOwnTab(t: (k: string) => string) {
    const present = !!this.cert?.present;
    return html`<div class="card">
      <div class="card-body">
        <div class="row">
          <h3>${t('ui.cfgP12Title')}</h3>
          <ok-status-pill
            dot
            tone=${present ? 'success' : 'neutral'}
            label=${present ? t('ui.cfgP12Present') : t('ui.cfgP12Absent')}
          ></ok-status-pill>
        </div>
        ${present
          ? html`<div class="kv">
              <span class="k">${t('ui.cfgP12Holder')}</span>
              <code>${this.cert?.subject || '—'}</code>
              ${this.uploadedLabel()
                ? html`<span class="k">${t('ui.cfgP12Uploaded')} ${this.uploadedLabel()}</span>`
                : nothing}
            </div>`
          : nothing}
        <p class="hint">${t('ui.cfgP12Hint')}</p>
        <!-- El mismo control de subida que el otorgamiento: arrastrar o elegir, con el tipo filtrado
             en la zona. Un input nativo pintaba el texto del navegador, en inglés. -->
        <ok-dropzone
          data-testid="config-p12-file"
          accept=".p12,.pfx"
          max-size=${MAX_CERTIFICATE_BYTES}
          hint=${t('ui.cfgP12Choose')}
          .labels=${this.dropzoneLabels(t)}
          @ok-change=${(e: CustomEvent<{ files: File[] }>) => { this.pickedFile = e.detail?.files?.[0] ?? null; }}
        ></ok-dropzone>
        <ion-input
          type="password"
          mode="md"
          fill="outline"
          label-placement="floating"
          data-testid="config-p12-password"
          label=${t('ui.cfgP12Password')}
          @ionInput=${(e: Event) => { this.password = String((e.target as HTMLInputElement).value ?? ''); }}
        ></ion-input>
        ${this.notice
          ? html`<ok-inline-feedback tone=${this.notice.tone} icon="information-circle-outline"
            >${t(this.notice.key)}</ok-inline-feedback>`
          : nothing}
        <div class="actions">
          <ion-button ?disabled=${this.busy} @click=${() => void this.uploadCertificate()}>
            ${t(this.busy ? 'ui.cfgP12Uploading' : 'ui.cfgP12Upload')}
          </ion-button>
          ${present
            ? html`<ion-button
                fill="outline"
                color="danger"
                data-testid="config-p12-remove"
                ?disabled=${this.busy}
                @click=${() => void this.removeCertificate()}
              >${t('ui.cfgRemoveConfirm')}</ion-button>`
            : nothing}
        </div>
      </div>
    </div>`;
  }



  @state() pickedFile: File | null = null;

  @state() private password = '';

  @state() private busy = false;

  @state() private notice: { key: string; tone: string } | null = null;

  /**
   * Sube el `.p12` por la puerta del core. La clave se queda ahí: lo que vuelve es el estado —
   * presencia, sujeto y fecha—, nunca los bytes.
   */
  private async uploadCertificate(): Promise<void> {
    if (!this.pickedFile) {
      this.notice = { key: 'ui.cfgP12NoFile', tone: 'warning' };
      return;
    }
    this.busy = true;
    this.notice = null;
    try {
      const b64 = await fileToBase64(this.pickedFile);
      const reply = await coreFetch(CERTIFICATE_PATH, {
        method: 'PUT',
        json: { pkcs12_b64: b64, password: this.password },
      });
      if (!reply.ok) {
        const error = reply.body.error as { code?: string } | string | undefined;
        const code = typeof error === 'object' ? (error?.code ?? '') : '';
        this.notice = {
          key: code === 'capability_denied' ? 'ui.cfgP12Denied' : 'ui.cfgP12Error',
          tone: 'danger',
        };
        return;
      }
      this.notice = { key: 'ui.cfgP12Uploaded', tone: 'success' };
      this.pickedFile = null;
      this.password = '';
      await this.refresh();
    } finally {
      this.busy = false;
    }
  }

  /** Quita el certificado del negocio y devuelve el hub a la vía delegada. */
  private async removeCertificate(): Promise<void> {
    this.busy = true;
    try {
      const reply = await coreFetch(CERTIFICATE_PATH, { method: 'DELETE' });
      this.notice = reply.ok
        ? { key: 'ui.cfgP12Removed', tone: 'success' }
        : { key: 'ui.cfgP12Error', tone: 'danger' };
      if (reply.ok) await this.refresh();
    } finally {
      this.busy = false;
    }
  }

  /**
   * El otorgamiento: en qué estado está y qué toca hacer.
   *
   * El estado sale del CORE (`hub.fiscal.transmission`), que es el mismo sitio del que sale la
   * decision de `go_live`: dos lecturas separadas del mismo hecho es como acaban discrepando la
   * pantalla y la puerta de produccion.
   */
  /**
   * **Lo remite ERPlora** — y para eso hay que subirle el otorgamiento firmado. El panel es el
   * mismo que vivía en Ajustes → Negocio del hub: mismas reglas, otro sitio.
   */
  private renderDelegatedTab(t: (k: string) => string) {
    return html`<div class="card" data-testid="config-grant">
      <div class="card-body">
        <h3>${t('ui.cfgGrantTitle')}</h3>
        <erp-verifactu-grant
          .obligadoNif=${this.issuerNif}
          .obligadoName=${this.issuerName}
          .businessStreet=${this.business.street}
          .businessNumber=${this.business.number}
          .businessCity=${this.business.city}
        ></erp-verifactu-grant>
      </div>
    </div>
    <!-- La identidad de MAQUINA con la que la celda remite en nombre del negocio (verifactu#76). Va
         en esta pestaña porque es la otra mitad de lo que le permite a ERPlora remitir por ti, y no
         aparece en la via propia (verifactu#82): ahi el hub llega solo a la AEAT. -->
    ${this.usesGatewayIdentity ? html`<div class="card"><div class="card-body">${this.renderGatewayIdentity(t)}</div></div>` : nothing}`;
  }



  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`
      <div class="wrap">
        <h2>${t('ui.cfgTitle')}</h2>
        <ion-segment
          value=${this.tab}
          @ionChange=${(e: Event) => this.goTab(String((e.target as HTMLInputElement).value) as Tab)}
        >
          <ion-segment-button value="delegated" data-testid="config-tab-delegated">
            <ion-label>${t('ui.cfgTabDelegated')}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="own" data-testid="config-tab-own">
            <ion-label>${t('ui.cfgTabOwn')}</ion-label>
          </ion-segment-button>
        </ion-segment>
        ${this.tab === 'delegated' ? this.renderDelegatedTab(t) : this.renderOwnTab(t)}
      </div>
    `;
  }
}

/** El `.p12` viaja en base64 dentro del cuerpo: en una URL acabaría en cada log de cada proxy. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-failed'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

define('erp-verifactu-config', ErpVerifactuConfig);
