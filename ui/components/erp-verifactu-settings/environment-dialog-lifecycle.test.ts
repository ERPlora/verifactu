// verifactu#130 — the «go live» / «back to testing» confirmation must leave the page once closed.
//
// The dialog is a GLOBAL Ionic overlay appended to document.body (same shape as the chain
// recovery, verifactu#112). Ionic's dismiss() emits ionAlertDidDismiss and only THEN moves the
// teleported overlay back to its original parent (framework-delegate removeViewFromDom). A
// synchronous remove() in the listener is undone by that move, so every answer left a hidden
// <ion-alert> behind while the screen stayed open. Same fix and test shape as sales#406.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-settings';

type AlertEl = HTMLElement & { buttons?: Array<{ text: string; role?: string }> };
type El = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

let environment: 'testing' | 'production';
let doorWrites: string[];
const originalFetch = globalThis.fetch;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  document.body.replaceChildren();
  environment = 'testing';
  doorWrites = [];
  globalThis.fetch = (async (path: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (path === '/api/fiscal/go-live') {
      if (method !== 'GET') doorWrites.push(method);
      if (method === 'POST') environment = 'production';
      if (method === 'DELETE') environment = 'testing';
      return json(200, { ok: true, data: { environment, can_go_live: true, filed_for_real: false } });
    }
    if (path === '/api/business/certificate') return json(200, { ok: true, data: { present: false } });
    if (path === '/api/business/gateway-identity') return json(200, { has_key: false, has_certificate: false });
    return json(200, {});
  }) as typeof fetch;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'verifactu.config.get') {
        return [{ enabled: true, issuer_nif: 'B27593136', environment, has_certificate: 0 }];
      }
      if (name === 'hub.fiscal.transmission') return [{ transmission_route: 'delegated', representation_status: 'vigente' }];
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

async function settle(el: El) {
  for (let i = 0; i < 8; i += 1) {
    await el.updateComplete;
    await tick();
  }
}

async function mount(): Promise<El> {
  const el = document.createElement('erp-verifactu-settings') as El;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

async function openConfirmation(el: El, button: 'settings-go-live' | 'settings-stand-down'): Promise<AlertEl> {
  const trigger = el.shadowRoot.querySelector<HTMLElement>(`[data-testid="${button}"]`);
  expect(trigger, `${button} is on screen`).not.toBeNull();
  trigger!.click();
  await settle(el);
  const alert = document.body.querySelector<AlertEl>(':scope > ion-alert');
  expect(alert, 'the confirmation is a global overlay in document.body').toBeTruthy();
  return alert!;
}

/** Dismisses the dialog the way Ionic does: the event first, then the overlay is moved back. */
async function dismissLikeIonic(el: El, alert: AlertEl, role: string): Promise<void> {
  alert.addEventListener('ionAlertDidDismiss', () => {
    void Promise.resolve().then(() => document.body.appendChild(alert));
  });
  alert.dispatchEvent(new CustomEvent('ionAlertDidDismiss', { detail: { role } }));
  await settle(el);
}

const alertsInPage = () => document.querySelectorAll('ion-alert').length;

describe('settings — the environment confirmation does not linger in the page once closed (verifactu#130)', () => {
  it('stays in the page while it is open', async () => {
    const el = await mount();
    const alert = await openConfirmation(el, 'settings-go-live');
    for (let i = 0; i < 3; i++) await tick();
    expect(document.body.querySelector('ion-alert'), 'an open dialog is not removed').toBe(alert);
  });

  it('«Cancel» removes it from the page, and the hub stays in testing', async () => {
    const el = await mount();
    await dismissLikeIonic(el, await openConfirmation(el, 'settings-go-live'), 'cancel');
    expect(alertsInPage()).toBe(0);
    expect(doorWrites).toEqual([]);
  });

  it('confirming «go live» removes it from the page and still goes live through the core', async () => {
    const el = await mount();
    await dismissLikeIonic(el, await openConfirmation(el, 'settings-go-live'), 'confirm');
    expect(alertsInPage()).toBe(0);
    expect(doorWrites).toEqual(['POST']);
  });

  it('confirming «back to testing» removes it from the page too', async () => {
    environment = 'production';
    const el = await mount();
    await dismissLikeIonic(el, await openConfirmation(el, 'settings-stand-down'), 'confirm');
    expect(alertsInPage()).toBe(0);
    expect(doorWrites).toEqual(['DELETE']);
  });

  it('closing it from the backdrop removes it from the page', async () => {
    const el = await mount();
    await dismissLikeIonic(el, await openConfirmation(el, 'settings-go-live'), 'backdrop');
    expect(alertsInPage()).toBe(0);
    expect(doorWrites).toEqual([]);
  });

  it('answering it several times on the same screen never piles dialogs up', async () => {
    const el = await mount();
    for (const role of ['cancel', 'backdrop', 'cancel', 'backdrop']) {
      await dismissLikeIonic(el, await openConfirmation(el, 'settings-go-live'), role);
    }
    expect(alertsInPage()).toBe(0);
  });
});
