// verifactu#115 — after sending the documents, the owner SEES what was sent, the earlier
// submissions with their outcome, and can send again while the review is still open.
//
// Ioan, 15/09: «si un documento tiene mala calidad tenemos que permitirle subir otra vez, e
// informarle en la plataforma; el formulario debería mostrar lo que tiene enviado y puede enviar
// varias». The SaaS already supersedes a pending or refused row with the new upload and keeps a
// vigente one filing; what was missing was the SCREEN: it hid the form while «pendiente», showed
// nothing about the documents received, and had no history.
//
// The facts come from the core door (`GET /api/fiscal/representation-grant`, hub#1873), which
// forwards what the SaaS knows: `version`, `submitted_at`, `reviewed_at`, `documents` (booleans per
// part, never a file) and `history` (newest first).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './erp-verifactu-grant';

type Door = { ok: boolean; status: number; body: unknown };
let getDoor: Door;
let postDoor: Door;
let calls: Array<{ url: string; method: string }>;

const PENDING = {
  status: 'pendiente',
  at: '2026-09-15T10:00:00Z',
  rejected_reason: '',
  version: 2,
  submitted_at: '2026-09-15T10:00:00Z',
  reviewed_at: '',
  documents: { signed_document: true, dni_copy: true, signature_sample: false, representation_proof: true },
  history: [
    { version: 2, status: 'pendiente', submitted_at: '2026-09-15T10:00:00Z', reviewed_at: '', rejected_reason: '', superseded: false },
    { version: 1, status: 'rechazado', submitted_at: '2026-09-14T10:00:00Z', reviewed_at: '2026-09-14T12:00:00Z', rejected_reason: 'La copia del DNI está borrosa.', superseded: false },
  ],
};

beforeEach(() => {
  document.body.replaceChildren();
  calls = [];
  getDoor = { ok: true, status: 200, body: PENDING };
  postDoor = { ok: true, status: 201, body: { ok: true, status: 'pendiente', at: '2026-09-15T11:00:00Z' } };
  vi.stubGlobal('localStorage', { getItem: () => 's3ss10n' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string, init: RequestInit) => {
      const method = init?.method ?? 'GET';
      calls.push({ url, method });
      const door = method === 'POST' ? postDoor : getDoor;
      return { ok: door.ok, status: door.status, json: async () => door.body, blob: async () => new Blob(['%PDF']) };
    }),
  );
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    // The key, plus its parameters when there are any: so a test can see WHICH number and date
    // the sentence was given, not only which sentence.
    t: (_catalog: unknown, key: string, params?: Record<string, unknown>) =>
      params ? `${key}${JSON.stringify(params)}` : key,
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type GrantEl = HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot };

async function settle(el: GrantEl) {
  for (let i = 0; i < 4; i += 1) {
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await el.updateComplete;
}

async function mount(): Promise<GrantEl> {
  const el = document.createElement('erp-verifactu-grant') as GrantEl & Record<string, string>;
  el.obligadoNif = '12345678Z';
  el.obligadoName = 'Manolo García';
  el.businessCity = 'Vigo';
  el.businessStreet = 'Rúa do Príncipe';
  el.businessNumber = '10';
  document.body.appendChild(el);
  await settle(el);
  return el;
}

const testid = (el: GrantEl, id: string) => el.shadowRoot.querySelector<HTMLElement>(`[data-testid="${id}"]`);
const text = (el: GrantEl) => el.shadowRoot.textContent ?? '';

async function drop(el: GrantEl, id: string, file: File) {
  testid(el, id)!.dispatchEvent(new CustomEvent('ok-change', { detail: { files: [file] }, bubbles: true, composed: true }));
  await el.updateComplete;
}

describe('what was sent is on screen (verifactu#115)', () => {
  it('names the submission number, its date and the documents we received', async () => {
    const el = await mount();

    const block = testid(el, 'grant-submitted');
    expect(block, 'no «what you sent» block').toBeTruthy();
    expect(block!.textContent).toContain('grant.submittedOn{"n":2,"date":"15/9/2026"}');
    expect(testid(el, 'grant-doc-signed_document')).toBeTruthy();
    expect(testid(el, 'grant-doc-dni_copy')).toBeTruthy();
    expect(testid(el, 'grant-doc-representation_proof')).toBeTruthy();
    expect(testid(el, 'grant-doc-signature_sample'), 'a part that was not sent is not listed as received').toBeNull();
  });

  it('lists the earlier submissions with their outcome and the reason', async () => {
    const el = await mount();

    const rows = el.shadowRoot.querySelectorAll('[data-testid="grant-history-row"]');
    expect(rows.length, 'one row per submission').toBe(2);
    expect(rows[0].textContent).toContain('grant.historyPending');
    expect(rows[1].textContent).toContain('grant.historyRejected');
    expect(rows[1].textContent).toContain('La copia del DNI está borrosa.');
  });

  it('a submission replaced by a newer one is said as such, not as a rejection', async () => {
    getDoor = {
      ok: true,
      status: 200,
      body: {
        ...PENDING,
        version: 3,
        history: [
          { version: 3, status: 'pendiente', submitted_at: '2026-09-15T12:00:00Z', reviewed_at: '', rejected_reason: '', superseded: false },
          { version: 2, status: 'rechazado', submitted_at: '2026-09-15T10:00:00Z', reviewed_at: '', rejected_reason: '', superseded: true },
        ],
      },
    };
    const el = await mount();

    const rows = el.shadowRoot.querySelectorAll('[data-testid="grant-history-row"]');
    expect(rows[1].textContent).toContain('grant.historyReplaced');
    expect(rows[1].textContent).not.toContain('grant.historyRejected');
  });

  it('with nothing sent there is no «what you sent» and no history', async () => {
    getDoor = { ok: true, status: 200, body: { status: 'absent', at: '', rejected_reason: '', version: 0, documents: {}, history: [] } };
    const el = await mount();

    expect(testid(el, 'grant-submitted')).toBeNull();
    expect(testid(el, 'grant-history')).toBeNull();
    expect(testid(el, 'grant-submit'), 'the form is the answer when nothing was sent').toBeTruthy();
  });
});

describe('sending again while it is under review (verifactu#115)', () => {
  it('under review, «send again» opens the form and says the new one replaces it', async () => {
    const el = await mount();

    expect(testid(el, 'grant-submit'), 'the form is closed until asked for').toBeNull();
    const resend = testid(el, 'grant-resend');
    expect(resend, 'no «send again» while under review').toBeTruthy();

    resend!.click();
    await settle(el);

    expect(testid(el, 'grant-submit')).toBeTruthy();
    expect(text(el)).toContain('grant.resendHintPending');
  });

  it('in force it also lets you send again, saying the current one keeps filing meanwhile', async () => {
    getDoor = { ok: true, status: 200, body: { ...PENDING, status: 'vigente', history: [PENDING.history[0]] } };
    const el = await mount();

    testid(el, 'grant-resend')!.click();
    await settle(el);

    expect(testid(el, 'grant-submit')).toBeTruthy();
    expect(text(el)).toContain('grant.resendHintInForce');
  });

  it('rejected: the form is already open, with no button to ask for it', async () => {
    getDoor = { ok: true, status: 200, body: { ...PENDING, status: 'rechazado', rejected_reason: 'Borrosa.' } };
    const el = await mount();

    expect(testid(el, 'grant-submit')).toBeTruthy();
    expect(testid(el, 'grant-resend')).toBeNull();
  });

  it('after sending again the panel re-reads the state from the core and closes the form', async () => {
    const el = await mount();
    testid(el, 'grant-resend')!.click();
    await settle(el);
    await drop(el, 'grant-signed-document', new File(['%PDF'], 'modelo.pdf', { type: 'application/pdf' }));
    await drop(el, 'grant-dni-copy', new File(['img'], 'dni.jpg', { type: 'image/jpeg' }));
    const getsBefore = calls.filter((c) => c.method === 'GET').length;

    testid(el, 'grant-submit')!.click();
    await settle(el);

    expect(calls.filter((c) => c.method === 'POST').length, 'the upload went out').toBe(1);
    expect(calls.filter((c) => c.method === 'GET').length, 'the state is READ back, never assumed').toBe(getsBefore + 1);
    expect(testid(el, 'grant-submit'), 'the form closes once the new submission is in').toBeNull();
    expect(testid(el, 'grant-resend')).toBeTruthy();
  });
});

describe('every new sentence has both catalogues (en + es)', () => {
  it('grant.* keys of this feature exist in en and es', async () => {
    const en = (await import('../../../locales/en.json')).default as { grant: Record<string, string> };
    const es = (await import('../../../locales/es.json')).default as { grant: Record<string, string> };
    for (const key of [
      'submittedTitle', 'submittedOn', 'reviewedOn',
      'docSignedDocument', 'docDniCopy', 'docSignatureSample', 'docRepresentationProof',
      'historyTitle', 'historyPending', 'historyInForce', 'historyRejected', 'historyRevoked', 'historyReplaced',
      'resend', 'resendCancel', 'resendHintPending', 'resendHintInForce',
    ]) {
      expect(en.grant[key], `en.grant.${key}`).toBeTruthy();
      expect(es.grant[key], `es.grant.${key}`).toBeTruthy();
    }
  });
});
