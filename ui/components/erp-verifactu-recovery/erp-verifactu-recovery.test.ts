// The component is imported STATICALLY on purpose (verifactu#31). Pulling it in drags the whole
// graph through Vite — OutfitKit's `ok-data-table`/`ok-inline-feedback` bundles, the module SDK and
// both locale catalogues. Doing that with `await import()` inside a test charged the transform to
// that test's 5 s budget, so with a cold transform cache and the fork pool competing for CPU the
// FIRST test of the file timed out (~50% of full-suite runs, always green in isolation). A
// top-level import is paid once while the file is collected, outside any test timeout.
import { beforeEach, describe, expect, it } from 'vitest';
import { ErpVerifactuRecovery } from './erp-verifactu-recovery';

/** The component renders one NIF input plus the three manual-recovery ones. */
const EXPECTED_INPUTS = 4;

const commands: Array<{ name: string; payload: Record<string, unknown> }> = [];

beforeEach(() => {
  document.body.replaceChildren();
  commands.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => name === 'verifactu.config.get'
      ? [{ issuer_nif: 'B12345678' }]
      : [],
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

async function mount() {
  const el = document.createElement('erp-verifactu-recovery');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

describe('VeriFactu recovery safety', () => {
  it('keeps critical controls at least 44px and all inputs labelled', async () => {
    // Touch-target contract: read off the class, not off a rendered box — happy-dom does no layout.
    const cssText = (ErpVerifactuRecovery.styles as unknown as { cssText: string }).cssText;
    expect(cssText).toContain('min-height:44px');

    const el = await mount();
    const inputs = [...el.shadowRoot.querySelectorAll('ion-input')];
    // Without this the loop below would pass vacuously if the render produced nothing.
    expect(inputs).toHaveLength(EXPECTED_INPUTS);
    for (const input of inputs) {
      expect(input.getAttribute('label')).toBeTruthy();
    }
  });

  // verifactu#112 — Ioan, 2026-09-13 on banco-pre: «Recuperar cadena desde la AEAT» left the screen
  // BLACK. The confirmation was an <ion-alert> declared inside this component's shadow root: the
  // backdrop painted, the dialog did not (Ionic styles `ion-alert` from the document, which does not
  // reach a shadow root), so nobody could confirm or cancel and the chain was never recovered. The
  // accessibility tree still listed both buttons, which is why a structural test kept passing.
  // Contract: the confirmation is a document-level overlay, the same way `sales` asks to void a sale.

  type Alert = HTMLElement & { header?: string; message?: string; buttons?: Array<{ text: string; role?: string }> };
  const openAlert = () => document.body.querySelector(':scope > ion-alert') as Alert | null;
  const dismiss = (alert: Alert, role: string) =>
    alert.dispatchEvent(new CustomEvent('ionAlertDidDismiss', { detail: { role } }));
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('asks for confirmation OUTSIDE its shadow root before recovering from the AEAT', async () => {
    const el = await mount();
    const wc = el as unknown as { requestRecovery: (kind: 'aeat') => void; updateComplete: Promise<unknown> };
    wc.requestRecovery('aeat');
    await wc.updateComplete;
    await settle();

    expect(el.shadowRoot.querySelector('ion-alert'), 'never inside the shadow root: it renders black').toBeNull();
    const alert = openAlert();
    expect(alert, 'a document-level confirmation is open').toBeTruthy();
    expect(alert!.header).toBe('ui.recConfirmAeatTitle');
    expect(alert!.message).toBe('ui.recConfirmAeatMessage');
    expect(alert!.buttons?.map((b) => b.role)).toEqual(['cancel', 'confirm']);
    expect(commands, 'nothing runs before the confirmation').toEqual([]);

    dismiss(alert!, 'confirm');
    await settle();
    expect(commands).toContainEqual({
      name: 'verifactu.recovery.from_aeat',
      payload: { issuer_nif: 'B12345678' },
    });
    expect(openAlert(), 'the confirmation leaves the document once answered').toBeNull();
  });

  it('cancelling the confirmation recovers nothing and closes it', async () => {
    const el = await mount();
    const wc = el as unknown as { requestRecovery: (kind: 'aeat') => void; updateComplete: Promise<unknown> };
    wc.requestRecovery('aeat');
    await wc.updateComplete;
    await settle();

    dismiss(openAlert()!, 'cancel');
    await settle();
    expect(commands).toEqual([]);
    expect(openAlert()).toBeNull();
  });

  it('the manual recovery goes through the same visible confirmation', async () => {
    const el = await mount();
    const wc = el as unknown as {
      manualHash: string;
      requestRecovery: (kind: 'manual') => void;
      updateComplete: Promise<unknown>;
    };
    wc.manualHash = 'A'.repeat(64);
    wc.requestRecovery('manual');
    await wc.updateComplete;
    await settle();

    const alert = openAlert();
    expect(alert!.header).toBe('ui.recConfirmManualTitle');
    dismiss(alert!, 'confirm');
    await settle();
    expect(commands.map((c) => c.name)).toContain('verifactu.recovery.manual');
  });

  it('rejects an invalid manual hash before opening confirmation', async () => {
    const el = await mount();
    const wc = el as unknown as {
      manualHash: string;
      requestRecovery: (kind: 'manual') => void;
      updateComplete: Promise<unknown>;
    };
    wc.manualHash = 'not-a-hash';
    wc.requestRecovery('manual');
    await wc.updateComplete;
    await settle();

    expect(openAlert(), 'no confirmation for a hash that cannot be used').toBeNull();
    expect(el.shadowRoot.querySelector('ion-alert')).toBeNull();
    expect(commands).toEqual([]);
  });
});
