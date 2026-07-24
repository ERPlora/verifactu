import { beforeEach, describe, expect, it } from 'vitest';

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
  await import('./erp-verifactu-recovery');
  const el = document.createElement('erp-verifactu-recovery');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

describe('VeriFactu recovery safety', () => {
  it('keeps critical controls at least 44px and all inputs labelled', async () => {
    const el = await mount();
    const cssText = (el.constructor as unknown as { styles: { cssText: string } }).styles.cssText;
    expect(cssText).toContain('min-height:44px');
    for (const input of el.shadowRoot.querySelectorAll('ion-input')) {
      expect(input.getAttribute('label')).toBeTruthy();
    }
  });

  it('does not recover from AEAT before contextual confirmation', async () => {
    const el = await mount();
    const wc = el as unknown as {
      requestRecovery: (kind: 'aeat') => void;
      onRecoveryDismiss: (ev: CustomEvent<{ role: string }>) => Promise<void>;
      updateComplete: Promise<unknown>;
    };
    wc.requestRecovery('aeat');
    await wc.updateComplete;

    const alert = el.shadowRoot.querySelector('ion-alert') as HTMLElement & {
      isOpen: boolean;
    };
    expect(alert.isOpen).toBe(true);
    expect(alert.getAttribute('message')).toBe('ui.recConfirmAeatMessage');
    expect(commands).toEqual([]);

    await wc.onRecoveryDismiss(new CustomEvent('dismiss', { detail: { role: 'confirm' } }));
    expect(commands).toContainEqual({
      name: 'verifactu.recovery.from_aeat',
      payload: { issuer_nif: 'B12345678' },
    });
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

    const alert = el.shadowRoot.querySelector('ion-alert') as HTMLElement & { isOpen: boolean };
    expect(alert.isOpen).toBe(false);
    expect(commands).toEqual([]);
  });
});
