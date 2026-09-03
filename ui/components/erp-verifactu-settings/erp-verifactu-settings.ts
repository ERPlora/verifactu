import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-status-pill';
import '@erplora/outfitkit/ok-inline-feedback';
import { toMicro } from '../../lib/quantity';
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
  /** Is there a BUSINESS certificate uploaded in Settings → Business (_hub_certificate)? */
  has_certificate?: number;
  retry_interval_minutes?: number;
  max_retries?: number;
}

/**
 * One row of `hub.fiscal.transmission` (hub#1416) — the CORE's word about which of the two roads
 * of ADR-0320 §1 this hub's records take, plus the state of the representation grant that
 * authorises the delegated one. Frozen in `contracts/kernel/engine.snapshot`, so it is a promise
 * the kernel keeps, not a private read.
 *
 * The module PAINTS it and never re-derives it. `:has_certificate` cannot answer this: since
 * hub#1489 it is `certificate::can_transmit` — «has this hub a ROAD?» — and says `1` on both, so
 * a business with no certificate at all used to read «loaded ✓» right here.
 */
interface FiscalTransmission {
  /** `own` | `delegated`, the stable words of `certificate::route_of`. */
  transmission_route?: string;
  /** `vigente` | `pendiente` | `rechazado` | `revocado` | `absent`; `''` = never asked. */
  representation_status?: string;
  /** ISO instant of the last change of the grant, or `''`. */
  representation_at?: string;
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

// ── Naming a refusal (verifactu#40) ─────────────────────────────────────────────────────────
//
// The three closures an ephemeral DEMO hub applies (ADR-0197 §4), by the STABLE machine code the
// runtime publishes for each (`DemoLock::as_str` in `crates/runtime/src/errors.rs`). Mapped by
// CODE and not by prose on purpose: the runtime's own sentence is English written for a
// developer ("this is a demo hub: ..."), it is the one thing here allowed to change, and a demo
// visitor reads Spanish. The SDK already carries the code — `ErploraError.code`, built from the
// runtime's `{ ok:false, error:{ code, message } }` envelope — so there is a machine contract to
// key on and no reason to read the sentence.
const DEMO_LOCKS: Record<string, string> = {
  demo_fiscal_environment_locked: 'ui.errDemoEnvironmentLocked',
  demo_business_certificate_locked: 'ui.errDemoCertificateLocked',
  demo_fiscal_identity_locked: 'ui.errDemoIdentityLocked',
};

/**
 * The runtime's refusal when the `certificate` capability is DECLARED but not GRANTED
 * (`capabilities::enforce`, ADR-0079 — default-deny, checked in Rust in front of every native
 * handler of this module). Same wire code the flows editor keys on, and the only way this screen
 * can ever KNOW the grant is missing: `system_params` injects `:has_certificate` and
 * `:is_demo_hub`, but nothing about grants, and the SDK exposes no capability API on purpose
 * (`architecture/hub/module-capabilities.md` — an identity declared in the browser may only
 * SUBTRACT, never grant). So the screen states the requirement up front and calls it DENIED only
 * once the runtime has actually said so.
 */
const CAPABILITY_DENIED = 'capability_denied';

/**
 * The two roads of ADR-0320 §1, by the STABLE words `certificate::route_of` publishes
 * (`ROUTE_OWN`/`ROUTE_DELEGATED` in `crates/runtime/src/certificate.rs`). They cross the wire and
 * this screen programs against them, so they are matched exactly and never parsed out of prose.
 */
const ROUTE_OWN = 'own';
const ROUTE_DELEGATED = 'delegated';

/**
 * The grant states the core publishes (`fiscal_profile::REPRESENTATION_*`), each with the pill it
 * earns. Keyed by the MACHINE value, like every other table on this screen (ADR-0055): the words
 * are Spanish because the AEAT's are, and translating them here would be a second vocabulary.
 *
 * `absent` («asked, there is none») and `''` («never asked») land on the same row on purpose: the
 * distinction is real for the runtime and meaningless to the owner, who has one thing to do in
 * both. Anything the core adds later shows as `absent` rather than as an empty pill — the screen
 * never invents a state it was not told.
 */
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

const GRANT_STATES: Record<string, { key: string; tone: string }> = {
  vigente: { key: 'ui.grantVigente', tone: 'success' },
  pendiente: { key: 'ui.grantPendiente', tone: 'warning' },
  rechazado: { key: 'ui.grantRechazado', tone: 'danger' },
  revocado: { key: 'ui.grantRevocado', tone: 'danger' },
  absent: { key: 'ui.grantAbsent', tone: 'warning' },
};

/**
 * The catalogue key that explains a refusal, or `''` when we have nothing better than what the
 * caller sent.
 *
 * The gate arm is why migration 012 exists. A command rollback reaches the browser as the raw
 * Postgres CHECK violation, and `PgDatabaseError`'s `Display` writes only the PRIMARY message —
 * the failing row, and therefore the `gate` value, travels in the separate DETAIL field, which
 * `message()` never includes. So while every gate shared one auto-named constraint
 * (`verifactu__gate_ok_check`) this function could not tell them apart, and a hub with no
 * obligado tributario was handed the GO-LIVE text: the other gate's story, about a problem it
 * does not have, naming nothing anyone could act on. Migration 012 gives each gate its own
 * named constraint, which IS part of the primary message, so the specific arm below can match.
 *
 * Order matters: the specific gate first, the relation name only as the last resort — that
 * fallback still covers a hub whose migration 012 has not run yet.
 */
function refusalKey(e: unknown): string {
  const code = typeof (e as { code?: unknown })?.code === 'string' ? (e as { code: string }).code : '';
  const message = e instanceof Error ? e.message : '';
  if (DEMO_LOCKS[code]) return DEMO_LOCKS[code];
  const lockInText = Object.keys(DEMO_LOCKS).find((c) => message.includes(c));
  if (lockInText) return DEMO_LOCKS[lockInText];
  // The capability gate (verifactu#62). Its runtime sentence is Spanish prose written for a
  // developer and names the raw capability id; the operator gets the catalogue key instead, and
  // with it the one action that fixes the situation.
  if (code === CAPABILITY_DENIED || message.includes(CAPABILITY_DENIED)) return 'ui.errCapabilityDenied';
  if (message.includes('config_save_requires_issuer')) return 'ui.errIssuerRequired';
  if (message.includes('config_save_go_live_is_one_way')) return 'ui.errGoLiveIsOneWay';
  if (message.includes('verifactu__gate')) return 'ui.errGoLiveIsOneWay';
  return '';
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
    .card { background: var(--ion-card-background, #fff); border:1px solid var(--ion-border-color, #e6e2d8); border-radius: var(--ok-radius, 12px); overflow:hidden; }
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
    .prod-head ion-button { --padding-start:.35rem; --padding-end:.35rem; --color: var(--ion-color-primary, #3880ff); margin:0; min-width:44px; min-height:44px; font-size:1.25rem; font-weight:700; }
    .card-actions ion-button, .test-actions ion-button, .cert ion-button { min-height:44px; }
    ion-item { --min-height:52px; }
    ion-input, ion-select { min-height:44px; }
    .info { display:flex; flex-direction:column; gap:.45rem; padding:.5rem .75rem; border-radius: var(--ok-radius-sm, 8px); background: var(--ion-color-light, #f4f5f8); }
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

  /**
   * The runtime has PROVEN the `certificate` capability is not granted (verifactu#62).
   *
   * Never guessed: it flips only when a native command comes back `capability_denied`, and back
   * off when one succeeds. Until then the prerequisite row states the requirement without
   * claiming a state the module has no way to read.
   */
  @state() private capabilityDenied = false;

  /** VeriFactu was just saved as ON, so the screen owes the owner the remaining step. */
  @state() private savedEnabled = false;

  /**
   * What `hub.fiscal.transmission` answered (verifactu#41). `null` = the core did not answer —
   * an older hub whose runtime predates hub#1416, or a read that refused — and then the screen
   * says so instead of picking a road for the business.
   */
  @state() private transmission: FiscalTransmission | null = null;

  /** The route read is in flight, so the pill says «checking» rather than «not available». */
  @state() private routeLoading = true;

  /**
   * What the hub answered about its MACHINE identity (verifactu#76). `null` = we could not ask —
   * and then the screen says so instead of guessing at a state.
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

  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    await this.refresh();
    await this.loadRoute();
    // The route is settled by the line above, so this is a decision and not a race: on the `own`
    // road there is nothing to ask for. The flag drops so no state keeps claiming a read that is
    // never going to happen.
    if (this.usesGatewayIdentity) await this.loadGatewayIdentity();
    else this.gatewayLoading = false;
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

  /**
   * Reads the road this hub is on from the CORE (hub#1416, `contracts/kernel/engine.snapshot`).
   *
   * A refusal is swallowed into `transmission = null` and NOT into `this.error`: that slot is the
   * screen-wide one, and a fact this screen merely REFLECTS must not blank out the configuration
   * the owner came here to change. The route block states «not available» in its own place, which
   * is where a person can act on it.
   */
  private async loadRoute() {
    this.routeLoading = true;
    try {
      const rows = await erplora().query<FiscalTransmission[] | FiscalTransmission | null>('hub.fiscal.transmission');
      const row = Array.isArray(rows) ? rows[0] : rows;
      this.transmission = row ?? null;
    } catch {
      this.transmission = null;
    } finally {
      this.routeLoading = false;
    }
  }

  /**
   * `own` / `delegated` as the core said it, or `''` when nobody told us. Anything else the wire
   * might carry collapses to `''` on purpose: an unrecognised word is «we do not know», never a
   * road picked by this screen.
   */
  private get route(): string {
    const r = (this.transmission?.transmission_route ?? '').trim();
    return r === ROUTE_OWN || r === ROUTE_DELEGATED ? r : '';
  }

  /**
   * **Does this hub sign with a certificate of its OWN?** — ONE rule for the two places that ask
   * it (the prerequisite pill and the live-test gate), because two derivations of the same fact
   * is how a screen ends up contradicting itself.
   *
   * With the route known it IS the route: `route_of` answers `own` exactly when the hub holds its
   * own `.p12`. Without it, the old `:has_certificate` reading — correct on any runtime that
   * predates hub#1416, where that param was still `can_sign`, and the honest answer where we were
   * told nothing.
   */
  private get signsWithOwnCertificate(): boolean {
    return this.route ? this.route === ROUTE_OWN : !!this.cfg.has_certificate;
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
    return this.route !== ROUTE_OWN;
  }

  /** The grant instant as a date in the caller's language, or `''` when there is none to show. */
  private grantDate(): string {
    const iso = (this.transmission?.representation_at ?? '').trim();
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(erplora().locale || undefined);
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

  /** Navega a Ajustes → **Negocio** (`#tax`), que es donde viven la identidad fiscal Y el
   *  certificado del hub. El WC de Lit vive dentro del shell del Hub (Vue Router con
   *  createWebHistory). pushState SOLO cambia la URL; hay que disparar popstate en WINDOW (no en el
   *  elemento — el dispatchEvent sin target se queda en el shadow root y no llega al router de
   *  Vue). Es el patrón de navegación módulo→shell.
   *
   *  El hash importa (verifactu#49): `/settings` a secas aterriza en General (país, moneda, idioma,
   *  tema), así que el usuario hacía lo que se le pedía y volvía a una pantalla sin nada que tocar. */
  private goToSettings(): void {
    window.history.pushState({}, '', '/settings#tax');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  /** Navigates to Settings → **Permissions** (`#permissions`), where the owner grants the module
   *  capabilities (ADR-0079). Same module→shell navigation as {@link goToSettings}, and the hash
   *  matters for the same reason (verifactu#49): `/settings` bare degrades to the Hub tab
   *  (`resolveSettingsTab`), so the owner would do as told and land on a screen with nothing to
   *  press. `permissions` is one of the shell's declared tabs — it is not a hash we invented. */
  private goToPermissions(): void {
    window.history.pushState({}, '', '/settings#permissions');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  /** Records what a native command just proved about the capability grant. */
  private noteCapability(e: unknown): void {
    const code = typeof (e as { code?: unknown })?.code === 'string' ? (e as { code: string }).code : '';
    this.capabilityDenied = code === CAPABILITY_DENIED
      || (e instanceof Error && e.message.includes(CAPABILITY_DENIED));
  }

  private async save(ev: Event) {
    ev.preventDefault();
    this.saving = true;
    this.error = '';
    this.saved = false;
    this.savedEnabled = false;
    try {
      // No se puede ACTIVAR VeriFactu sin obligado tributario (verifactu#49). El emisor efectivo
      // ya viene resuelto desde la identidad fiscal del hub, así que vacío = el hub no la tiene
      // configurada. El backstop real es el gate `config_save_requires_issuer` (rollback de la
      // transacción); esto solo evita el viaje y nombra la causa donde se arregla.
      if (this.cfg.enabled && !(this.cfg.issuer_nif || '').trim()) {
        this.error = erplora().t(CATALOG, 'ui.errIssuerRequired');
        return;
      }
      await erplora().command('verifactu.config.save', {
        enabled: !!this.cfg.enabled,
        mode: this.cfg.mode || 'verifactu',
        environment: this.cfg.environment || 'testing',
        // Identificación del productor: SIEMPRE fija (no editable por el cliente).
        software_name: PRODUCER.software_name,
        software_version: PRODUCER.software_version,
        software_id: PRODUCER.software_id,
        software_nif: PRODUCER.software_nif,
        // Obligado tributario (emisor): NO se manda. Es identidad fiscal del hub (ADR-0061) y la
        // resuelve el propio `config_save.sql` desde `:business_tax_id`/`:business_legal_name`,
        // que es lo que impide que la config del módulo y el hub declaren NIF distintos.
        retry_interval_minutes: Number(this.cfg.retry_interval_minutes) || 5,
        max_retries: Number(this.cfg.max_retries) || 10,
      });
      this.saved = true;
      // Turning the switch on is where the silence used to be (verifactu#62): `config.save` is
      // plain SQL, it does NOT pass the capability gate and must not — so it succeeds with the
      // permission still denied and the screen used to look finished. It says the remaining step
      // instead, read BEFORE `refresh()` overwrites `cfg` with what the hub stored.
      this.savedEnabled = !!this.cfg.enabled;
      await this.refresh();
    } catch (e) {
      // Every refusal this save can meet — the two gates that roll the transaction back and the
      // three closures a demo hub applies — resolves to a sentence the operator can act on.
      // Anything left over is shown as it came rather than swallowed: silence is what made the
      // original report read as "the switch just goes back off".
      const key = refusalKey(e);
      const message = e instanceof Error ? e.message : '';
      this.error = key
        ? erplora().t(CATALOG, key)
        : message || erplora().t(CATALOG, 'ui.errSaveConfig');
    } finally {
      this.saving = false;
    }
  }

  private async runTest() {
    this.testing = true;
    this.error = '';
    try {
      await erplora().command('verifactu.diagnostics.run', { invoice_type: this.testType });
      // A native handler that RAN is proof the grant is there: the gate sits in front of it.
      this.capabilityDenied = false;
      await this.loadDiag();
    } catch (e) {
      this.noteCapability(e);
      const key = refusalKey(e);
      this.error = key
        ? erplora().t(CATALOG, key)
        : (e instanceof Error ? e.message : '') || erplora().t(CATALOG, 'ui.errTestRun');
    } finally {
      this.testing = false;
    }
  }

  /**
   * Creates a test invoice (F2 ticket) via the cross-module `invoice.create` command.
   * F2 does NOT need the Recipients block → avoids AEAT error 1189. The Hub always transmits
   * on creation (ADR-0202 R3: active module = always emit), so it sends itself to the AEAT
   * and shows up in /m/invoice.
   * WIRE CONTRACT (verifactu#50): `quantity` is a FIXED-POINT integer of scale 10⁶ (ADR-0147,
   * 1 unit = 1000000) and `unit_price` is integer minor units (ADR-0123, cents). A bare `1`
   * is 0,000001 units: invoice < 1.2.17 issued the ticket for 0.00 €, and since invoice#49
   * the destination rejects it (422 `invalid_payload`, then `line_amount_underflow`). With
   * 1 unit at 100 cents the ticket comes out at base 1.00 € + quota 0.21 € (21 %).
   * GUARD: only in the testing environment and with the issuer tax ID configured.
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
        items: [{ description: 'Factura de PRUEBA VeriFactu (entorno de pruebas)', quantity: toMicro(1), unit_price: 100, tax_rate: 21, product_id: null }],
      });
      this.invoiceCreated = true;
    } catch (e) {
      const key = refusalKey(e);
      this.error = key
        ? erplora().t(CATALOG, key)
        : (e instanceof Error ? e.message : '') || erplora().t(CATALOG, 'ui.errTestInvoice');
    } finally {
      this.creatingInvoice = false;
    }
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
          <ion-button @click=${() => this.runTest()} ?disabled=${this.testing || !this.signsWithOwnCertificate}>${this.testing ? t('ui.testRunning') : t('ui.testRun')}</ion-button>
          <ion-button fill="outline" @click=${() => this.createTestInvoice()} ?disabled=${this.creatingInvoice || !canCreateInvoice}>${this.creatingInvoice ? t('ui.testCreateInvoiceRunning') : t('ui.testCreateInvoice')}</ion-button>
        </div>
        ${!isTesting ? html`<p class="hint">${t('ui.testInvoiceTestingOnly')}</p>` : nothing}
        ${this.invoiceCreated ? html`<ok-inline-feedback tone="success" icon="checkmark-circle-outline">${t('ui.testInvoiceCreated')}</ok-inline-feedback>` : nothing}
        <!-- Why the button is off, in the terms of the road this hub is actually on (verifactu#41).
             It used to read «not configured — Choose file…», which was a file picker's label
             pasted where a reason belongs: it named no road and pointed at nothing to press. On
             the delegated road the diagnostic cannot answer at all — it still demands the core
             identity (hub#1485) — so the screen says that instead of offering a button that
             always fails. -->
        ${this.signsWithOwnCertificate
          ? nothing
          : html`<p class="hint">${t(this.route === ROUTE_DELEGATED ? 'ui.testDelegatedUnavailable' : 'ui.testNeedsOwnCertificate')}</p>`}
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

  /**
   * **Which road this hub's records take, and — on the delegated one — how its authorisation is
   * doing** (verifactu#41, ADR-0320 §1). First row of the card on purpose: it is what explains
   * everything under it, including why there is no certificate and why the live test is off.
   *
   * The module REFLECTS and does not own (ADR-0320 §5): the grant is signed in Ajustes → Negocio,
   * where the runtime composes the official Anexo I with the real legal text and a person at
   * ERPlora reviews it. A form here would be a second one, and a business cannot file a blank
   * page it signed. So this block ends where every other prerequisite on this screen ends — with
   * the same «go there» affordance.
   */
  private renderRoute(t: (k: string) => string) {
    const route = this.route;
    const pill = this.routeLoading
      ? { tone: 'neutral', label: 'ui.routeLoading' }
      : route === ROUTE_OWN
        ? { tone: 'success', label: 'ui.routeOwn' }
        : route === ROUTE_DELEGATED
          ? { tone: 'info', label: 'ui.routeDelegated' }
          : { tone: 'neutral', label: 'ui.routeUnknown' };
    const hint = route === ROUTE_OWN
      ? 'ui.routeOwnHint'
      : route === ROUTE_DELEGATED
        ? 'ui.routeDelegatedHint'
        : 'ui.routeUnknownHint';
    // The grant only exists on the delegated road: with an own certificate nobody authorises
    // anybody, so asking for one there would send the owner to a form they must not sign.
    const grant = route === ROUTE_DELEGATED
      ? GRANT_STATES[(this.transmission?.representation_status ?? '').trim()] ?? GRANT_STATES.absent
      : null;
    const grantDate = grant ? this.grantDate() : '';
    return html`<ion-item lines="none">
      <div class="cert">
        <div class="cert-head">
          <ion-label>${t('ui.routeTitle')}</ion-label>
          <ok-status-pill dot tone=${pill.tone} label=${t(pill.label)}></ok-status-pill>
        </div>
        <p class="hint">${t(hint)}</p>
        ${grant
          ? html`
              <div class="cert-head">
                <ion-label>${t('ui.grantTitle')}</ion-label>
                <ok-status-pill dot tone=${grant.tone} label=${t(grant.key)}></ok-status-pill>
              </div>
              ${grantDate ? html`<div class="kv"><span class="k">${t('ui.grantSince')}</span><code>${grantDate}</code></div>` : nothing}
              <p class="hint">${t('ui.grantHint')}</p>
            `
          : nothing}
        <ion-button size="small" fill="outline" @click=${() => this.goToSettings()}>
          <ion-icon slot="start" name="open-outline"></ion-icon>
          ${t('ui.certGoSettings')}
        </ion-button>
      </div>
    </ion-item>`;
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

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    // Emisor EFECTIVO: `config.get` ya resuelve la identidad fiscal del hub cuando la columna del
    // módulo está vacía, así que un vacío AQUÍ significa que el hub no tiene identidad fiscal.
    const issuerNif = (this.cfg.issuer_nif || '').trim();
    return html`
      <h2>${t('ui.settingsTitle')}</h2>
      ${this.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : nothing}
      ${this.saved ? html`<ok-inline-feedback tone="success" icon="checkmark-circle-outline">${t('ui.settingsSaved')}</ok-inline-feedback>` : nothing}
      <!-- verifactu#62: saving with the switch ON succeeds even with the capability denied (the
           save is plain SQL and must not depend on the gate), so the screen owes the owner the
           step that is left. Only after a save that turned it ON — a permanent notice would be
           noise in the hubs where the permission is granted, which the module cannot tell apart. -->
      ${this.savedEnabled
        ? html`<ok-inline-feedback tone="warning" icon="key-outline" heading=${t('ui.capabilityTitle')}>
            ${t('ui.enabledNeedsPermission')}
            <ion-button size="small" fill="outline" @click=${() => this.goToPermissions()}>
              <ion-icon slot="start" name="open-outline"></ion-icon>
              ${t('ui.capabilityGoPermissions')}
            </ion-button>
          </ok-inline-feedback>`
        : nothing}
      <div class="cols">
        <form class="card" @submit=${(e: Event) => this.save(e)}>
          <ion-list>
            ${this.renderRoute(t)}
            <ion-item>
              <ion-toggle style=${GREEN} ?checked=${!!this.cfg.enabled} @ionChange=${(e: any) => this.set('enabled', e.target.checked)}>${t('ui.enableVerifactu')}</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-select label=${t('ui.envAeat')} label-placement="stacked" .value=${this.cfg.environment || 'testing'} @ionChange=${(e: any) => this.set('environment', e.target.value)}>
                <ion-select-option value="testing">${t('ui.envTesting')}</ion-select-option>
                <ion-select-option value="production">${t('ui.envProduction')}</ion-select-option>
              </ion-select>
            </ion-item>
            <!-- Obligado tributario: identidad fiscal del NEGOCIO/hub (ADR-0061), NO del módulo.
                 Se configura en Ajustes → Negocio y aquí solo se muestra — igual que el
                 certificado, justo debajo. Pedirlo dos veces permitía emitir a nombre de un NIF
                 y DECLARAR a nombre de otro (verifactu#49). -->
            <ion-item lines="none">
              <div class="cert">
                <div class="cert-head">
                  <ion-label>${t('ui.obligadoNif')}</ion-label>
                  <ok-status-pill dot tone=${issuerNif ? 'success' : 'danger'} label=${issuerNif || t('ui.obligadoMissing')}></ok-status-pill>
                </div>
                <div class="kv"><span class="k">${t('ui.obligadoName')}</span><code>${this.cfg.issuer_name || '—'}</code></div>
                <p class="hint">${t('ui.obligadoFromHub')}</p>
                <p class="hint">${t('ui.obligadoHint')}</p>
                <ion-button size="small" fill="outline" @click=${() => this.goToSettings()}>
                  <ion-icon slot="start" name="open-outline"></ion-icon>
                  ${t('ui.certGoSettings')}
                </ion-button>
              </div>
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
            <!-- Certificado fiscal: recurso del NEGOCIO/hub (ADR-0079/0081), NO del módulo.
                 Se sube en Ajustes → Negocio. Aquí solo mostramos el estado y un enlace. -->
            <ion-item lines="none">
              <div class="cert">
                <div class="cert-head">
                  <ion-label>${t('ui.certPkcs12')}</ion-label>
                  <!-- verifactu#41: the OWN certificate, read from the ROAD (route_of) and not
                       from :has_certificate — which since hub#1489 answers can_transmit, «has a
                       road», and is 1 on both. This pill was telling a business with zero
                       certificates that its certificate was loaded. On the delegated road there
                       is genuinely none and none is needed, which is a different sentence from
                       «not configured». -->
                  <ok-status-pill
                    dot
                    tone=${this.signsWithOwnCertificate ? 'success' : 'neutral'}
                    label=${this.signsWithOwnCertificate
                      ? t('ui.certLoaded')
                      : t(this.route === ROUTE_DELEGATED ? 'ui.certNotNeeded' : 'ui.certNotConfigured')}
                  ></ok-status-pill>
                </div>
                <p class="hint">${t(this.route === ROUTE_DELEGATED ? 'ui.certOptionalHint' : 'ui.certHubHint')}</p>
                <ion-button size="small" fill="outline" @click=${() => this.goToSettings()}>
                  <ion-icon slot="start" name="open-outline"></ion-icon>
                  ${t('ui.certGoSettings')}
                </ion-button>
              </div>
            </ion-item>
            <!-- The MACHINE identity the fiscal cell files with in the name of the business
                 (verifactu#76, ADR-0320 §1 / ADR-0419). Right behind the own certificate because
                 it is the other half of the same question: what this hub identifies itself with
                 when it does NOT sign with the customer's certificate — which is also why the
                 OWN road does not get it at all (verifactu#82). NOTE: no backticks inside an HTML
                 comment of a Lit template, they break the bundle's parser. -->
            ${this.usesGatewayIdentity ? this.renderGatewayIdentity(t) : nothing}
            <!-- Permiso módulo→host (ADR-0079), verifactu#62. Es el TERCER requisito para poder
                 firmar, y hasta ahora era el único invisible: los otros dos ya se enseñan aquí
                 arriba. La píldora es NEUTRA por defecto porque el módulo no puede leer el estado
                 de la concesión (no hay system param ni API del SDK, a propósito); se pone en rojo
                 cuando el runtime lo ha DENEGADO de verdad. Conceder sigue siendo cosa de una
                 persona en Ajustes → Permisos: auto-concederlo dejaría el gate en decoración. -->
            <ion-item lines="none">
              <div class="cert">
                <div class="cert-head">
                  <ion-label>${t('ui.capabilityTitle')}</ion-label>
                  <ok-status-pill
                    dot
                    tone=${this.capabilityDenied ? 'danger' : 'neutral'}
                    label=${this.capabilityDenied ? t('ui.capabilityDenied') : t('ui.capabilityPending')}
                  ></ok-status-pill>
                </div>
                <p class="hint">${t('ui.capabilityHint')}</p>
                <ion-button size="small" fill="outline" @click=${() => this.goToPermissions()}>
                  <ion-icon slot="start" name="open-outline"></ion-icon>
                  ${t('ui.capabilityGoPermissions')}
                </ion-button>
              </div>
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
