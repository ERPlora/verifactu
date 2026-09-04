// hub#1485 — «Probar conexión» on the DELEGATED road.
//
// The engine used to resolve the diagnostic through `build_identity`, which only knows about the
// business's own `.p12`. A hub that files through the fiscal cell (ADR-0320: ERPlora presents with
// its Seal, the business holds no certificate) was therefore told its certificate would not load —
// and sent off to renew one it has never had. hub#1485 moved `run_diagnostics` onto `resolve_route`,
// the same door transmission and consult already use, so the engine now answers per road:
//
//   own       → files the sample to the AEAT, as always;
//   delegated → does NOT file (ADR-0189: a filed record cannot be undone, and in `production` the
//               sample would burn the Anexo I), and probes the cell's `/readyz` instead. `aeat`
//               stays null and `details` carries `route` + `gateway`.
//
// This file pins the SCREEN's half of that: the road decides what the card offers and what it says.
// Before it, the module deliberately switched the live test OFF on the delegated road and explained
// that «the live test needs a certificate of your own» — true against the old engine, and exactly
// the sentence hub#1485 exists to delete.
//
// The component is imported STATICALLY on purpose (verifactu#31): a dynamic import inside a test
// charges the whole OutfitKit/SDK transform to that test's 5 s budget.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-settings';
import { HUB_SESSION_KEY } from '../../lib/gateway-identity';

const originalFetch = globalThis.fetch;

/** A cell identity that is installed and nowhere near expiry, i.e. a hub that CAN reach the cell. */
const ENROLLED = { has_key: true, has_certificate: true, common_name: 'hub-h1.fiscal.erplora.internal', not_after: '2099-01-01' };

/**
 * Mounts the screen with the road the core reports and the last diagnostic the engine wrote.
 * `identity` is what `/api/business/gateway-identity` answers — `absent` here is a hub that has
 * not enrolled yet.
 */
async function mountWith(
  { route, details, identity = ENROLLED, locale = 'es' }:
  { route: string; details?: Record<string, unknown>; identity?: unknown; locale?: string },
) {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'verifactu.config.get') return [{ issuer_nif: 'B12345678', environment: 'testing', has_certificate: 1 }];
      if (name === 'hub.fiscal.transmission') return [{ transmission_route: route }];
      if (name === 'verifactu.diagnostics.last') return details ? [{ details: JSON.stringify(details) }] : [];
      return [];
    },
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale,
    // The shell's `t`, minus the wording: returns the key, so a test names a KEY and never prose
    // (ADR-0055). Which sentence each key carries is pinned by the catalogue parity test.
    t: (_catalog: unknown, key: string) => key,
  };
  globalThis.fetch = (async (path: string) => (path === '/api/business/gateway-identity'
    ? new Response(JSON.stringify(identity), { status: 200 })
    : new Response('{}', { status: 200 }))) as unknown as typeof fetch;

  const el = document.createElement('erp-verifactu-settings') as HTMLElement & { shadowRoot: ShadowRoot };
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el;
}

/** The «Run test» button — found by the label key, so a reordered card cannot silently match another. */
function testButton(el: HTMLElement & { shadowRoot: ShadowRoot }) {
  return [...el.shadowRoot.querySelectorAll('ion-button')]
    .find((b) => (b.textContent ?? '').includes('ui.testRun')) as HTMLElement | undefined;
}

/**
 * What the TEST card renders, attributes included — and nothing else on the screen.
 *
 * Two traps this closes. `ok-inline-feedback` takes its heading as an ATTRIBUTE, so reading
 * `textContent` would miss every heading and make «the card does not say X» pass for free. And the
 * road block (`renderRoute`) already prints `ui.routeOwn`/`ui.routeDelegated` in its own card at the
 * top: asserting against the whole shadow root would let the test card say nothing about the road
 * and still pass.
 */
function cardText(el: HTMLElement & { shadowRoot: ShadowRoot }) {
  const card = [...el.shadowRoot.querySelectorAll('.card')]
    .find((c) => c.innerHTML.includes('ui.testTitle'));
  if (!card) throw new Error('the live-test card is not on the screen');
  return card.innerHTML;
}

beforeEach(() => {
  document.body.replaceChildren();
  globalThis.localStorage?.setItem(HUB_SESSION_KEY, 'sess-abc');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('the live test follows the ROAD, not the certificate (hub#1485)', () => {
  it('is offered to a hub that files through the cell', async () => {
    const el = await mountWith({ route: 'delegated' });

    const button = testButton(el);
    expect(button, 'the run-test button is not on the card').toBeTruthy();
    expect(button!.hasAttribute('disabled'), 'the cell road may run the test since hub#1485').toBe(false);
  });

  it('is still offered on the own road', async () => {
    const el = await mountWith({ route: 'own' });
    expect(testButton(el)!.hasAttribute('disabled')).toBe(false);
  });

  // The one road where the button has nothing to reach: no certificate of its own AND no identity
  // the cell would accept. It is sent to the enrolment section above rather than to a `.p12`.
  it('is withheld from a hub with no road at all, and says which one to open', async () => {
    const el = await mountWith({ route: 'delegated', identity: { has_key: false, has_certificate: false } });

    expect(testButton(el)!.hasAttribute('disabled')).toBe(true);
    expect(cardText(el)).toContain('ui.testNeedsGatewayIdentity');
    expect(cardText(el), 'a hub with no .p12 must not be sent to renew one').not.toContain('ui.testNeedsOwnCertificate');
  });
});

describe('the result names the road it took (hub#1485)', () => {
  const DELEGATED_OK = {
    cert_ok: true,
    cert_message: 'Pasarela fiscal disponible: ERPlora presenta por ti.',
    route: 'delegated',
    environment: 'testing',
    huella: 'ABC123',
    aeat: null,
    gateway: { ok: true, status: 'ready', reason: '', transmission_enabled: true, holder_nif: 'B12345678' },
  };

  it('does not blame a certificate for a sample the cell road never files', async () => {
    const el = await mountWith({ route: 'delegated', details: DELEGATED_OK });

    const text = cardText(el);
    // `ui.testAeatNotSent` reads «Send not attempted (check the certificate)». On this road NOT
    // sending is the correct outcome, so pointing at a certificate is the hub#1485 defect again.
    // Matched with a boundary, never as a substring: `ui.testAeatNotSentDelegated` — the key that
    // is SUPPOSED to be here — contains the other one whole, so a plain `toContain` could never
    // fail and the guard would be decorative.
    expect(text, 'the delegated road never files a sample: that is by design, not a fault')
      .not.toMatch(/ui\.testAeatNotSent(?![A-Za-z])/);
    expect(text).toContain('ui.testAeatNotSentDelegated');
  });

  it('paints the road and the readiness of the cell', async () => {
    const el = await mountWith({ route: 'delegated', details: DELEGATED_OK });

    const text = cardText(el);
    expect(text, 'the card must say WHICH road answered').toContain('ui.testRoute');
    expect(text).toContain('ui.routeDelegated');
    expect(text, 'the cell answered ready, and the card has to show it').toContain('ui.testGatewayReady');
  });

  it('shows the reason the cell gave when it cannot file', async () => {
    const el = await mountWith({
      route: 'delegated',
      details: { ...DELEGATED_OK, cert_ok: false, gateway: { ok: false, status: 'degraded', reason: 'seal_unavailable', transmission_enabled: false, holder_nif: '' } },
    });

    const text = cardText(el);
    expect(text).toContain('ui.testGatewayNotReady');
    expect(text, 'the reason the cell gave is the only actionable thing here').toContain('seal_unavailable');
  });

  it('leaves the own road exactly as it was: it files, and the AEAT answers', async () => {
    const el = await mountWith({
      route: 'own',
      details: { cert_ok: true, cert_message: 'ok', route: 'own', environment: 'testing', aeat: { ok: true, estado_registro: 'Correcto', csv: 'CSV-1' }, gateway: null },
    });

    const text = cardText(el);
    expect(text).toContain('ui.testAeatAccepted');
    expect(text, 'there is no cell on this road').not.toContain('ui.testGatewayReady');
    expect(text).toContain('ui.routeOwn');
  });
});
