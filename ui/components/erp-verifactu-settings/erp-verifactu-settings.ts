import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-status-pill';
import '@erplora/outfitkit/ok-inline-feedback';
import { toMicro } from '../../lib/quantity';
import { coreFetch } from '../../lib/core-fetch';
import { certReasonSentence, reasonSentence } from '../../lib/event-message';
import {
  DECLARATION_FIELDS,
  fetchResponsibleDeclaration,
  type DeclarationField,
  type SystemDeclaration,
} from '../../lib/responsible-declaration';
import {
  GATEWAY_IDENTITY_PATH,
  type GatewayIdentityWire,
  gatewayFetch,
  gatewayState,
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
  /** Money (ADR-0123): takes the INTEGER in the minor unit; currency and scale of the hub. */
  formatMoney(minor: number): string;
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
  /**
   * OUR account of why nothing was filed, in the engine's Spanish. Still written, still the
   * FALLBACK — the twin of `cert_message` one box lower. Never printed on its own while `reason`
   * resolves.
   */
  error?: string;
  /**
   * The RAW transport text, in a slot of its own (hub#1580) — a `reqwest`/TLS chain, never
   * translated and never interpolated into the sentence. Only the faults that happened DURING the
   * call to Hacienda carry one; the ones that happen before it (no tax ID, a sample that will not
   * wrap) have no transport to quote, and an engine older than hub#1580 sends none at all.
   *
   * It is what the support desk reads to tell a bad certificate from the customer's proxy or a
   * quiet AEAT, so it is painted BESIDE the sentence rather than instead of it.
   */
  detail?: string;
  /**
   * Why nothing was filed, as a stable `{code, …facts}` the catalogue turns into a sentence
   * (hub#1578). Absent on a run from an older engine, and unknown to this catalogue on a run from
   * a newer one — both fall back to `error`.
   *
   * Only ever set beside `error`, i.e. for the faults that are OURS. What the AEAT itself answers
   * (`codigo_error` / `descripcion_error`) never carries one: Hacienda writes those in Spanish by
   * law, and support quotes them verbatim.
   */
  reason?: Record<string, unknown>;
}

interface Diagnostic {
  cert_ok?: boolean;
  /**
   * The engine's own Spanish account of the failure. Still written, still the FALLBACK: a hub
   * whose engine predates hub#1575 files nothing else, and half a sentence would be worse than a
   * Spanish one. Never printed on its own while `cert_reason` resolves.
   */
  cert_message?: string;
  /**
   * Why the test failed, as a stable `{code, …facts}` the catalogue turns into a sentence
   * (hub#1575). Absent on a run from an older engine, and unknown to this catalogue on a run from
   * a newer one — both fall back to `cert_message`.
   */
  cert_reason?: Record<string, unknown>;
  issuer_nif?: string;
  invoice_type?: string;
  recipient_nif?: string;
  environment?: string;
  sample_number?: string;
  huella?: string;
  qr_url?: string;
  aeat?: AeatResult | null;
  /** `own` / `delegated` as the CORE names them (`certificate::ROUTE_*`), so both ends say one word. */
  route?: string;
  gateway?: GatewayReadiness | null;
}

/**
 * What the fiscal cell answered about ITSELF when the diagnostic probed `/readyz` (hub#1485).
 * Only ever present on the delegated road, and `error` replaces the rest when the cell could not
 * be reached at all.
 */
interface GatewayReadiness {
  ok?: boolean;
  status?: string;
  reason?: string;
  transmission_enabled?: boolean;
  holder_nif?: string;
  error?: string;
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

/** The core door of the business certificate (hub#1844, hub#1871). */
const CERTIFICATE_PATH = '/api/business/certificate';

/**
 * Why the core refused to switch the road, as a catalogue key (hub#1871). By the stable CODE the
 * runtime sends inside `error`, never by its sentence.
 */
export function routeRefusalKey(body: Record<string, unknown>): string {
  const error = body?.error as { code?: string } | string | undefined;
  const code = typeof error === 'string' ? error : error?.code ?? '';
  if (code === 'fiscal.no_representation_grant') return 'ui.errRouteNeedsGrant';
  if (code === 'fiscal.gateway_not_enrolled') return 'ui.errRouteNeedsConnection';
  if (code === 'fiscal.own_certificate_not_uploaded') return 'ui.errRouteNeedsCertificate';
  return 'ui.errRouteSwitch';
}

/** The core's go-live door (hub#2079): the ONE way to production, with every check it makes. */
const GO_LIVE_PATH = '/api/fiscal/go-live';

/** What `GET /api/fiscal/go-live` answers: where this hub files, from the core profile. */
interface GoLiveState {
  environment?: string;
  can_go_live?: boolean;
  /** A record already left for the real AEAT: the core refuses the way back (ADR-0273 D3). */
  filed_for_real?: boolean;
}

/**
 * Why the core refused to go live (or to stand down), as a catalogue key (hub#2079). By the stable
 * CODE the runtime sends inside `error`, never by its sentence.
 */
export function goLiveRefusalKey(body: Record<string, unknown>): string {
  const error = body?.error as { code?: string } | string | undefined;
  const code = typeof error === 'string' ? error : error?.code ?? '';
  const keys: Record<string, string> = {
    'fiscal.no_representation_grant': 'ui.errGoLiveNeedsGrant',
    'fiscal.not_ready': 'ui.errGoLiveNotReady',
    'fiscal.go_live_forbidden': 'ui.errGoLiveDemo',
    'fiscal.own_certificate_expired': 'ui.errGoLiveCertificateExpired',
    'fiscal.hub_closed': 'ui.errGoLiveClosed',
    'fiscal.already_emitted': 'ui.errGoLiveIsOneWay',
    [CAPABILITY_DENIED]: 'ui.errCapabilityDenied',
  };
  return keys[code] ?? 'ui.errGoLive';
}

/**
 * Why the core did not say where the hub files when the screen READ it (verifactu#127). Opening
 * the screen is not a go-live attempt: only a revoked permission has its own sentence; no network
 * or a server error says the state could not be read, never «could not go live».
 */
export function goLiveStateUnavailableKey(body: Record<string, unknown>): string {
  const key = goLiveRefusalKey(body);
  return key === 'ui.errCapabilityDenied' ? key : 'ui.errGoLiveStateUnavailable';
}

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
    .decl h4 { margin:.9rem 0 .3rem; font-size:.9rem; }
    .decl-ref { display:flex; flex-wrap:wrap; gap:.5rem; align-items:baseline; margin:.4rem 0 0; }
    .decl-field { padding:.45rem 0; border-bottom:1px solid var(--ion-border-color, #e6e2d8); }
    .decl-field:last-child { border-bottom:none; }
    .decl-value { margin:.1rem 0 0; font-weight:600; word-break:break-all; }
    .decl-element { margin:.05rem 0 0; font-size:.72rem; color: var(--ion-color-medium, #6b7280); font-family: ui-monospace, monospace; }
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

  /**
   * La declaracion responsable de la version instalada (art. 13.2 RRSIF), leida del core.
   * `null` con `declarationError` en false = todavia no ha contestado.
   */
  @state() private declaration: SystemDeclaration | null = null;

  /** La puerta no contesto. Se DICE: una ficha muda se ve igual que un hub sin nada que declarar. */
  @state() private declarationError = false;

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
   * What the core says about the business certificate (`GET /api/business/certificate`): whether a
   * `.p12` is uploaded, and whether its owner switched it off for filing (hub#1871). `null` = the
   * door did not answer, and then the switch cannot tell «switch it on» from «upload one».
   */
  @state() private certificateStatus: { present?: boolean; use_for_transmission?: boolean } | null = null;

  /** The switch asked the core to change the road and the answer is not back yet. */
  @state() private switchingRoute = false;

  /** What the last switch did, as a catalogue key: a success notice or the reason it was refused. */
  @state() private routeNotice: { key: string; tone: 'success' | 'danger' } | null = null;

  /**
   * What the hub answered about its MACHINE identity (verifactu#76). `null` = we could not ask —
   * and then the screen says so instead of guessing at a state.
   */
  @state() private gateway: GatewayIdentityWire | null = null;

  /** The identity read is in flight, so the pill says «checking» rather than «not available». */
  @state() private gatewayLoading = true;

  /**
   * Where this hub files, as the CORE says it (`GET /api/fiscal/go-live`, hub#2079). `null` = the
   * door gave no state: see `goLiveAbsent` and `goLiveUnavailable` for why.
   */
  @state() private goLive: GoLiveState | null = null;

  /**
   * The door answered 404: a runtime older than it. ONLY then does the old select remain, because
   * on such a runtime the engine still files where the module row says.
   */
  @state() private goLiveAbsent = false;

  /**
   * The door exists but did not say where the hub files (403, no network, 5xx), as a catalogue key.
   * Never the select here (verifactu#125): the engine no longer reads it, so «Production» saved
   * there would leave the owner believing a hub that still files in testing.
   */
  @state() private goLiveUnavailable: string | null = null;

  /** A go-live or stand-down is on its way to the core. */
  @state() private switchingEnvironment = false;

  /** What the last go-live / stand-down did, as a catalogue key. */
  @state() private goLiveNotice: { key: string; tone: 'success' | 'danger' } | null = null;



  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    await this.refresh();
    // Its own clock, like the certificate status: the road below must not wait for it.
    void this.loadGoLive();
    await this.loadRoute();
    // The route is settled by the line above, so this is a decision and not a race: on the `own`
    // road there is nothing to ask for. The flag drops so no state keeps claiming a read that is
    // never going to happen.
    if (this.usesGatewayIdentity) await this.loadGatewayIdentity();
    else this.gatewayLoading = false;
    await this.loadDiag();
    await this.loadDeclaration();
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
    // Two facts from two doors, and neither waits for the other. The road is what the switch shows
    // and what gates it; the certificate status only shapes the hint and the ON branch. Painting
    // the road only once both had answered made the switch fall back to `:has_certificate` — and
    // lie — for as long as the certificate door took to answer or to be refused by the network.
    void this.loadCertificateStatus();
    await this.loadTransmission();
  }

  /** The road, from the core (`hub.fiscal.transmission`). `routeLoading` runs on this clock alone. */
  private async loadTransmission() {
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
   * Where this hub files, from the core (hub#2079). Only a 404 means «no door»; any other failure
   * is the door refusing or unreachable, and says why (verifactu#125).
   */
  private async loadGoLive() {
    const reply = await coreFetch(GO_LIVE_PATH);
    const envelope = reply.body as { data?: GoLiveState };
    this.goLive = reply.ok ? (envelope?.data ?? null) : null;
    this.goLiveAbsent = reply.status === 404;
    this.goLiveUnavailable = reply.ok || reply.status === 404 ? null : goLiveStateUnavailableKey(reply.body);
  }

  /** Reads the door again after it failed to answer; the button stays off while it does. */
  private async retryGoLive(): Promise<void> {
    this.switchingEnvironment = true;
    try {
      await this.loadGoLive();
    } finally {
      this.switchingEnvironment = false;
    }
  }

  /**
   * **The environment this hub files in** — the core's word when it gave one, the module row only
   * on a runtime that predates the go-live door. One getter for every reader (the save, the test
   * invoice, the block), so the screen cannot say two things.
   */
  private get environment(): string {
    return (this.goLive?.environment || this.cfg.environment || 'testing').trim();
  }

  /**
   * Asks for confirmation, then goes live (`POST`) or back to testing (`DELETE`) through the core.
   * The confirmation is a DOCUMENT-level alert, the same shape as the chain recovery
   * (verifactu#112): declared in this shadow root it would paint only the backdrop.
   */
  private async confirmEnvironment(live: boolean): Promise<void> {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const alert = document.createElement('ion-alert') as HTMLElement & {
      header?: string;
      message?: string;
      buttons?: Array<{ text: string; role?: string; cssClass?: string }>;
      isOpen?: boolean;
      present?: () => Promise<void>;
    };
    alert.header = t(live ? 'ui.goLiveConfirmTitle' : 'ui.standDownConfirmTitle');
    alert.message = t(live ? 'ui.goLiveConfirmMessage' : 'ui.standDownConfirmMessage');
    alert.buttons = [
      { text: t('ui.recCancel'), role: 'cancel' },
      { text: t(live ? 'ui.goLiveAction' : 'ui.standDownAction'), role: 'confirm', cssClass: 'alert-button-warning' },
    ];
    alert.addEventListener(
      'ionAlertDidDismiss',
      (ev) => {
        alert.remove();
        if ((ev as CustomEvent<{ role?: string }>).detail?.role === 'confirm') void this.switchEnvironment(live);
      },
      { once: true },
    );
    document.body.appendChild(alert);
    try {
      if (typeof alert.present === 'function') await alert.present();
      else alert.isOpen = true;
    } catch {
      // An overlay that cannot open changes nothing: staying where the hub is, is the safe outcome.
      alert.remove();
    }
  }

  /** The core decides; the environment is READ back from its answer, never assumed. */
  private async switchEnvironment(live: boolean): Promise<void> {
    this.switchingEnvironment = true;
    this.goLiveNotice = null;
    try {
      const reply = await coreFetch(GO_LIVE_PATH, { method: live ? 'POST' : 'DELETE' });
      if (reply.ok) {
        this.goLive = (reply.body as { data?: GoLiveState })?.data ?? this.goLive;
        this.goLiveNotice = { key: live ? 'ui.goLiveDone' : 'ui.standDownDone', tone: 'success' };
      } else {
        this.goLiveNotice = { key: goLiveRefusalKey(reply.body), tone: 'danger' };
        await this.loadGoLive();
      }
    } finally {
      this.switchingEnvironment = false;
    }
  }

  /** Whether a `.p12` is uploaded and switched on, from the core door. `null` = it did not answer. */
  private async loadCertificateStatus() {
    const certificate = await coreFetch(CERTIFICATE_PATH);
    const envelope = certificate.body as { data?: { present?: boolean; use_for_transmission?: boolean } };
    this.certificateStatus = certificate.ok ? (envelope?.data ?? null) : null;
  }

  /**
   * **The «Usar mi propio certificado» switch changes the road** (hub#1871). It used to navigate to
   * Configuración and change nothing: the `.p12` kept filing and the switch came back on.
   *
   * The position the owner asked for is read from the EVENT, never from a getter at the moment it
   * fires — what matters is what they saw and flipped. Three outcomes:
   *  - asking for ON with no certificate uploaded: there is nothing to switch, so the owner goes to
   *    upload one (the old navigation, now only where it is the answer);
   *  - otherwise the core decides (`PATCH /api/business/certificate`), and the road is READ back
   *    from the core, never assumed;
   *  - a refusal is said in the owner's words, and the switch goes back to the real road.
   */
  private async onOwnToggle(ev: Event): Promise<void> {
    const target = ev.target as (HTMLElement & { checked?: boolean }) | null;
    const wanted = (ev as CustomEvent<{ checked?: boolean }>).detail?.checked ?? !!target?.checked;
    if (wanted === this.signsWithOwnCertificate) return;
    // Only a door that ANSWERED «nothing uploaded» sends the owner to upload. A door that did not
    // answer is «we do not know», and the core — which does know — decides on the PATCH.
    if (wanted && this.certificateStatus && !this.certificateStatus.present) {
      if (target) target.checked = this.signsWithOwnCertificate;
      this.goConfig('own');
      return;
    }
    this.switchingRoute = true;
    this.routeNotice = null;
    try {
      const reply = await coreFetch(CERTIFICATE_PATH, {
        method: 'PATCH',
        json: { use_for_transmission: wanted },
      });
      if (reply.ok) {
        this.routeNotice = { key: wanted ? 'ui.routeSwitchedOwn' : 'ui.routeSwitchedDelegated', tone: 'success' };
        await this.loadRoute();
        if (this.usesGatewayIdentity) await this.loadGatewayIdentity();
      } else {
        this.routeNotice = { key: routeRefusalKey(reply.body), tone: 'danger' };
      }
    } finally {
      this.switchingRoute = false;
      // A refused or failed switch leaves the road where it was: the control goes back to it. The
      // toggle keeps the position the user dragged it to on its own, and Lit would not reset a
      // property whose bound value did not change.
      if (target) target.checked = this.signsWithOwnCertificate;
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
   * **May this hub run the live test?** — since hub#1485 the answer is «does it have a ROAD», not
   * «does it hold a `.p12`».
   *
   * The engine used to resolve the diagnostic through the core identity, so on the delegated road
   * it always answered «your certificate does not load» to a hub that files perfectly. This screen
   * covered for that by switching the button off and saying the test «needs a certificate of your
   * own». Both halves were the same defect: the business was sent to renew something it has never
   * had. `run_diagnostics` now goes through `resolve_route`, and on the cell it probes readiness
   * instead of filing a sample (ADR-0189 — a filed record cannot be undone), so the test is exactly
   * as available as the road is.
   *
   * The one hub still held back is the one with NO road: no certificate and no enrolment. Its
   * button would reach nothing, and what it needs is the enrolment section above, not a file
   * picker.
   */
  private get canRunLiveTest(): boolean {
    return this.signsWithOwnCertificate || (this.route === ROUTE_DELEGATED && this.cellCanBeReached);
  }

  /**
   * Whether the cell has an identity to present for this hub — false ONLY when the door has
   * positively said there is none.
   *
   * A read still in flight, and a door that could not be read at all (`unknown`), both count as
   * yes. This screen already degrades that way everywhere it touches the same facts — an unreadable
   * `notAfter` is `active` rather than `expired`, the enrolment section hides only when the core has
   * SAID `own` — and for the same reason: taking the test away from a hub over a read that did not
   * land is the shape of the bug this issue is about. The engine re-resolves the road server-side
   * and answers truthfully, so the worst case is an honest «the cell cannot file right now» instead
   * of a button that is dead for no stated reason.
   */
  private get cellCanBeReached(): boolean {
    return this.gatewayLoading || gatewayState(this.gateway, Date.now()) !== 'absent';
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
   * Lee la declaracion responsable del core. Un fallo se GUARDA como fallo: la alternativa es
   * una ficha en blanco, que ante una inspeccion se lee como «este sistema no declara nada».
   */
  private async loadDeclaration() {
    try {
      this.declaration = await fetchResponsibleDeclaration();
      this.declarationError = false;
    } catch {
      this.declaration = null;
      this.declarationError = true;
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



  /** Navigates to Settings → **Permissions** (`#permissions`), where the owner grants the module
   *  capabilities (ADR-0079). Same module→shell navigation as {@link goConfig}, and the hash
   *  matters for the same reason (verifactu#49): `/settings` bare degrades to the Hub tab
   *  (`resolveSettingsTab`), so the owner would do as told and land on a screen with nothing to
   *  press. `permissions` is one of the shell's declared tabs — it is not a hash we invented. */
  /**
   * Abre Configuracion en la pestana que toca.
   *
   * `pushState` solo cambia la URL: hay que disparar `popstate` en WINDOW (no en el elemento — un
   * `dispatchEvent` sin target se queda en el shadow root y no llega al router de Vue). Es el mismo
   * patron que {@link goToPermissions}.
   */
  private goConfig(tab: 'delegated' | 'own'): void {
    window.history.pushState({}, '', `/m/verifactu/config#${tab}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

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
        // The core's environment (hub#2079): the row is a mirror now, and saving must not make it
        // disagree with the profile. Only a runtime without the go-live door still reads it.
        environment: this.environment,
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

  /**
   * What the fiscal CELL said about itself when the diagnostic probed it (hub#1485) — present only
   * on the delegated road, absent on every run from before it.
   *
   * This is the block that replaces the AEAT verdict on that road: the test deliberately does not
   * file (ADR-0189), so «can ERPlora file for you right now» is the whole answer, and the cell's
   * own `reason` is the only actionable thing in it.
   */
  private renderTestGateway(t: (k: string) => string) {
    const g = this.diag?.gateway;
    if (!g) return nothing;
    if (g.error) {
      return html`<ok-inline-feedback tone="danger" heading=${t('ui.testGatewayNotReady')} icon="alert-circle-outline">${g.error}</ok-inline-feedback>`;
    }
    const detail = [g.status, g.reason].filter(Boolean).join(' · ');
    return html`<ok-inline-feedback
      tone=${g.ok ? 'success' : 'danger'}
      heading=${t(g.ok ? 'ui.testGatewayReady' : 'ui.testGatewayNotReady')}
      icon=${g.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'}
    >${detail}</ok-inline-feedback>`;
  }

  private renderAeat(t: (k: string) => string) {
    const a = this.diag?.aeat;
    if (!a) {
      // «Not sent» means two different things. On the OWN road it is a fault and the certificate is
      // the thing to look at. On the delegated one the engine never files the sample on purpose
      // (ADR-0189: a filed record cannot be undone, and in `production` it would burn the Anexo I),
      // so telling that business to «check the certificate» is hub#1485 all over again. The road of
      // the RUN decides, falling back to today's for a diagnostic older than that field.
      const filedByErplora = (this.diag?.route ?? this.route) === ROUTE_DELEGATED;
      return html`<ok-inline-feedback tone="neutral" icon="information-circle-outline">${t(filedByErplora ? 'ui.testAeatNotSentDelegated' : 'ui.testAeatNotSent')}</ok-inline-feedback>`;
    }
    if (a.error) {
      // WHY nothing was filed, composed from the code and not pasted from the engine (hub#1578).
      // On the own road the certificate box is GREEN — the `.p12` does load — and the failure lands
      // here, so this was the last box left reading Spanish inside an English screen, and it is the
      // one that says what to fix. Same resolver as the box above, so one run cannot be described
      // two ways; the engine prose stays as the fallback for a code this catalogue cannot name.
      const why = reasonSentence(CATALOG, erplora().locale, (catalog, key, params) => erplora().t(catalog, key, params), a.reason, (minor) => erplora().formatMoney(minor));
      // …and the raw transport chain BESIDE it when the run carries one (hub#1580). Composing the
      // sentence used to drop `error`, which on this arm was the only copy of that chain: the
      // reader gained a sentence and the support desk lost the one string that separates an
      // expired certificate from the customer's proxy. It cannot go INSIDE the sentence — the
      // catalogue forbids interpolating engine text into a reason — so it gets the secondary slot
      // the card already uses for small print. Conditional: no chain, no empty slot.
      return html`<ok-inline-feedback tone="danger" heading=${t('ui.testAeatError')} icon="alert-circle-outline">${why ?? a.error}${a.detail ? html`<p class="hint">${a.detail}</p>` : nothing}</ok-inline-feedback>`;
    }
    if (a.ok) {
      const csv = a.csv ? ` · CSV ${a.csv}` : '';
      return html`<ok-inline-feedback tone="success" heading=${t('ui.testAeatAccepted')} icon="checkmark-circle-outline">${a.estado_registro || a.estado_envio || ''}${csv}</ok-inline-feedback>`;
    }
    return html`<ok-inline-feedback tone="danger" heading=${a.estado_registro || a.estado_envio || '—'} icon="alert-circle-outline">${[a.codigo_error, a.descripcion_error].filter(Boolean).join(': ')}</ok-inline-feedback>`;
  }

  /**
   * La ficha que se le ensena a una inspeccion (art. 13.2 RRSIF).
   *
   * Rotulo -> VALOR -> nombre del elemento, apilados en una columna. El valor NO va a la derecha:
   * el mas largo es un UUID de 36 caracteres y a 390 px se montaba encima del nombre del elemento,
   * que tambien parte. Apilado se lee igual en los tres anchos y el valor queda entero.
   *
   * El nombre del elemento va en su grafia LITERAL (`NombreRazon`, `IdSistemaInformatico`): es lo
   * que pide una inspeccion y lo que lleva el XML, asi que no se traduce.
   */
  private renderDeclaration(t: (k: string) => string) {
    const d = this.declaration;
    return html`<div class="card decl">
      <div class="card-body">
        <h3>${t('ui.declTitle')}</h3>
        <p class="hint">${t('ui.declDesc')}</p>
        ${this.declarationError
          ? html`<ok-inline-feedback
              data-testid="declaration-error"
              tone="danger"
              icon="alert-circle-outline"
            >${t('ui.declError')}</ok-inline-feedback>`
          : nothing}
        ${d
          ? html`
              <p class="decl-ref">
                <a
                  class="link"
                  data-testid="declaration-link"
                  href=${d.declarationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >${t('ui.declRead')}</a>
                ${d.declarationVersion
                  ? html`<span class="k">${t('ui.declTextVersion')} <strong>${d.declarationVersion}</strong></span>`
                  : nothing}
              </p>
              <h4>${t('ui.declDataTitle')}</h4>
              ${!d.sistemaInformatico
                ? html`<ok-inline-feedback
                    data-testid="declaration-pending"
                    tone="warning"
                    icon="information-circle-outline"
                  >${t('ui.declPending')}</ok-inline-feedback>`
                : nothing}
              ${this.declarationRows(d, t).map(
                (row) => html`<div class="decl-field">
                  <span class="k">${row.label}</span>
                  <p class="decl-value">${row.value}</p>
                  <p class="decl-element">${row.field}</p>
                </div>`,
              )}
            `
          : nothing}
      </div>
    </div>`;
  }

  /**
   * Las filas de la ficha. Con el bloque del fabricante van los nueve elementos; sin el, van los
   * dos que este hub sabe de si mismo — la version del binario y su numero de instalacion —, que
   * es informacion cierta y util aunque falte la otra mitad.
   */
  private declarationRows(
    d: SystemDeclaration,
    t: (k: string) => string,
  ): Array<{ field: DeclarationField; label: string; value: string }> {
    const block = d.sistemaInformatico;
    const own: Record<string, string> = { Version: d.version, NumeroInstalacion: d.numeroInstalacion };
    const fields = block ? DECLARATION_FIELDS : (['Version', 'NumeroInstalacion'] as const);
    return fields.map((field) => ({
      field,
      label: t(`ui.decl${field}`),
      value: block ? block[field] : (own[field] ?? ''),
    }));
  }

  private renderTestCard(t: (k: string) => string) {
    const d = this.diag;
    const isTesting = this.environment === 'testing';
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
          <ion-button @click=${() => this.runTest()} ?disabled=${this.testing || !this.canRunLiveTest}>${this.testing ? t('ui.testRunning') : t('ui.testRun')}</ion-button>
          <ion-button fill="outline" @click=${() => this.createTestInvoice()} ?disabled=${this.creatingInvoice || !canCreateInvoice}>${this.creatingInvoice ? t('ui.testCreateInvoiceRunning') : t('ui.testCreateInvoice')}</ion-button>
        </div>
        ${!isTesting ? html`<p class="hint">${t('ui.testInvoiceTestingOnly')}</p>` : nothing}
        ${this.invoiceCreated ? html`<ok-inline-feedback tone="success" icon="checkmark-circle-outline">${t('ui.testInvoiceCreated')}</ok-inline-feedback>` : nothing}
        <!-- Why the button is off, in the terms of the road this hub is actually on (verifactu#41).
             It used to read «not configured — Choose file…», which was a file picker's label
             pasted where a reason belongs: it named no road and pointed at nothing to press.
             Then, while the engine still demanded the core identity, the delegated road was told
             the test «needs a certificate of your own» — the hub#1485 defect, since that hub has
             none and never will. With the engine on resolve_route the only hub left without a
             test is the one without a ROAD, and what it needs is the enrolment above.
             Silent while either read is in flight: «you have not enrolled» is a claim, and we do
             not get to make it before the door has answered. -->
        ${this.canRunLiveTest || this.routeLoading || this.gatewayLoading
          ? nothing
          : html`<p class="hint">${t(this.route === ROUTE_DELEGATED ? 'ui.testNeedsGatewayIdentity' : 'ui.testNeedsOwnCertificate')}</p>`}
        ${d
          ? html`
              <!-- WHY it failed, composed from the code and not pasted from the engine
                   (hub#1575). The same composer the events list uses, so the two surfaces cannot
                   describe one run differently; the engine prose stays as the fallback for a run
                   this catalogue cannot name. -->
              <ok-inline-feedback tone=${d.cert_ok ? 'success' : 'danger'} heading=${t('ui.testCert')} icon="ribbon-outline">${certReasonSentence(CATALOG, erplora().locale, (catalog, key, params) => erplora().t(catalog, key, params), d as Record<string, unknown>, (minor) => erplora().formatMoney(minor)) ?? d.cert_message ?? ''}</ok-inline-feedback>
              ${this.renderTestGateway(t)}
              <!-- WHICH road answered (hub#1485). Read off the RUN and not off the current state:
                   a diagnostic from before an enrolment describes the road it actually took, and
                   relabelling it with today's would rewrite history on screen. Omitted for a run
                   older than hub#1485, which did not record one. -->
              ${d.route
                ? html`<div class="kv"><span class="k">${t('ui.testRoute')}</span><span>${t(d.route === ROUTE_DELEGATED ? 'ui.routeDelegated' : 'ui.routeOwn')}</span></div>`
                : nothing}
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
   * Where the hub files and the ONE way to change it (hub#2079): the core's go-live, never a
   * select. Buttons, not a form field, because it is not saved with the form — it is its own act,
   * confirmed, with its own refusals.
   */
  private renderEnvironment(t: (k: string) => string) {
    const live = this.environment === 'production';
    const g = this.goLive ?? {};
    return html`<ion-item lines="none">
      <div class="prod">
        <div class="kv">
          <span class="k">${t('ui.envAeat')}</span>
          <ok-status-pill data-testid="settings-environment" tone=${live ? 'success' : 'neutral'}>${t(live ? 'ui.envProduction' : 'ui.envTesting')}</ok-status-pill>
        </div>
        ${!live && g.can_go_live
          ? html`<p class="hint">${t('ui.goLiveHint')}</p>
            <ion-button size="small" data-testid="settings-go-live" ?disabled=${this.switchingEnvironment} @click=${() => void this.confirmEnvironment(true)}>
              <ion-icon slot="start" name="rocket-outline"></ion-icon>
              ${t('ui.goLiveAction')}
            </ion-button>`
          : nothing}
        ${!live && !g.can_go_live ? html`<p class="hint">${t('ui.goLiveDemoHint')}</p>` : nothing}
        ${live && !g.filed_for_real
          ? html`<p class="hint">${t('ui.standDownHint')}</p>
            <ion-button size="small" fill="outline" data-testid="settings-stand-down" ?disabled=${this.switchingEnvironment} @click=${() => void this.confirmEnvironment(false)}>
              ${t('ui.standDownAction')}
            </ion-button>`
          : nothing}
        ${live && g.filed_for_real ? html`<p class="hint">${t('ui.goLiveOneWayHint')}</p>` : nothing}
        ${this.goLiveNotice
          ? html`<ok-inline-feedback tone=${this.goLiveNotice.tone} data-testid="settings-go-live-notice">${t(this.goLiveNotice.key)}</ok-inline-feedback>`
          : nothing}
      </div>
    </ion-item>`;
  }

  /**
   * The door exists but did not answer (verifactu#125): the reason and a retry, read-only. No pill,
   * because we do not know where the hub files; no select, because the engine does not read it.
   */
  private renderGoLiveUnavailable(t: (k: string) => string) {
    return html`<ion-item lines="none">
      <div class="prod">
        <span class="k">${t('ui.envAeat')}</span>
        <ok-inline-feedback tone="warning" data-testid="settings-go-live-unavailable">${t(this.goLiveUnavailable ?? 'ui.errGoLiveStateUnavailable')}</ok-inline-feedback>
        ${this.goLiveNotice
          ? html`<ok-inline-feedback tone=${this.goLiveNotice.tone} data-testid="settings-go-live-notice">${t(this.goLiveNotice.key)}</ok-inline-feedback>`
          : nothing}
        <ion-button size="small" fill="outline" data-testid="settings-go-live-retry" ?disabled=${this.switchingEnvironment} @click=${() => void this.retryGoLive()}>
          <ion-icon slot="start" name="refresh-outline"></ion-icon>
          ${t('ui.actionRetry')}
        </ion-button>
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
      <!-- El permiso del certificado, SOLO cuando el runtime lo ha denegado de verdad
           (verifactu#62). Como fila permanente era un espejo de Ajustes → Permisos y no se podía
           tocar; como aviso es lo único que hay entre «he pulsado probar» y el silencio. Lo que
           falta ANTES de intentarlo lo dice la franja de arriba, que alimenta el bloque setup
           del manifest. (Sin acentos graves en un comentario de plantilla Lit: rompen el bundle.) -->
      ${this.capabilityDenied
        ? html`<ok-inline-feedback
            tone="danger"
            icon="key-outline"
            heading=${t('ui.capabilityTitle')}
          >
            ${t('ui.capabilityHint')}
            <ion-button size="small" fill="outline" @click=${() => this.goToPermissions()}>
              <ion-icon slot="start" name="open-outline"></ion-icon>
              ${t('ui.capabilityGoPermissions')}
            </ion-button>
          </ok-inline-feedback>`
        : nothing}
      <div class="cols">
        <form class="card" @submit=${(e: Event) => this.save(e)}>
          <ion-list>
            <ion-item>
              <ion-toggle style=${GREEN} ?checked=${!!this.cfg.enabled} @ionChange=${(e: any) => this.set('enabled', e.target.checked)}>${t('ui.enableVerifactu')}</ion-toggle>
            </ion-item>
            <!-- La VIA, como interruptor (hub#1871): es una ELECCION que se guarda en el core.
                 Apagarlo deja el .p12 guardado y remite ERPlora; encenderlo sin .p12 lleva a
                 subirlo. Lo que se toca a diario vive aqui; lo que cuesta —el fichero y el
                 papeleo— vive en Configuracion. -->
            <ion-item lines="none">
              <div class="cert">
                <div class="cert-head">
                  <ion-label>${t('ui.cfgOwnTitle')}</ion-label>
                  <ion-toggle
                    style=${GREEN}
                    data-testid="settings-own-certificate"
                    ?checked=${this.signsWithOwnCertificate}
                    ?disabled=${this.routeLoading || this.switchingRoute}
                    @ionChange=${(e: Event) => void this.onOwnToggle(e)}
                  ></ion-toggle>
                </div>
                <p class="hint">${t(
                  this.signsWithOwnCertificate
                    ? 'ui.cfgOwnOnHint'
                    : this.certificateStatus?.present
                      ? 'ui.cfgOwnOffKeptHint'
                      : 'ui.cfgOwnOffHint',
                )}</p>
                ${this.routeNotice
                  ? html`<ok-inline-feedback tone=${this.routeNotice.tone} data-testid="settings-route-notice">${t(this.routeNotice.key)}</ok-inline-feedback>`
                  : nothing}
                <ion-button size="small" fill="outline" @click=${() => this.goConfig(this.signsWithOwnCertificate ? 'own' : 'delegated')}>
                  <ion-icon slot="start" name="open-outline"></ion-icon>
                  ${t('ui.cfgGoConfig')}
                </ion-button>
              </div>
            </ion-item>
            ${this.goLive ? this.renderEnvironment(t) : this.goLiveUnavailable ? this.renderGoLiveUnavailable(t) : !this.goLiveAbsent ? nothing : html`<ion-item>
              <ion-select label=${t('ui.envAeat')} label-placement="stacked" .value=${this.cfg.environment || 'testing'} @ionChange=${(e: any) => this.set('environment', e.target.value)}>
                <ion-select-option value="testing">${t('ui.envTesting')}</ion-select-option>
                <ion-select-option value="production">${t('ui.envProduction')}</ion-select-option>
              </ion-select>
            </ion-item>`}
          </ion-list>
          <div class="card-actions">
            <ion-button type="submit" ?disabled=${this.saving || this.loading}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
          </div>
        </form>

        ${this.renderTestCard(t)}
        ${this.renderDeclaration(t)}
      </div>
    `;
  }
}

define('erp-verifactu-settings', ErpVerifactuSettings);
