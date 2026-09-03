// verifactu#76 — the machine identity that opens the DELEGATED road, read and asked for from the
// module's own screen.
//
// ADR-0320 §1 gives a hub without its own `.p12` one way to the AEAT: the fiscal cell files for it
// with ERPlora's Sello. That road needs the hub to hold a **machine identity** — a private key born
// on the hub that never leaves it, and a certificate an operator signs with the internal CA, which
// is OFFLINE (ADR-0419). Until ERPlora/hub#1457 both legs were a human's: somebody pulled the CSR
// out of the hub and pushed the signed certificate back. That does not scale past one hub.
//
// hub#1457 (cerrada) + hub#1481 (mergeada) built the door that replaces the human, and built it
// FOR this screen — `crates/server/src/gateway_enrolment.rs` says so where it reserves half the
// control plane's allowance: «the screen of the `verifactu` module shares this quota and an
// operator pressing "enrol" must never find it spent by a background loop».
//
// This file pins the two halves the screen owes:
//
//   1. **Reading the state** — four situations a person can act on, derived from the two booleans
//      and the date the door publishes, never from prose.
//   2. **Naming a refusal** — every answer of `POST …/enrol` resolves to a catalogue key, keyed on
//      the CODE (ADR-0055) and never on the sentence, which is dev English from the control plane.
//
// The private key is NOT in any of this: what the door publishes is `has_key`/`has_certificate`,
// names and a date. No byte of key material has a road to the browser, and no test here may
// introduce one.
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  EXPIRY_WARNING_DAYS,
  GATEWAY_ENROL_PATH,
  GATEWAY_IDENTITY_PATH,
  HUB_SESSION_KEY,
  enrolOutcome,
  gatewayFetch,
  gatewayState,
  refusalKey,
} from './gateway-identity';

const DAY = 86_400_000;
const NOW = Date.parse('2026-09-03T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

describe('the state of the machine identity, as a person can act on it (verifactu#76)', () => {
  it('a hub that never asked has NO identity', () => {
    expect(gatewayState({ has_key: false, has_certificate: false }, NOW)).toBe('absent');
  });

  it('a key with no certificate is an enrolment IN FLIGHT, waiting for a person to sign', () => {
    // The same rule the runtime itself uses (`gateway_enrolment::enrolment_in_flight`): a key only
    // exists because somebody asked for the CSR on THIS hub.
    expect(gatewayState({ has_key: true, has_certificate: false }, NOW)).toBe('pending');
  });

  it('a certificate with room left is ACTIVE', () => {
    expect(gatewayState({ has_key: true, has_certificate: true, not_after: iso(NOW + 200 * DAY) }, NOW))
      .toBe('active');
  });

  it(`warns EXPIRING inside the last ${EXPIRY_WARNING_DAYS} days, not before`, () => {
    const inside = gatewayState({ has_key: true, has_certificate: true, not_after: iso(NOW + 10 * DAY) }, NOW);
    const outside = gatewayState(
      { has_key: true, has_certificate: true, not_after: iso(NOW + (EXPIRY_WARNING_DAYS + 5) * DAY) },
      NOW,
    );
    expect(inside, 'a certificate about to die was painted as healthy').toBe('expiring');
    expect(outside, 'a healthy certificate was painted as dying').toBe('active');
  });

  it('a past date is EXPIRED — the road is shut, and saying "active" would hide it', () => {
    expect(gatewayState({ has_key: true, has_certificate: true, not_after: iso(NOW - DAY) }, NOW)).toBe('expired');
  });

  it('the LAST day is still valid: `not_after` is a day, not an instant', () => {
    // The door publishes `notAfter` as `YYYY-MM-DD` (`gateway_identity::GatewayIdentityStatus`).
    // Reading it as midnight would declare a certificate dead for the whole of its last day.
    expect(gatewayState({ has_key: true, has_certificate: true, not_after: iso(NOW) }, NOW)).not.toBe('expired');
  });

  it('a certificate whose date cannot be read is ACTIVE, never expired', () => {
    // Failing towards «expired» would tell a business its road is shut over a parsing problem.
    for (const not_after of ['', 'not-a-date', undefined]) {
      expect(gatewayState({ has_key: true, has_certificate: true, not_after }, NOW)).toBe('active');
    }
  });

  it('no answer at all is UNKNOWN — the screen never invents an identity', () => {
    expect(gatewayState(null, NOW)).toBe('unknown');
  });
});

describe('every answer of the enrol door has a sentence (verifactu#76)', () => {
  it.each([
    ['filed', 'ui.gwFiled', 'success'],
    ['awaiting_review', 'ui.gwAwaitingReview', 'info'],
    ['installed', 'ui.gwInstalled', 'success'],
    ['rejected', 'ui.gwRejected', 'danger'],
    ['out_of_budget', 'ui.gwOutOfBudget', 'warning'],
  ])('`%s` reads as %s', (state, key, tone) => {
    expect(enrolOutcome(state)).toEqual({ key, tone });
  });

  it('a state the door adds later is shown, not swallowed', () => {
    // `EnrolmentOutcome` can grow. An unknown variant must still say something a person can report.
    expect(enrolOutcome('something_new').key).toBe('ui.gwOutcomeUnknown');
  });
});

describe('a refusal is named by its CODE, never by the runtime prose (verifactu#76)', () => {
  it.each([
    // Actionable on its own: this hub has not finished its bootstrap.
    ['enrolment.no_machine_credential', 'ui.gwErrNoMachineCredential'],
    // Actionable on its own: the hub cannot even produce the CSR.
    ['enrolment.csr_unavailable', 'ui.gwErrCsrUnavailable'],
    // Both mean «we could not talk to ERPlora»; a person does the same thing about either.
    ['enrolment.cloud_unreachable', 'ui.gwErrCloudUnreachable'],
    ['enrolment.cloud_refused', 'ui.gwErrCloudUnreachable'],
    // Four ways of «it was signed but this hub cannot install it» — same one action: report it.
    ['enrolment.no_issued_document', 'ui.gwErrNotInstallable'],
    ['enrolment.issued_not_base64', 'ui.gwErrNotInstallable'],
    ['enrolment.issued_without_ca', 'ui.gwErrNotInstallable'],
    ['enrolment.install_refused', 'ui.gwErrNotInstallable'],
  ])('`%s` → %s', (code, key) => {
    expect(refusalKey(code)).toBe(key);
  });

  it("the control plane's OWN codes fall back to a sentence that still names the code", () => {
    // `EnrolmentRefusal` forwards the SaaS vocabulary verbatim (`invalid_csr`,
    // `csr_common_name_mismatch`, `document_too_large`…) so both sides describe one failure with
    // one word. The screen cannot have a sentence per value, but it must not go silent either.
    for (const code of ['invalid_csr', 'csr_common_name_mismatch', 'document_too_large']) {
      expect(refusalKey(code)).toBe('ui.gwErrRefused');
    }
  });
});

describe('the seam that reaches the core route (verifactu#76)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.localStorage?.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('carries the session the runtime reads, same-origin', async () => {
    // `auth::require_user_session` reads `X-Hub-Session`, and the shell keeps it under the SAME
    // localStorage key its own `runtimeHeaders()` uses (`apps/web/src/lib/session.ts`). This is
    // the one place the module touches shell state — the same seam `printing` already documents.
    globalThis.localStorage.setItem(HUB_SESSION_KEY, 'sess-abc');
    const spy = vi.fn(async () => new Response(JSON.stringify({ has_key: true }), { status: 200 }));
    globalThis.fetch = spy as unknown as typeof fetch;

    const reply = await gatewayFetch(GATEWAY_IDENTITY_PATH, 'GET');

    const [path, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/business/gateway-identity');
    expect((init.headers as Record<string, string>)['X-Hub-Session']).toBe('sess-abc');
    expect(init.credentials).toBe('same-origin');
    expect(reply).toEqual({ ok: true, status: 200, body: { has_key: true } });
  });

  it('does not send an empty session header when there is none to read', async () => {
    const spy = vi.fn(async () => new Response('{}', { status: 200 }));
    globalThis.fetch = spy as unknown as typeof fetch;
    await gatewayFetch(GATEWAY_ENROL_PATH, 'POST');
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(Object.keys(init.headers as Record<string, string>)).not.toContain('X-Hub-Session');
    expect(init.method).toBe('POST');
  });

  it('hands the refusal back with its status and body instead of throwing', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: false, code: 'enrolment.cloud_unreachable', detail: 'x' }), {
        status: 422,
      })) as unknown as typeof fetch;
    const reply = await gatewayFetch(GATEWAY_ENROL_PATH, 'POST');
    expect(reply.ok).toBe(false);
    expect(reply.status).toBe(422);
    expect(reply.body.code).toBe('enrolment.cloud_unreachable');
  });

  it('survives a body that is not JSON (a proxy page, a 502)', async () => {
    globalThis.fetch = (async () => new Response('<html>502</html>', { status: 502 })) as unknown as typeof fetch;
    const reply = await gatewayFetch(GATEWAY_IDENTITY_PATH, 'GET');
    expect(reply).toEqual({ ok: false, status: 502, body: {} });
  });

  it('a network failure is an answer, not an exception the screen has to catch twice', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const reply = await gatewayFetch(GATEWAY_IDENTITY_PATH, 'GET');
    expect(reply.ok).toBe(false);
    expect(reply.status).toBe(0);
  });
});
