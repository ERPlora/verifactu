// verifactu#130 — the chain-recovery confirmation must leave the page once it is closed.
//
// The dialog is a GLOBAL Ionic overlay appended to document.body (verifactu#112). Ionic's dismiss()
// emits ionAlertDidDismiss and only THEN moves the teleported overlay back to its original parent
// (framework-delegate removeViewFromDom). A synchronous remove() in the listener is undone by that
// move, so every answer left a hidden <ion-alert> behind while the screen stayed open. Same fix and
// same test shape as sales#406 (erp-sales-list) and appointments#207.
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-recovery';

type AlertEl = HTMLElement & { buttons?: Array<{ text: string; role?: string }> };
type Wc = HTMLElement & {
  manualHash: string;
  requestRecovery: (kind: 'aeat' | 'manual') => void;
  updateComplete: Promise<unknown>;
};

const commands: Array<{ name: string; payload: Record<string, unknown> }> = [];
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  document.body.replaceChildren();
  commands.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => (name === 'verifactu.config.get' ? [{ issuer_nif: 'B12345678' }] : []),
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

async function mount(): Promise<Wc> {
  const el = document.createElement('erp-verifactu-recovery') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await tick();
  await el.updateComplete;
  return el;
}

async function openConfirmation(el: Wc, kind: 'aeat' | 'manual'): Promise<AlertEl> {
  if (kind === 'manual') el.manualHash = 'A'.repeat(64);
  el.requestRecovery(kind);
  await el.updateComplete;
  await tick();
  const alert = document.body.querySelector<AlertEl>(':scope > ion-alert');
  expect(alert, 'the confirmation is a global overlay in document.body').toBeTruthy();
  return alert!;
}

/** Dismisses the dialog the way Ionic does: the event first, then the overlay is moved back. */
async function dismissLikeIonic(alert: AlertEl, role: string): Promise<void> {
  alert.addEventListener('ionAlertDidDismiss', () => {
    void Promise.resolve().then(() => document.body.appendChild(alert));
  });
  alert.dispatchEvent(new CustomEvent('ionAlertDidDismiss', { detail: { role } }));
  for (let i = 0; i < 3; i++) await tick();
}

const alertsInPage = () => document.querySelectorAll('ion-alert').length;

describe('recovery — the confirmation does not linger in the page once closed (verifactu#130)', () => {
  it('stays in the page while it is open', async () => {
    const el = await mount();
    const alert = await openConfirmation(el, 'aeat');
    for (let i = 0; i < 3; i++) await tick();
    expect(document.body.querySelector('ion-alert'), 'an open dialog is not removed').toBe(alert);
  });

  it('«Cancel» removes it from the page, and nothing is recovered', async () => {
    const el = await mount();
    await dismissLikeIonic(await openConfirmation(el, 'aeat'), 'cancel');
    expect(alertsInPage()).toBe(0);
    expect(commands).toEqual([]);
  });

  it('confirming the AEAT recovery removes it from the page and still recovers', async () => {
    const el = await mount();
    await dismissLikeIonic(await openConfirmation(el, 'aeat'), 'confirm');
    expect(alertsInPage()).toBe(0);
    expect(commands.map((c) => c.name)).toEqual(['verifactu.recovery.from_aeat']);
  });

  it('closing it from the backdrop removes it from the page', async () => {
    const el = await mount();
    await dismissLikeIonic(await openConfirmation(el, 'manual'), 'backdrop');
    expect(alertsInPage()).toBe(0);
    expect(commands).toEqual([]);
  });

  it('answering it several times on the same screen never piles dialogs up', async () => {
    const el = await mount();
    const roles = ['cancel', 'backdrop', 'cancel', 'backdrop'];
    for (const [i, role] of roles.entries()) {
      await dismissLikeIonic(await openConfirmation(el, i % 2 ? 'manual' : 'aeat'), role);
    }
    expect(alertsInPage()).toBe(0);
  });
});
