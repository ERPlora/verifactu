// verifactu#76 — the enrolment section of the module's settings screen.
//
// The state and the vocabulary are pinned in `ui/lib/gateway-identity.test.ts`; this file pins
// what the SCREEN does with them: that it reads the door on open, that the one button says the one
// thing there is to do, that pressing it spends the door and shows the answer, and that a hub
// nobody can read is told so instead of being offered a shot in the dark.
//
// The component is imported STATICALLY on purpose (verifactu#31): a dynamic import inside a test
// charges the whole OutfitKit/SDK transform to that test's 5 s budget.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './erp-verifactu-settings';
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
  const el = document.createElement('erp-verifactu-settings');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
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

  it('never lets the identity read blank the configuration the owner came to change', async () => {
    serve(null);
    const el = await mount();
    expect((el as unknown as { error: string }).error, 'a side read took over the screen-wide error slot').toBe('');
    expect(el.shadowRoot.textContent ?? '', 'the configuration form disappeared').toContain('ui.enableVerifactu');
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
