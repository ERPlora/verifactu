// verifactu#76 — the enrolment section, on the module's CONFIGURATION screen (tab «Lo remite ERPlora»).
//
// It lived in Ajustes until Ajustes was cut down to what is switched on and off; the machine
// identity is the other half of what lets ERPlora file for the business, so it moved next to the
// representation grant. Same behaviour, same rules, another screen.
//
// The state and the vocabulary are pinned in `ui/lib/gateway-identity.test.ts`; this file pins
// what the SCREEN does with them: that it reads the door on open, that the one button says the one
// thing there is to do, that pressing it spends the door and shows the answer, and that a hub
// nobody can read is told so instead of being offered a shot in the dark.
//
// The component is imported STATICALLY on purpose (verifactu#31): a dynamic import inside a test
// charges the whole OutfitKit/SDK transform to that test's 5 s budget.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './erp-verifactu-config';
import { HUB_SESSION_KEY } from '../../lib/gateway-identity';

const IDENTITY = '/api/business/gateway-identity';
const ENROL = '/api/business/gateway-identity/enrol';
const DAY = 86_400_000;

const originalFetch = globalThis.fetch;
let calls: Array<{ path: string; method: string }> = [];

/** Answers the two core routes; `identity` is what GET returns, `enrol` what POST returns. */
function serve(identity: unknown, enrol: { status?: number; body?: unknown } = {}) {
  globalThis.fetch = (async (path: string, init?: RequestInit) => {
    calls.push({ path, method: init?.method ?? 'GET' });
    if (path === IDENTITY) {
      return identity === null
        ? new Response('nope', { status: 500 })
        : new Response(JSON.stringify(identity), { status: 200 });
    }
    return new Response(JSON.stringify(enrol.body ?? {}), { status: enrol.status ?? 200 });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  document.body.replaceChildren();
  calls = [];
  globalThis.localStorage?.setItem(HUB_SESSION_KEY, 'sess-abc');
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) =>
      name === 'verifactu.config.get' ? [{ issuer_nif: 'B12345678', environment: 'testing', has_certificate: 1 }] : [],
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
  serve({ has_key: false, has_certificate: false, common_name: 'hub-h1.fiscal.erplora.internal' });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

async function mount() {
  window.history.pushState({}, '', '/m/verifactu/config#delegated');
  const el = document.createElement('erp-verifactu-config');
  document.body.appendChild(el);
  const wc = el as unknown as { updateComplete: Promise<unknown> };
  for (let i = 0; i < 4; i += 1) {
    await wc.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await wc.updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

/** The pill of the gateway-identity row, whichever state it is in. */
function gwPill(el: HTMLElement & { shadowRoot: ShadowRoot }): Element | undefined {
  const labels = ['ui.gwLoading', 'ui.gwUnknown', 'ui.gwAbsent', 'ui.gwPending', 'ui.gwActive', 'ui.gwExpiring', 'ui.gwExpired'];
  return [...el.shadowRoot.querySelectorAll('ok-status-pill')].find((p) => labels.includes(p.getAttribute('label') ?? ''));
}

/** The single action of the section, or `undefined` when there is nothing to ask for. */
function gwButton(el: HTMLElement & { shadowRoot: ShadowRoot }): Element | undefined {
  return el.shadowRoot.querySelector('[data-testid="gateway-enrol"]') ?? undefined;
}

async function press(el: HTMLElement & { shadowRoot: ShadowRoot }) {
  const wc = el as unknown as { enrolGateway: () => Promise<void>; updateComplete: Promise<unknown> };
  await wc.enrolGateway();
  await wc.updateComplete;
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

describe('the gateway identity is shown and asked for from this screen (verifactu#76)', () => {
  it('reads the door when the screen opens, and names the identity', async () => {
    const el = await mount();
    expect(calls.map((c) => c.path), 'the screen never asked the hub about its machine identity').toContain(IDENTITY);
    const text = el.shadowRoot.textContent ?? '';
    expect(text).toContain('ui.gatewayTitle');
    expect(text, 'the common name is what an operator matches against the signed certificate')
      .toContain('hub-h1.fiscal.erplora.internal');
  });

  it('a hub with no identity is offered the enrolment, and nothing else', async () => {
    const el = await mount();
    expect(gwPill(el)?.getAttribute('label')).toBe('ui.gwAbsent');
    expect(gwButton(el)?.textContent, 'the button does not say what pressing it does').toContain('ui.gwEnrol');
  });

  it('a CSR already filed says it is waiting for a person, and offers to check', async () => {
    serve({ has_key: true, has_certificate: false, common_name: 'hub-h1.fiscal.erplora.internal' });
    const el = await mount();
    expect(gwPill(el)?.getAttribute('label')).toBe('ui.gwPending');
    expect(gwPill(el)?.getAttribute('tone')).toBe('warning');
    expect(gwButton(el)?.textContent).toContain('ui.gwCheck');
  });

  it('an active identity shows its date and asks for NOTHING', async () => {
    const until = iso(Date.now() + 200 * DAY);
    serve({ has_key: true, has_certificate: true, common_name: 'hub-h1.fiscal.erplora.internal', not_after: until });
    const el = await mount();
    expect(gwPill(el)?.getAttribute('label')).toBe('ui.gwActive');
    expect(gwPill(el)?.getAttribute('tone')).toBe('success');
    expect(el.shadowRoot.textContent ?? '', 'an identity that works does not show its expiry date').toContain(until);
    expect(gwButton(el), 'a healthy identity was offered a button with nothing to do').toBeUndefined();
  });

  it('an expired identity is red and offers the renewal', async () => {
    serve({ has_key: true, has_certificate: true, common_name: 'hub-h1.fiscal.erplora.internal', not_after: iso(Date.now() - DAY) });
    const el = await mount();
    expect(gwPill(el)?.getAttribute('label')).toBe('ui.gwExpired');
    expect(gwPill(el)?.getAttribute('tone')).toBe('danger');
    expect(gwButton(el)?.textContent).toContain('ui.gwRenew');
  });

  it('pressing it spends the enrol door and shows what the door answered', async () => {
    serve({ has_key: false, has_certificate: false, common_name: 'hub-h1.fiscal.erplora.internal' }, {
      body: { state: 'filed', version: 1, has_key: true, has_certificate: false, common_name: 'hub-h1.fiscal.erplora.internal' },
    });
    const el = await mount();
    await press(el);

    expect(calls.filter((c) => c.path === ENROL && c.method === 'POST'), 'the button did not call the enrol door').toHaveLength(1);
    expect(el.shadowRoot.textContent ?? '').toContain('ui.gwFiled');
    // The door answers with the fresh status in the same body, so the row must not stay stale.
    expect(gwPill(el)?.getAttribute('label'), 'the row still says «no identity» after filing one').toBe('ui.gwPending');
  });

  it('a CLICK on the painted button spends the door — the handler is wired, not just reachable', async () => {
    // `press()` calls the method; this one clicks the ELEMENT. Without it, a mutant that unbinds
    // `@click` keeps every other test green while shipping a button that does nothing.
    serve({ has_key: false, has_certificate: false, common_name: 'hub-h1.fiscal.erplora.internal' }, {
      body: { state: 'filed', version: 1, has_key: true, has_certificate: false, common_name: 'hub-h1.fiscal.erplora.internal' },
    });
    const el = await mount();
    (gwButton(el) as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(calls.filter((c) => c.path === ENROL && c.method === 'POST'), 'the painted button is not wired to the enrol call').toHaveLength(1);
  });

  it('a rejection shows the reason the person wrote, not a generic failure', async () => {
    serve({ has_key: true, has_certificate: false, common_name: 'hub-h1.fiscal.erplora.internal' }, {
      body: { state: 'rejected', version: 2, rejected_reason: 'el NIF del CSR no coincide', has_key: true, has_certificate: false },
    });
    const el = await mount();
    await press(el);
    const text = el.shadowRoot.textContent ?? '';
    expect(text).toContain('ui.gwRejected');
    expect(text, 'the reviewer wrote why and nobody showed it').toContain('el NIF del CSR no coincide');
  });

  it('a refusal is translated by its code, and the code stays visible for support', async () => {
    serve({ has_key: false, has_certificate: false, common_name: 'hub-h1.fiscal.erplora.internal' }, {
      status: 422,
      body: { ok: false, code: 'enrolment.no_machine_credential', detail: 'este hub no tiene credencial de máquina' },
    });
    const el = await mount();
    await press(el);
    const text = el.shadowRoot.textContent ?? '';
    expect(text).toContain('ui.gwErrNoMachineCredential');
    expect(text, 'without the code nobody can tell support which refusal it was').toContain('enrolment.no_machine_credential');
    expect(text, "the runtime's own sentence reached the operator untranslated").not.toContain('credencial de máquina: el bootstrap');
  });

  it('a session that is not admin says so instead of failing silently', async () => {
    // `POST …/enrol` is `require_admin_session`: the `X-Hub-Token` travels on the other leg.
    serve({ has_key: false, has_certificate: false, common_name: 'hub-h1.fiscal.erplora.internal' }, { status: 401, body: {} });
    const el = await mount();
    await press(el);
    expect(el.shadowRoot.textContent ?? '').toContain('ui.gwErrNotAdmin');
  });

  it('a hub whose door cannot be read says so, and is not offered a shot in the dark', async () => {
    serve(null);
    const el = await mount();
    expect(gwPill(el)?.getAttribute('label')).toBe('ui.gwUnknown');
    expect(gwButton(el), 'an unreadable identity was offered an enrolment anyway').toBeUndefined();
  });

  it('never lets the identity read blank the rest of the tab', async () => {
    serve(null);
    const el = await mount();
    expect(
      el.shadowRoot.querySelector('[data-testid="config-grant"]'),
      'an unreadable identity took the representation grant down with it',
    ).toBeTruthy();
  });

  it('every string it paints has both catalogues (en + es)', async () => {
    const en = (await import('../../../locales/en.json')).default as Record<string, Record<string, string>>;
    const es = (await import('../../../locales/es.json')).default as Record<string, Record<string, string>>;
    const added = [
      'gatewayTitle', 'gatewayHint', 'gatewayCommonName', 'gatewayValidUntil',
      'gwLoading', 'gwUnknown', 'gwAbsent', 'gwPending', 'gwActive', 'gwExpiring', 'gwExpired',
      'gwUnknownHint', 'gwAbsentHint', 'gwPendingHint', 'gwExpiringHint', 'gwExpiredHint',
      'gwEnrol', 'gwCheck', 'gwRenew', 'gwWorking',
      'gwFiled', 'gwAwaitingReview', 'gwInstalled', 'gwRejected', 'gwOutOfBudget', 'gwOutcomeUnknown',
      'gwErrNoMachineCredential', 'gwErrCsrUnavailable', 'gwErrCloudUnreachable',
      'gwErrNotInstallable', 'gwErrRefused', 'gwErrNotAdmin', 'gwErrHttp',
    ];
    for (const k of added) {
      expect(en.ui?.[k], `\`ui.${k}\` has no English source`).toBeTruthy();
      expect(es.ui?.[k], `\`ui.${k}\` was never translated to Spanish`).toBeTruthy();
    }
  });
});

// ── verifactu#82 — the section belongs to the DELEGATED road only ────────────────────────────
//
// The machine identity is what the fiscal cell presents when it files IN THE NAME of the business
// (ADR-0320 §1 / ADR-0419). A hub that holds its own `.p12` reaches the AEAT by itself
// (`certificate::route_of` → `own`) and never goes through the cell, so its identity takes part in
// nothing: showing it is technical noise on a business screen, and reading it is a call whose
// answer is thrown away.
//
// The rule is «hide it only when the core has SAID `own`», never «show it only when it has said
// `delegated`»: a runtime that does not publish `hub.fiscal.transmission` can perfectly well be on
// the cell, and hiding the section there would take away its only way to enrol.

/** Mounts with the core route query answering `route`; `''` = the runtime does not publish it. */
async function mountWithRoute(route: string) {
  const base = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
  (globalThis as Record<string, unknown>).erplora = {
    ...base,
    query: async (name: string) => {
      if (name === 'verifactu.config.get') {
        return [{ issuer_nif: 'B12345678', environment: 'testing', has_certificate: 1 }];
      }
      if (name === 'hub.fiscal.transmission') return route ? [{ transmission_route: route }] : [];
      return [];
    },
  };
  return mount();
}

describe('the machine identity is only shown on the road that uses it (verifactu#82)', () => {
  it('a hub with its OWN certificate is not shown the section, nor is the door read for it', async () => {
    const el = await mountWithRoute('own');
    expect(el.shadowRoot.textContent ?? '', 'a hub that files with its own .p12 was shown the cell identity')
      .not.toContain('ui.gatewayTitle');
    expect(gwPill(el), 'the identity pill was painted on a road that has no identity').toBeUndefined();
    expect(gwButton(el), 'an own-certificate hub was offered an enrolment it must never need').toBeUndefined();
    expect(calls.map((c) => c.path), 'the screen read an identity it was never going to paint')
      .not.toContain(IDENTITY);
    expect(
      el.shadowRoot.querySelector('[data-testid="config-grant"]'),
      'the rest of the tab went away with the section',
    ).toBeTruthy();
  });

  it('a DELEGATED hub sees it whole, exactly as before', async () => {
    const el = await mountWithRoute('delegated');
    expect(calls.map((c) => c.path), 'the screen never asked the hub about its machine identity')
      .toContain(IDENTITY);
    expect(el.shadowRoot.textContent ?? '').toContain('ui.gatewayTitle');
    expect(gwPill(el)?.getAttribute('label')).toBe('ui.gwAbsent');
    expect(gwButton(el)?.textContent, 'the road that needs an identity was not offered the enrolment')
      .toContain('ui.gwEnrol');
  });

  it('a runtime that does not publish the route SEES it — unknown counts as delegated, never as hidden', async () => {
    const el = await mountWithRoute('');
    expect(calls.map((c) => c.path), 'a hub whose road nobody stated was not even asked for its identity')
      .toContain(IDENTITY);
    expect(el.shadowRoot.textContent ?? '', 'not knowing the road closed the only way this hub has to enrol')
      .toContain('ui.gatewayTitle');
    expect(gwButton(el)?.textContent).toContain('ui.gwEnrol');
  });
});
