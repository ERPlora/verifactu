/**
 * **The machine identity that opens the delegated road** (verifactu#76, ADR-0320 §1 / ADR-0419).
 *
 * A hub without its own `.p12` reaches the AEAT through the fiscal cell, which files on its behalf
 * with ERPlora's Sello. For the cell to accept it, the hub must hold a machine identity: a private
 * key **born on the hub that never leaves it**, and a certificate an operator signs with the
 * internal CA — which is offline, so a person is always in the loop.
 *
 * ERPlora/hub#1457 built the door that replaces the human errand, and built it for this screen:
 * `POST /api/business/gateway-identity/enrol` files the CSR in the hub's legal-document file at the
 * control plane and collects the certificate once somebody approves it, using the machine
 * credential — a secret of the runtime that never reaches a browser (ADR-0003). Half the control
 * plane's hourly allowance is deliberately left free for this screen, so an operator pressing the
 * button never finds it spent by the background service.
 *
 * Everything here is state and vocabulary. **No key material has a road to this file**: what the
 * door publishes is two booleans, a common name and a date.
 */

/** `GET`: what exists — `{ has_key, has_certificate, common_name, not_after }`. User session. */
export const GATEWAY_IDENTITY_PATH = '/api/business/gateway-identity';

/** `POST`: the whole enrolment, idempotent. **Admin** session (`require_admin_session`). */
export const GATEWAY_ENROL_PATH = '/api/business/gateway-identity/enrol';

/**
 * `X-Hub-Session`: what `auth::require_user_session` reads on every core route, kept by the shell
 * under the same `localStorage` key its own `runtimeHeaders()` uses (`apps/web/src/lib/session.ts`).
 *
 * This is the ONE place this module touches shell state, and it is the seam the `printing` module
 * already documents for the same reason: the SDK has no door for core REST — `ErploraClient` never
 * exposes its transport and `coreRequest` is private by design. The screen runs inside the shell's
 * page, same origin, so the route that exists for a module is the document it lives in. The day the
 * shell offers a proper door, {@link gatewayFetch} is the single function to swap.
 */
export const HUB_SESSION_KEY = 'erplora.hub_session';

/**
 * How close to `notAfter` counts as «expiring».
 *
 * 30 days is the PKI convention (ACME renews there, and every certificate dashboard warns there),
 * and it is the right size for this chain specifically: renewing means an operator walking a CSR to
 * an **offline** CA, which is an errand measured in days, not minutes. Warning later would leave a
 * business with a shut road and no time; warning earlier would nag for a month about nothing.
 */
export const EXPIRY_WARNING_DAYS = 30;

/** What `GET /api/business/gateway-identity` answers. Names and dates, never key material. */
export interface GatewayIdentityWire {
  has_key?: boolean;
  has_certificate?: boolean;
  common_name?: string;
  /** `notAfter` of the installed certificate as `YYYY-MM-DD`; absent without one. */
  not_after?: string;
}

/** The situations a person can act on, which is a smaller set than the door's fields. */
export type GatewayState = 'unknown' | 'absent' | 'pending' | 'active' | 'expiring' | 'expired';

/**
 * The state of this hub's machine identity, from what the door published.
 *
 * `has_key && !has_certificate` is «in flight» and not «half broken» — it is the SAME rule the
 * runtime uses to decide whether to keep polling (`gateway_enrolment::enrolment_in_flight`), because
 * a key only ever exists on a hub where somebody asked for the CSR.
 *
 * A date that cannot be read degrades to `active`, never to `expired`: failing the other way would
 * tell a business its road to the tax authority is shut over a parsing problem.
 */
export function gatewayState(wire: GatewayIdentityWire | null, nowMs: number): GatewayState {
  if (!wire) return 'unknown';
  if (!wire.has_certificate) return wire.has_key ? 'pending' : 'absent';
  const iso = (wire.not_after ?? '').trim();
  if (!iso) return 'active';
  // `notAfter` is a DAY, not an instant: a certificate valid «until 2026-09-03» is valid for the
  // whole of that day, so reading it as midnight would declare it dead a day early.
  const endOfDay = Date.parse(`${iso}T23:59:59Z`);
  if (Number.isNaN(endOfDay)) return 'active';
  if (endOfDay < nowMs) return 'expired';
  return endOfDay - nowMs <= EXPIRY_WARNING_DAYS * 86_400_000 ? 'expiring' : 'active';
}

/** Every variant of `EnrolmentOutcome`, with the sentence and the tone it earns. */
const OUTCOMES: Record<string, { key: string; tone: string }> = {
  filed: { key: 'ui.gwFiled', tone: 'success' },
  awaiting_review: { key: 'ui.gwAwaitingReview', tone: 'info' },
  installed: { key: 'ui.gwInstalled', tone: 'success' },
  rejected: { key: 'ui.gwRejected', tone: 'danger' },
  out_of_budget: { key: 'ui.gwOutOfBudget', tone: 'warning' },
};

/**
 * What the enrol door concluded, as something to show. An outcome the door grows later still gets
 * a sentence — going silent about an answer we did receive is how a screen looks broken.
 */
export function enrolOutcome(state: string): { key: string; tone: string } {
  return OUTCOMES[state] ?? { key: 'ui.gwOutcomeUnknown', tone: 'warning' };
}

/**
 * A refusal code → the sentence it earns.
 *
 * Collapsed on purpose, by what a PERSON can do about it and not by what the runtime distinguishes:
 * the four ways of «it came back signed and this hub cannot install it» ask for exactly one action
 * (report it), and so do the two ways of «we could not talk to ERPlora». The raw code is shown
 * beside the sentence, so support never loses the distinction the runtime made.
 */
const REFUSAL_KEYS: Record<string, string> = {
  'enrolment.no_machine_credential': 'ui.gwErrNoMachineCredential',
  'enrolment.csr_unavailable': 'ui.gwErrCsrUnavailable',
  'enrolment.cloud_unreachable': 'ui.gwErrCloudUnreachable',
  'enrolment.cloud_refused': 'ui.gwErrCloudUnreachable',
  'enrolment.no_issued_document': 'ui.gwErrNotInstallable',
  'enrolment.issued_not_base64': 'ui.gwErrNotInstallable',
  'enrolment.issued_without_ca': 'ui.gwErrNotInstallable',
  'enrolment.install_refused': 'ui.gwErrNotInstallable',
};

/**
 * The catalogue key for a refusal, keyed on the CODE (ADR-0055) and never on the sentence — the
 * `detail` the door sends is dev English written for whoever reads a log.
 *
 * A code we do not know is the **control plane's own** (`invalid_csr`, `csr_common_name_mismatch`,
 * `document_too_large`…): `EnrolmentRefusal` forwards that vocabulary verbatim so both sides
 * describe one failure with one word. There cannot be a sentence per value here, so it falls back
 * to one that still names the code.
 */
export function refusalKey(code: string): string {
  return REFUSAL_KEYS[code] ?? 'ui.gwErrRefused';
}

/** What a call to a core route came back with. `status: 0` = the request never left. */
export interface GatewayReply {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

/** The hub session the shell keeps, or `null` where there is none to read (locked-down browser). */
function hubSession(): string | null {
  try {
    return globalThis.localStorage?.getItem(HUB_SESSION_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Same-origin call to a core route, carrying the session the runtime expects.
 *
 * Nothing throws: a network failure, a proxy page and a refusal are all ANSWERS with a status the
 * caller can paint. A screen that has to catch as well as branch ends up with a path nobody wrote,
 * and that path is always the one a customer hits.
 */
export async function gatewayFetch(path: string, method: 'GET' | 'POST'): Promise<GatewayReply> {
  const headers: Record<string, string> = {};
  const session = hubSession();
  if (session) headers['X-Hub-Session'] = session;
  let res: Response;
  try {
    res = await fetch(path, { method, headers, credentials: 'same-origin' });
  } catch {
    return { ok: false, status: 0, body: {} };
  }
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await res.json();
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
  } catch {
    body = {};
  }
  return { ok: res.ok, status: res.status, body };
}
