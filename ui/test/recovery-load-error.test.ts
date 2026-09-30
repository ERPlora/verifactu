// A list that could not load must not read «No AEAT data.» + «0 records» (pm#533, hub#2328).
//
// The shell's `<ok-data-table>` (OutfitKit ≥ 0.1.113) paints a failed load itself: «could not
// load», the reason and a Retry button. Every list of this screen hands it its controller's `error`
// and reloads on its `retry` event — and drops its own red banner, which would say the same thing
// twice. But a module paints with the SHELL's OutfitKit (ADR-0451): on a hub whose table has no
// `error` property the banner is the only place the reason is shown, so it stays.
//
// The shell's table is stood in for by a bare element registered BEFORE the screen loads (as the
// shell does at boot; the screen's own `define()` then loses, like in the hub). Its `error`
// property is added or removed per test, which is exactly what `dataTableShowsLoadError()` reads.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

class ShellTable extends HTMLElement {}
const errors = new WeakMap<HTMLElement, unknown>();

function shellTableKnowsErrors(yes: boolean) {
  if (yes) {
    Object.defineProperty(ShellTable.prototype, 'error', {
      configurable: true,
      get(this: HTMLElement) { return errors.get(this) ?? ''; },
      set(this: HTMLElement, v: unknown) { errors.set(this, v); },
    });
  } else {
    delete (ShellTable.prototype as { error?: unknown }).error;
  }
}

const TAG = 'erp-verifactu-recovery';
const TABLES = [
  { table: 'verifactu-recovery-table', banner: 'verifactu-recovery-load-error' },
] as const;

let hubAnswers = false;
/** The config and the chain status alone: they can fail while the list loads, and the other way round. */
let metaAnswers: boolean | null = null;
/** What an action (validate, consult, recover) is refused with; null lets it through. */
let refusal: string | null = null;
let pageCalls = 0;
let queryCalls: string[] = [];
let commandCalls: string[] = [];
/** Per-query answers that win over the flags above: what each read throws, or returns. */
let only: Record<string, { throws?: unknown; returns?: unknown }> = {};

beforeAll(async () => {
  customElements.define('ok-data-table', ShellTable);
  await import('../components/erp-verifactu-recovery/erp-verifactu-recovery');
});

beforeEach(() => {
  document.body.innerHTML = '';
  hubAnswers = false;
  metaAnswers = null;
  refusal = null;
  pageCalls = 0;
  queryCalls = [];
  commandCalls = [];
  only = {};
  const answer = async (name: string) => {
    queryCalls.push(name);
    const o = only[name];
    if (o && 'throws' in o) throw o.throws;
    if (o && 'returns' in o) return o.returns;
    if (!(metaAnswers ?? hubAnswers)) throw new Error('The hub is not responding.');
    return [];
  };
  (globalThis as Record<string, unknown>).erplora = {
    query: answer,
    queryOptional: answer,
    queryPage: async (name: string) => {
      pageCalls++;
      queryCalls.push(name);
      if (!hubAnswers) throw new Error('The hub is not responding.');
      return { rows: [{ id: 'r1', name: 'F-2026-001' }], total: 1 };
    },
    queryAll: async () => [],
    command: async (name: string) => {
      commandCalls.push(name);
      if (refusal) throw new Error(refusal);
      return {};
    },
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    currencyDecimals: 2,
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
  };
});

type Screen = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

async function mountFailed(tableId: string): Promise<{ el: Screen; table: HTMLElement }> {
  const el = document.createElement(TAG) as Screen;
  document.body.appendChild(el);
  await vi.waitFor(() => {
    if (pageCalls < TABLES.length) throw new Error('the lists have not asked for their page yet');
  });
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  const table = el.shadowRoot.querySelector<HTMLElement>(`ok-data-table[testid="${tableId}"]`);
  expect(table, `${TAG} paints ${tableId}`).toBeTruthy();
  return { el, table: table! };
}

describe.each(TABLES)(`${TAG} $table — a list that could not load (pm#533)`, (s) => {
  it('hands the reason to the shell table and paints no second banner', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed(s.table);
    expect((table as unknown as { error: string }).error).toBe('The hub is not responding.');
    expect(el.shadowRoot.querySelector(`[data-testid="${s.banner}"]`), 'the reason would be said twice').toBeNull();
  });

  it('Retry on the table asks the hub again and paints the rows that now arrive', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed(s.table);
    const before = pageCalls;
    hubAnswers = true;
    table.dispatchEvent(new CustomEvent('retry', { detail: {} }));
    await vi.waitFor(() => {
      if (pageCalls === before) throw new Error('Retry did not ask the hub again');
    });
    await vi.waitFor(async () => {
      await el.updateComplete;
      if ((table as unknown as { error: string }).error !== '') throw new Error('the error is still on the table');
    });
    expect((table as unknown as { rows: unknown[] }).rows).toEqual([{ id: 'r1', name: 'F-2026-001' }]);
    expect(commandCalls, 'Retry only reads: nothing is validated, consulted or recovered by it').toEqual([]);
  });

  it('on a shell whose table cannot paint the error, keeps its own banner with the reason', async () => {
    shellTableKnowsErrors(false);
    const { el } = await mountFailed(s.table);
    const banner = el.shadowRoot.querySelector(`[data-testid="${s.banner}"]`);
    expect(banner, 'an older hub would show the failure nowhere').toBeTruthy();
    expect(banner!.textContent).toContain('The hub is not responding.');
  });
});

const REASON = 'The hub is not responding.';

/** Every notice of the screen that carries `text`, by its testid ('' when it has none). */
function noticesWith(el: Screen, text: string): string[] {
  return [...el.shadowRoot.querySelectorAll('ok-inline-feedback, .err')]
    .filter((n) => n.textContent?.includes(text))
    .map((n) => n.getAttribute('data-testid') ?? '');
}

async function retry(el: Screen, table: HTMLElement): Promise<void> {
  const before = queryCalls.filter((n) => n === 'verifactu.chain.status' || n === 'verifactu.config.get').length;
  const pages = pageCalls;
  table.dispatchEvent(new CustomEvent('retry', { detail: {} }));
  await vi.waitFor(() => {
    if (pageCalls === pages) throw new Error('Retry did not ask for the list again');
    if (queryCalls.filter((n) => n === 'verifactu.chain.status' || n === 'verifactu.config.get').length === before) {
      throw new Error('Retry did not ask for the config and the chain status again');
    }
  });
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

describe('erp-verifactu-recovery — the config and the chain status load with the list (pm#533)', () => {
  // The NIF and the chain status are asked for when the screen opens, next to the list. With the hub
  // down the three fail for the same reason: said once, where the Retry is.
  it('when they fail with the list, the reason is said once: on the table', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed('verifactu-recovery-table');
    expect((table as unknown as { error: string }).error).toBe(REASON);
    expect(noticesWith(el, REASON), 'the table already says it').toEqual([]);
  });

  it('on a shell whose table cannot paint the error, the reason is said once: on the list banner', async () => {
    shellTableKnowsErrors(false);
    const { el } = await mountFailed('verifactu-recovery-table');
    expect(noticesWith(el, REASON)).toEqual(['verifactu-recovery-load-error']);
  });

  it('when only they fail, the page says why: the list has nothing to say it with', async () => {
    shellTableKnowsErrors(true);
    hubAnswers = true;
    metaAnswers = false;
    const { el, table } = await mountFailed('verifactu-recovery-table');
    expect((table as unknown as { error: string }).error).toBe('');
    expect(noticesWith(el, REASON)).toEqual(['verifactu-recovery-meta-error']);
  });

  it('Retry asks for them again, and nothing of the failed start is left on the screen', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed('verifactu-recovery-table');
    hubAnswers = true;
    await retry(el, table);
    await vi.waitFor(async () => {
      await el.updateComplete;
      if ((table as unknown as { error: string }).error !== '') throw new Error('the error is still on the table');
    });
    expect(noticesWith(el, REASON)).toEqual([]);
  });

  it('a Retry that brings the list back and not them leaves the reason on the page', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed('verifactu-recovery-table');
    hubAnswers = true;
    metaAnswers = false;
    await retry(el, table);
    await vi.waitFor(async () => {
      await el.updateComplete;
      if ((table as unknown as { error: string }).error !== '') throw new Error('the error is still on the table');
    });
    expect(noticesWith(el, REASON)).toEqual(['verifactu-recovery-meta-error']);
  });

  it('Retry does not take down what an action was refused with', async () => {
    // What the AEAT or the hub answered to «Validate chain» is not the list's to clear: it stays
    // until the next action, as it did before the table had a Retry.
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed('verifactu-recovery-table');
    refusal = 'The chain has a broken link at record 12.';
    await (el as unknown as { validate(): Promise<void> }).validate();
    await el.updateComplete;
    expect(noticesWith(el, refusal)).toHaveLength(1);
    refusal = null;
    hubAnswers = true;
    await retry(el, table);
    expect(noticesWith(el, 'The chain has a broken link at record 12.')).toHaveLength(1);
    expect(commandCalls, 'Retry validated nothing by itself').toEqual(['verifactu.chain.validate']);
  });
});

// verifactu#157 — when ONLY the NIF or the chain status cannot be read, the list is fine and has no
// Retry to offer: the page notice carries its own. It only READS: nothing is validated, consulted,
// recovered or sent to the AEAT by it.
const META = ['verifactu.config.get', 'verifactu.chain.status'];
const metaReads = (): number => queryCalls.filter((n) => META.includes(n)).length;

function metaNotice(el: Screen): HTMLElement | null {
  return el.shadowRoot.querySelector<HTMLElement>('[data-testid="verifactu-recovery-meta-error"]');
}
function metaRetry(el: Screen): HTMLElement | null {
  return el.shadowRoot.querySelector<HTMLElement>('[data-testid="verifactu-recovery-meta-retry"]');
}
function chainBox(el: Screen): HTMLElement {
  const box = el.shadowRoot.querySelector<HTMLElement>('[data-testid="verifactu-recovery-chain-status"]');
  expect(box, 'the chain status box is painted').toBeTruthy();
  return box!;
}
async function mountMetaFailed(): Promise<Screen> {
  shellTableKnowsErrors(true);
  hubAnswers = true;
  metaAnswers = false;
  const { el } = await mountFailed('verifactu-recovery-table');
  return el;
}
async function settle(el: Screen): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

describe('erp-verifactu-recovery — Retry on the notice when only the NIF or the chain status fail (verifactu#157)', () => {
  it('the notice offers Retry, inside the notice', async () => {
    const el = await mountMetaFailed();
    const button = metaRetry(el);
    expect(button, 'nothing lets the person try again but reloading the page').toBeTruthy();
    expect(button!.closest('[data-testid="verifactu-recovery-meta-error"]')).toBe(metaNotice(el));
    expect(button!.getAttribute('slot')).toBe('actions');
    expect(button!.textContent).toContain('ui.recRetryMeta');
  });

  it('Retry reads the NIF and the chain status again; once they answer the notice goes and the NIF is filled', async () => {
    const el = await mountMetaFailed();
    const reads = metaReads();
    const pages = pageCalls;
    metaAnswers = null;
    only = {
      'verifactu.config.get': { returns: [{ issuer_nif: 'B12345678' }] },
      'verifactu.chain.status': { returns: [{ event_type: 'chain_validated', message: '27 records' }] },
    };
    metaRetry(el)!.click();
    await vi.waitFor(async () => {
      await el.updateComplete;
      if (metaNotice(el)) throw new Error('the notice is still there');
    });
    expect(metaReads() - reads).toBe(2);
    expect(pageCalls, 'the list loaded fine: it is not asked again').toBe(pages);
    expect(noticesWith(el, REASON)).toEqual([]);
    expect(chainBox(el).getAttribute('heading')).toBe('ui.recChainValid');
    const nif = el.shadowRoot.querySelector('ion-input') as HTMLElement & { value?: string };
    expect(nif.value).toBe('B12345678');
  });

  it('Retry only reads: nothing is validated, consulted, recovered or sent to the AEAT', async () => {
    const el = await mountMetaFailed();
    metaRetry(el)!.click();
    await settle(el);
    metaAnswers = null;
    metaRetry(el)!.click();
    await settle(el);
    expect(commandCalls).toEqual([]);
    expect(queryCalls.filter((n) => !META.includes(n) && n !== 'verifactu.aeat.records.list')).toEqual([]);
  });

  it('a Retry that fails again leaves the reason once, with Retry still there', async () => {
    const el = await mountMetaFailed();
    const reads = metaReads();
    metaRetry(el)!.click();
    await vi.waitFor(() => {
      if (metaReads() === reads) throw new Error('Retry did not read again');
    });
    await settle(el);
    expect(noticesWith(el, REASON)).toEqual(['verifactu-recovery-meta-error']);
    expect(metaRetry(el)).toBeTruthy();
    expect(metaRetry(el)!.hasAttribute('disabled'), 'it can be tried again').toBe(false);
    expect(metaRetry(el)!.textContent).toContain('ui.recRetryMeta');
  });

  it('the button is a full touch target, like the toolbar buttons of the screen', async () => {
    const el = await mountMetaFailed();
    expect(getComputedStyle(metaRetry(el)!).minHeight).toBe('44px');
  });

  it('both failing for the same reason say it once inside the notice', async () => {
    const el = await mountMetaFailed();
    expect(metaNotice(el)!.textContent!.split(REASON)).toHaveLength(2);
  });

  it('while it reads again the button is disabled and says so, and a second tap does not read twice', async () => {
    const el = await mountMetaFailed();
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    only = { 'verifactu.config.get': { returns: gate.then(() => [{ issuer_nif: 'B1' }]) } };
    const reads = metaReads();
    metaRetry(el)!.click();
    await el.updateComplete;
    const button = metaRetry(el)!;
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.textContent).toContain('ui.recRetryingMeta');
    button.click();
    release();
    await settle(el);
    await settle(el);
    expect(metaReads() - reads, 'one Retry, one pair of reads').toBe(2);
  });

  it('Retry does not take down what an action was refused with', async () => {
    const el = await mountMetaFailed();
    // The NIF is typed by hand so the actions are enabled with the config unreadable.
    (el as unknown as { nif: string }).nif = 'B12345678';
    refusal = 'The chain has a broken link at record 12.';
    await (el as unknown as { validate(): Promise<void> }).validate();
    await el.updateComplete;
    refusal = null;
    metaAnswers = null;
    const reads = metaReads();
    metaRetry(el)!.click();
    await vi.waitFor(() => {
      if (metaReads() - reads < 2) throw new Error('Retry has not read yet');
    });
    await settle(el);
    expect(noticesWith(el, 'The chain has a broken link at record 12.')).toHaveLength(1);
    expect(commandCalls).toEqual(['verifactu.chain.validate']);
  });

  it('Retry does not take down the confirmation of an action that went through', async () => {
    const el = await mountMetaFailed();
    (el as unknown as { nif: string }).nif = 'B12345678';
    // The hub accepts the validation and the read that follows it fails again: both are on screen.
    await (el as unknown as { validate(): Promise<void> }).validate();
    await el.updateComplete;
    expect(noticesWith(el, 'ui.recDone')).toHaveLength(1);
    metaAnswers = null;
    metaRetry(el)!.click();
    await vi.waitFor(async () => {
      await el.updateComplete;
      if (metaNotice(el)) throw new Error('the notice is still there');
    });
    expect(noticesWith(el, 'ui.recDone')).toHaveLength(1);
    expect(commandCalls).toEqual(['verifactu.chain.validate']);
  });

  it('with the screen armed (NIF typed, recovery hash filled in) Retry sends nothing and asks for no confirmation', async () => {
    // Every action of the page could fire from this state. Retry is none of them: it reads.
    const el = await mountMetaFailed();
    const armed = el as unknown as { nif: string; manualHash: string; manualInvoice: string; manualDate: string };
    armed.nif = 'B12345678';
    armed.manualHash = 'a'.repeat(64);
    armed.manualInvoice = '2026/001';
    armed.manualDate = '2026-09-30';
    await el.updateComplete;
    const reads = metaReads();
    // Once while the reads still fail, once when they answer: neither path does anything else.
    metaRetry(el)!.click();
    await vi.waitFor(() => {
      if (metaReads() - reads < 2) throw new Error('Retry has not read yet');
    });
    await settle(el);
    metaAnswers = null;
    metaRetry(el)!.click();
    await vi.waitFor(async () => {
      await el.updateComplete;
      if (metaNotice(el)) throw new Error('the notice is still there');
    });
    await settle(el);
    expect(commandCalls).toEqual([]);
    expect(document.querySelector('ion-alert'), 'no recovery is put up for confirmation').toBeNull();
    expect(queryCalls.filter((n) => !META.includes(n) && n !== 'verifactu.aeat.records.list')).toEqual([]);
  });

  it('a NIF typed by hand is not replaced by the one Retry reads', async () => {
    const el = await mountMetaFailed();
    (el as unknown as { nif: string }).nif = 'A11111111';
    metaAnswers = null;
    only = { 'verifactu.config.get': { returns: [{ issuer_nif: 'B12345678' }] } };
    metaRetry(el)!.click();
    await vi.waitFor(async () => {
      await el.updateComplete;
      if (metaNotice(el)) throw new Error('the notice is still there');
    });
    const nif = el.shadowRoot.querySelector('ion-input') as HTMLElement & { value?: string };
    expect(nif.value).toBe('A11111111');
  });
});

// The component tests stand `t()` in for «returns the key», which leaves them blind to a sentence
// missing from a catalog: the key would come out the same in the test and raw on the screen.
describe('erp-verifactu-recovery — what the notice and the chain box say exists in both languages (verifactu#157)', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const ui = (locale: string): Record<string, unknown> =>
    (JSON.parse(readFileSync(join(root, 'locales', `${locale}.json`), 'utf8')) as { ui: Record<string, unknown> }).ui;
  const screen = readFileSync(join(root, 'ui/components/erp-verifactu-recovery/erp-verifactu-recovery.ts'), 'utf8');

  it.each(['recChainUnchecked', 'recErrLoadMeta', 'recRetryMeta', 'recRetryingMeta'])(
    'ui.%s: asked for by the screen, written in en and translated in es',
    (key) => {
      expect(screen, 'a key nobody paints proves nothing').toContain(`'ui.${key}'`);
      const en = ui('en')[key];
      const es = ui('es')[key];
      expect(typeof en === 'string' && en.trim() !== '', 'en').toBe(true);
      expect(typeof es === 'string' && es.trim() !== '', 'es').toBe(true);
      expect(es, 'es left in English').not.toBe(en);
    },
  );
});

describe('erp-verifactu-recovery — the chain box says it could not be checked (verifactu#157)', () => {
  it('when the chain status cannot be read, it does not say «not validated yet»', async () => {
    const el = await mountMetaFailed();
    expect(chainBox(el).getAttribute('heading')).toBe('ui.recChainUnchecked');
    expect(chainBox(el).getAttribute('tone')).toBe('warning');
  });

  it('when it was read and nobody has validated the chain, it says «not validated yet»', async () => {
    shellTableKnowsErrors(true);
    hubAnswers = true;
    const { el } = await mountFailed('verifactu-recovery-table');
    expect(chainBox(el).getAttribute('heading')).toBe('ui.recChainUnknown');
    expect(chainBox(el).getAttribute('tone')).toBe('neutral');
  });

  it('the NIF failing does not hide the chain status: each is read on its own', async () => {
    shellTableKnowsErrors(true);
    hubAnswers = true;
    only = {
      'verifactu.config.get': { throws: new Error(REASON) },
      'verifactu.chain.status': { returns: [{ event_type: 'chain_broken', message: 'record 12' }] },
    };
    const { el } = await mountFailed('verifactu-recovery-table');
    expect(chainBox(el).getAttribute('heading')).toBe('ui.recChainBroken');
    expect(noticesWith(el, REASON)).toEqual(['verifactu-recovery-meta-error']);
  });

  it('the chain status failing does not lose the NIF', async () => {
    shellTableKnowsErrors(true);
    hubAnswers = true;
    only = {
      'verifactu.config.get': { returns: [{ issuer_nif: 'B12345678' }] },
      'verifactu.chain.status': { throws: new Error(REASON) },
    };
    const { el } = await mountFailed('verifactu-recovery-table');
    const nif = el.shadowRoot.querySelector('ion-input') as HTMLElement & { value?: string };
    expect(nif.value).toBe('B12345678');
    expect(chainBox(el).getAttribute('heading')).toBe('ui.recChainUnchecked');
    expect(noticesWith(el, REASON)).toEqual(['verifactu-recovery-meta-error']);
  });

  it('a chain status that stops answering on Retry does not keep the last message under «could not be checked»', async () => {
    shellTableKnowsErrors(true);
    hubAnswers = true;
    only = {
      'verifactu.config.get': { throws: new Error(REASON) },
      'verifactu.chain.status': { returns: [{ event_type: 'chain_validated', message: '27 records verified' }] },
    };
    const { el } = await mountFailed('verifactu-recovery-table');
    expect(chainBox(el).textContent).toContain('27 records verified');
    only = { 'verifactu.chain.status': { throws: new Error(REASON) } };
    metaAnswers = false;
    metaRetry(el)!.click();
    await vi.waitFor(async () => {
      await el.updateComplete;
      if (chainBox(el).getAttribute('heading') !== 'ui.recChainUnchecked') throw new Error('still the old verdict');
    });
    expect(chainBox(el).textContent).not.toContain('27 records verified');
  });

  it('a Retry that brings the chain status back clears «could not be checked»', async () => {
    const el = await mountMetaFailed();
    metaAnswers = null;
    hubAnswers = true;
    metaRetry(el)!.click();
    await vi.waitFor(async () => {
      await el.updateComplete;
      if (metaNotice(el)) throw new Error('the notice is still there');
    });
    expect(chainBox(el).getAttribute('heading')).toBe('ui.recChainUnknown');
  });
});

describe('erp-verifactu-recovery — a failure that is not an Error still says why (verifactu#157)', () => {
  it.each([
    ['a bare string', 'nope'],
    ['an Error without a message', new Error('')],
    ['nothing at all', undefined],
  ])('%s: the notice carries the generic reason, not an empty red box', async (_label, thrown) => {
    shellTableKnowsErrors(true);
    hubAnswers = true;
    only = { 'verifactu.config.get': { throws: thrown } };
    const { el } = await mountFailed('verifactu-recovery-table');
    expect(metaNotice(el)?.textContent).toContain('ui.recErrLoadMeta');
  });
});
