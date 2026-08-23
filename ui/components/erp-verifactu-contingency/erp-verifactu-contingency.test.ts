// The gate refusal (verifactu#27) reaches the UI as a raw Postgres CHECK-violation error
// mentioning `verifactu__gate`. The component must translate it into the friendly i18n
// message; any other failure keeps the raw message (existing behavior).
//
// The component is imported STATICALLY on purpose (verifactu#31): an `await import()` inside a test
// charges the whole Vite transform of the OutfitKit/SDK graph to that test's 5 s budget, which is
// what made the first test of a component file time out under the parallel fork pool.
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-contingency';

let cancelError: Error | null = null;

beforeEach(() => {
  document.body.replaceChildren();
  cancelError = null;
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async (name: string) => {
      if (name === 'verifactu.contingency.cancel' && cancelError) throw cancelError;
      return {};
    },
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

async function mount() {
  const el = document.createElement('erp-verifactu-contingency');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

async function cancelOn(el: HTMLElement): Promise<void> {
  const wc = el as unknown as {
    cancel: (queueId: string) => Promise<void>;
    updateComplete: Promise<unknown>;
  };
  await wc.cancel('q-1');
  await wc.updateComplete;
}

describe('contingency cancel refusal in the UI (verifactu#27)', () => {
  it('maps the gate violation to the friendly i18n message', async () => {
    const el = await mount();
    cancelError = new Error(
      'db error: new row for relation "verifactu__gate" violates check constraint "verifactu__gate_ok_check"',
    );
    await cancelOn(el);
    expect(el.shadowRoot.querySelector('.err')?.textContent).toBe('ui.errCancelRequiredRecord');
  });

  // verifactu#40: migration 012 renamed this gate's constraint after the gate itself, so the
  // message the runtime really hands over changed. The mapping keys on the RELATION name, which
  // both spellings carry — but the case above is now historical, and a battery that only pins a
  // message production no longer emits would keep passing while the live one broke.
  it('maps the gate violation under its own constraint name too (migration 012)', async () => {
    const el = await mount();
    cancelError = new Error(
      'error returned from database: new row for relation "verifactu__gate" violates check constraint "contingency_cancel_requires_accepted_record"',
    );
    await cancelOn(el);
    expect(el.shadowRoot.querySelector('.err')?.textContent).toBe('ui.errCancelRequiredRecord');
  });

  it('keeps the raw message for any other failure', async () => {
    const el = await mount();
    cancelError = new Error('network down');
    await cancelOn(el);
    expect(el.shadowRoot.querySelector('.err')?.textContent).toBe('network down');
  });
});
