// «Producción» goes through the CORE's go-live (hub#2079).
//
// The screen used to offer an «AEAT environment» select that saved `production` into this module's
// own config. The engine filed from there, so real invoices reached the AEAT without the checks of
// the core's go-live (the signed authorisation, the demo pin, an expired certificate), and the hub
// profile stayed in «testing», which kept every till guard of a live hub switched off.
//
// What this file pins, on the screen the owner really uses:
//  - where the hub files is READ from the core (`GET /api/fiscal/go-live`), not from the module row;
//  - «Go live» asks for confirmation and then calls `POST /api/fiscal/go-live`, naming this module;
//    cancelling calls nothing;
//  - a refusal is said in the owner's words, by the core's stable code, and the hub stays in testing;
//  - «Back to testing» exists only while nothing has been filed for real (`DELETE`);
//  - a demo cannot go live, and says why;
//  - saving the form never overrides the core: it sends the environment the core reports;
//  - a runtime older than the door (404) keeps the old select, so the module never strands a hub.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-settings';
import { goLiveRefusalKey } from './erp-verifactu-settings';

type Call = { path: string; method: string; headers: Record<string, string> };
type GoLive = { environment: string; can_go_live: boolean; filed_for_real: boolean };

let calls: Call[];
let commands: Array<{ name: string; payload: Record<string, unknown> }>;
let door: GoLive | 'missing';
let postReply: { status: number; body: Record<string, unknown> } | null;
let rowEnvironment: string;
const originalFetch = globalThis.fetch;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  document.body.replaceChildren();
  calls = [];
  commands = [];
  door = { environment: 'testing', can_go_live: true, filed_for_real: false };
  postReply = null;
  rowEnvironment = 'testing';
  globalThis.fetch = (async (path: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ path, method, headers: (init?.headers ?? {}) as Record<string, string> });
    if (path === '/api/fiscal/go-live') {
      if (door === 'missing') return json(404, {});
      if (method === 'POST') {
        if (postReply) return json(postReply.status, postReply.body);
        door = { ...door, environment: 'production' };
      }
      if (method === 'DELETE') door = { ...door, environment: 'testing' };
      return json(200, { ok: true, data: door });
    }
    if (path === '/api/business/certificate') return json(200, { ok: true, data: { present: false } });
    if (path === '/api/business/gateway-identity') return json(200, { has_key: false, has_certificate: false });
    return json(200, {});
  }) as typeof fetch;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'verifactu.config.get') {
        return [{ enabled: true, issuer_nif: 'B27593136', environment: rowEnvironment, has_certificate: 0 }];
      }
      if (name === 'hub.fiscal.transmission') return [{ transmission_route: 'delegated', representation_status: 'vigente' }];
      return [];
    },
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async (name: string, payload: Record<string, unknown>) => {
      commands.push({ name, payload });
      return {};
    },
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  document.body.querySelectorAll('ion-alert').forEach((a) => a.remove());
});

async function settle(el: HTMLElement) {
  for (let i = 0; i < 8; i += 1) {
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

type El = HTMLElement & { shadowRoot: ShadowRoot };

async function mount(): Promise<El> {
  const el = document.createElement('erp-verifactu-settings');
  document.body.appendChild(el);
  await settle(el);
  return el as El;
}

const q = (el: El, id: string) => el.shadowRoot.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const text = (el: El) => el.shadowRoot.textContent ?? '';
const doorCalls = (method: string) => calls.filter((c) => c.path === '/api/fiscal/go-live' && c.method === method);
const openAlert = () => document.body.querySelector(':scope > ion-alert') as (HTMLElement & { buttons?: Array<{ role?: string }> }) | null;

async function answerAlert(el: El, role: 'confirm' | 'cancel') {
  const alert = openAlert();
  expect(alert, 'going live is confirmed in a document-level alert').not.toBeNull();
  alert!.dispatchEvent(new CustomEvent('ionAlertDidDismiss', { detail: { role } }));
  await settle(el);
}

describe('«Production» goes through the core go-live (hub#2079)', () => {
  it('reads where the hub files from the core and offers no environment select', async () => {
    rowEnvironment = 'production';
    const el = await mount();
    expect(doorCalls('GET').length).toBeGreaterThan(0);
    expect(el.shadowRoot.querySelector('ion-select-option[value="production"]'), 'no select writes the environment').toBeNull();
    expect(q(el, 'settings-environment')?.textContent).toContain('ui.envTesting');
    expect(q(el, 'settings-go-live')).not.toBeNull();
  });

  it('goes live through the core after confirming, naming this module', async () => {
    const el = await mount();
    q(el, 'settings-go-live')!.click();
    await settle(el);
    await answerAlert(el, 'confirm');

    expect(doorCalls('POST')).toHaveLength(1);
    expect(doorCalls('POST')[0].headers['X-Erplora-Module']).toBe('verifactu');
    expect(q(el, 'settings-environment')?.textContent).toContain('ui.envProduction');
    expect(q(el, 'settings-go-live'), 'already live: nothing to press').toBeNull();
  });

  it('cancelling the confirmation calls nothing', async () => {
    const el = await mount();
    q(el, 'settings-go-live')!.click();
    await settle(el);
    await answerAlert(el, 'cancel');
    expect(doorCalls('POST')).toHaveLength(0);
    expect(q(el, 'settings-environment')?.textContent).toContain('ui.envTesting');
  });

  it('a refusal is said by its code and the hub stays in testing', async () => {
    postReply = { status: 409, body: { ok: false, error: { code: 'fiscal.no_representation_grant', message: 'x' } } };
    const el = await mount();
    q(el, 'settings-go-live')!.click();
    await settle(el);
    await answerAlert(el, 'confirm');

    expect(q(el, 'settings-go-live-notice')?.textContent).toContain('ui.errGoLiveNeedsGrant');
    expect(q(el, 'settings-environment')?.textContent).toContain('ui.envTesting');
  });

  it('maps every refusal of the go-live to a sentence, and anything else to the generic one', () => {
    const body = (code: string) => ({ ok: false, error: { code } });
    expect(goLiveRefusalKey(body('fiscal.no_representation_grant'))).toBe('ui.errGoLiveNeedsGrant');
    expect(goLiveRefusalKey(body('fiscal.not_ready'))).toBe('ui.errGoLiveNotReady');
    expect(goLiveRefusalKey(body('fiscal.go_live_forbidden'))).toBe('ui.errGoLiveDemo');
    expect(goLiveRefusalKey(body('fiscal.own_certificate_expired'))).toBe('ui.errGoLiveCertificateExpired');
    expect(goLiveRefusalKey(body('fiscal.hub_closed'))).toBe('ui.errGoLiveClosed');
    expect(goLiveRefusalKey(body('fiscal.already_emitted'))).toBe('ui.errGoLiveIsOneWay');
    expect(goLiveRefusalKey(body('capability_denied'))).toBe('ui.errCapabilityDenied');
    expect(goLiveRefusalKey(body('something_new'))).toBe('ui.errGoLive');
    expect(goLiveRefusalKey({})).toBe('ui.errGoLive');
  });

  it('while nothing was filed for real, a live hub can go back to testing', async () => {
    door = { environment: 'production', can_go_live: true, filed_for_real: false };
    const el = await mount();
    q(el, 'settings-stand-down')!.click();
    await settle(el);
    await answerAlert(el, 'confirm');

    expect(doorCalls('DELETE')).toHaveLength(1);
    expect(q(el, 'settings-environment')?.textContent).toContain('ui.envTesting');
  });

  it('once a record reached the real AEAT there is no way back to offer', async () => {
    door = { environment: 'production', can_go_live: true, filed_for_real: true };
    const el = await mount();
    expect(q(el, 'settings-stand-down')).toBeNull();
    expect(text(el)).toContain('ui.goLiveOneWayHint');
  });

  it('a demo cannot go live and says why', async () => {
    door = { environment: 'testing', can_go_live: false, filed_for_real: false };
    const el = await mount();
    expect(q(el, 'settings-go-live')).toBeNull();
    expect(text(el)).toContain('ui.goLiveDemoHint');
  });

  it('saving sends the environment the core reports, never the stale module row', async () => {
    door = { environment: 'production', can_go_live: true, filed_for_real: true };
    rowEnvironment = 'testing';
    const el = await mount();
    (el.shadowRoot.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(el);
    const save = commands.find((c) => c.name === 'verifactu.config.save');
    expect(save?.payload.environment).toBe('production');
  });

  it('the test invoice follows the core environment: a live hub cannot create one', async () => {
    door = { environment: 'production', can_go_live: true, filed_for_real: true };
    rowEnvironment = 'testing';
    const el = await mount();
    expect(text(el)).toContain('ui.testInvoiceTestingOnly');
  });

  it('a runtime without the door keeps the old select so no hub is stranded', async () => {
    door = 'missing';
    const el = await mount();
    expect(el.shadowRoot.querySelector('ion-select-option[value="production"]')).not.toBeNull();
    expect(q(el, 'settings-go-live')).toBeNull();
  });
});
