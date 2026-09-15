// «Usar mi propio certificado» SWITCHES the road — it no longer only navigates (hub#1871).
//
// Ioan, 15/09 on banco-pre: with the `.p12` uploaded he turned the switch off to file through
// ERPlora's Sello and nothing happened — the switch sent him to Configuración, the certificate kept
// signing and the switch came back on. The two roads are exclusive and reversible, and the owner
// picks one without deleting anything: the core door is `PATCH /api/business/certificate`
// `{ use_for_transmission }` (hub#1871), which answers the status and, when it refuses, a stable code.
//
// What this file pins, on the switch the screen really paints:
//  - off, with a certificate uploaded, it calls that door and re-reads the road from the core;
//  - on, with an uploaded certificate switched off, it calls the door the other way;
//  - on, with nothing uploaded, there is nothing to switch: it takes the owner to upload one;
//  - a refusal is said in the owner's words (grant not approved, connection not signed) and the
//    switch goes back to where the road really is;
//  - it cannot be touched until the screen knows the road;
//  - off with the certificate kept, the hint says it is still saved and ERPlora files.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-settings';

type Call = { path: string; method: string; body: unknown; headers: Record<string, string> };

let calls: Call[];
let route: 'own' | 'delegated';
let certificate: { present: boolean; use_for_transmission?: boolean };
let patchReply: { status: number; body: Record<string, unknown> } | null;
/** What `GET /api/business/certificate` does instead of answering: a status, or never coming back. */
let certificateDoor: 'answers' | 'refuses' | 'hangs';
const originalFetch = globalThis.fetch;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  document.body.replaceChildren();
  calls = [];
  route = 'own';
  certificate = { present: true, use_for_transmission: true };
  patchReply = null;
  certificateDoor = 'answers';
  globalThis.fetch = (async (path: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({
      path,
      method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    if (path === '/api/business/certificate' && method === 'PATCH') {
      if (patchReply) return json(patchReply.status, patchReply.body);
      const on = (JSON.parse(String(init?.body)) as { use_for_transmission: boolean }).use_for_transmission;
      certificate = { ...certificate, use_for_transmission: on };
      route = on ? 'own' : 'delegated';
      return json(200, { ok: true, data: { ...certificate, transmission_route: route } });
    }
    if (path === '/api/business/certificate') {
      if (certificateDoor === 'hangs') return new Promise<Response>(() => {});
      if (certificateDoor === 'refuses') return json(503, {});
      return json(200, { ok: true, data: { ...certificate, transmission_route: route } });
    }
    if (path === '/api/business/gateway-identity') {
      return json(200, { has_key: true, has_certificate: true, common_name: 'hub-x', not_after: '2027-09-15T00:00:00Z' });
    }
    return json(200, {});
  }) as typeof fetch;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'verifactu.config.get') return [{ issuer_nif: 'B27593136', environment: 'testing', has_certificate: 1 }];
      if (name === 'hub.fiscal.transmission') return [{ transmission_route: route, representation_status: 'pendiente' }];
      return [];
    },
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function settle(el: HTMLElement) {
  for (let i = 0; i < 6; i += 1) {
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function mount() {
  const el = document.createElement('erp-verifactu-settings');
  document.body.appendChild(el);
  await settle(el);
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

const toggle = (el: HTMLElement & { shadowRoot: ShadowRoot }) =>
  el.shadowRoot.querySelector('[data-testid="settings-own-certificate"]') as (HTMLElement & { checked?: boolean }) | null;

async function flip(el: HTMLElement & { shadowRoot: ShadowRoot }, checked: boolean) {
  const t = toggle(el)!;
  t.checked = checked;
  t.dispatchEvent(new CustomEvent('ionChange', { detail: { checked }, bubbles: true, composed: true }));
  await settle(el);
}

const patches = () => calls.filter((c) => c.path === '/api/business/certificate' && c.method === 'PATCH');

describe('«Usar mi propio certificado» switches the road (hub#1871)', () => {
  it('off, with the certificate uploaded, asks the core to stop filing with it', async () => {
    const el = await mount();
    expect(toggle(el)?.hasAttribute('checked'), 'the own road starts ON').toBe(true);

    await flip(el, false);

    expect(patches().map((c) => c.body)).toEqual([{ use_for_transmission: false }]);
    expect(patches()[0].headers['X-Erplora-Module'], 'the call names this module for the capability gate').toBe('verifactu');
    expect(toggle(el)?.hasAttribute('checked'), 'the core now says delegated: the switch is off').toBe(false);
    expect(window.location.pathname, 'switching is not navigating any more').not.toBe('/m/verifactu/config');
  });

  it('on, with an uploaded certificate switched off, files with it again', async () => {
    route = 'delegated';
    certificate = { present: true, use_for_transmission: false };
    const el = await mount();

    await flip(el, true);

    expect(patches().map((c) => c.body)).toEqual([{ use_for_transmission: true }]);
    expect(toggle(el)?.hasAttribute('checked')).toBe(true);
  });

  it('on, with nothing uploaded, takes the owner to upload one instead of calling the door', async () => {
    route = 'delegated';
    certificate = { present: false };
    window.history.pushState({}, '', '/m/verifactu/settings');
    const el = await mount();

    await flip(el, true);

    expect(patches(), 'there is no certificate to switch on').toEqual([]);
    expect(window.location.pathname + window.location.hash).toBe('/m/verifactu/config#own');
  });

  it('a refusal says what is missing and the switch goes back to the real road', async () => {
    patchReply = { status: 409, body: { ok: false, error: { code: 'fiscal.no_representation_grant', message: 'x' } } };
    const el = await mount();

    await flip(el, false);

    expect(el.shadowRoot.textContent ?? '').toContain('ui.errRouteNeedsGrant');
    expect(toggle(el)?.checked, 'the hub still files with its own certificate: the switch says so').toBe(true);
  });

  it('a connection not signed yet is said as such', async () => {
    patchReply = { status: 409, body: { ok: false, error: { code: 'fiscal.gateway_not_enrolled', message: 'x' } } };
    const el = await mount();

    await flip(el, false);

    expect(el.shadowRoot.textContent ?? '').toContain('ui.errRouteNeedsConnection');
  });

  // The two older route tests (verifactu#41) mock no `fetch` at all, so the certificate door there
  // is a connection refused by the OS — slower than the screen settles. The road must not wait for
  // it: it is a different fact, from a different door, and it only shapes the hint.
  it('paints the road the moment the core says it, without waiting for the certificate door', async () => {
    route = 'delegated';
    certificateDoor = 'hangs';
    const el = await mount();

    expect(toggle(el)?.hasAttribute('checked'), 'the core said delegated: the switch is off').toBe(false);
    expect(toggle(el)?.hasAttribute('disabled'), 'the road is known: the switch can be touched').toBe(false);
  });

  it('on, when the certificate door did not answer, asks the core instead of sending the owner to upload', async () => {
    route = 'delegated';
    certificate = { present: true, use_for_transmission: false };
    certificateDoor = 'refuses';
    window.history.pushState({}, '', '/m/verifactu/settings');
    const el = await mount();

    await flip(el, true);

    expect(patches().map((c) => c.body), 'unknown is not «absent»: the core knows whether a .p12 is there').toEqual([{ use_for_transmission: true }]);
    expect(window.location.pathname).toBe('/m/verifactu/settings');
  });

  it('cannot be touched until the screen knows the road', async () => {
    const el = document.createElement('erp-verifactu-settings') as HTMLElement & { shadowRoot: ShadowRoot };
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(toggle(el)?.hasAttribute('disabled'), 'a switch painted before the road is known lies').toBe(true);
    await settle(el);
    expect(toggle(el)?.hasAttribute('disabled')).toBe(false);
  });

  it('off with the certificate kept, the hint says it is still saved and ERPlora files', async () => {
    route = 'delegated';
    certificate = { present: true, use_for_transmission: false };
    const el = await mount();

    expect(el.shadowRoot.textContent ?? '').toContain('ui.cfgOwnOffKeptHint');
  });

  it('every new sentence has both catalogues (en + es)', async () => {
    const en = (await import('../../../locales/en.json')).default as { ui: Record<string, string> };
    const es = (await import('../../../locales/es.json')).default as { ui: Record<string, string> };
    for (const key of ['errRouteNeedsGrant', 'errRouteNeedsConnection', 'errRouteNeedsCertificate', 'errRouteSwitch', 'cfgOwnOffKeptHint', 'routeSwitchedOwn', 'routeSwitchedDelegated']) {
      expect(en.ui[key], `en.ui.${key}`).toBeTruthy();
      expect(es.ui[key], `es.ui.${key}`).toBeTruthy();
    }
  });
});
