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
  const answer = async (name: string) => {
    queryCalls.push(name);
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
