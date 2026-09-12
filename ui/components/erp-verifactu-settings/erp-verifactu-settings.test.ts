// verifactu#50 — the «Emit test invoice» button speaks `invoice.create`'s WIRE contract.
//
// The test invoice is the only product caller of `invoice.create` outside invoice's own UI, and it
// was built when `quantity` still travelled as a bare logical number. Since ADR-0147 the quantity
// is a FIXED-POINT integer of scale 10⁶ (1 unit = 1000000) and `unit_price` is integer minor
// units (cents, ADR-0123). The button sent `quantity: 1` — 0,000001 units — so:
//
//   - before invoice 1.2.17 the test invoice was ISSUED for 0.00 € (numbered, `alta` record,
//     hash-chained): 0.000001 units × 100 cents prices to 0;
//   - since invoice 1.2.17 (invoice#49) the destination refuses it twice: the schema floor
//     `quantity.minimum: 1000` (422 `invalid_payload`) and, past the schema, the domain guard
//     `invoice.line_amount_underflow` (409) for any priced line whose amount rounds to 0.
//
// These tests pin the payload that leaves the button so the next test line cannot repeat the
// mistake. The component is imported STATICALLY on purpose (verifactu#31): a dynamic import
// inside a test charges the whole OutfitKit/SDK transform to that test's 5 s budget.
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-settings';

const commands: Array<{ name: string; payload: Record<string, unknown> }> = [];

beforeEach(() => {
  document.body.replaceChildren();
  commands.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => name === 'verifactu.config.get'
      ? [{ issuer_nif: 'B12345678', environment: 'testing', has_certificate: 1 }]
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
  const el = document.createElement('erp-verifactu-settings');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

async function emitTestInvoice(el: HTMLElement) {
  const wc = el as unknown as { createTestInvoice: () => Promise<void>; updateComplete: Promise<unknown> };
  await wc.createTestInvoice();
  await wc.updateComplete;
}

function lastInvoiceCreate() {
  return commands.find((c) => c.name === 'invoice.create');
}

describe('test invoice button: `invoice.create` wire contract (verifactu#50)', () => {
  it('sends quantity in µ-units (1 unit = 1000000, ADR-0147) and unit_price in cents', async () => {
    const el = await mount();
    await emitTestInvoice(el);

    const alta = lastInvoiceCreate();
    expect(alta, 'the button did not call invoice.create').toBeTruthy();
    expect(alta!.payload.items).toEqual([
      { description: 'Factura de PRUEBA VeriFactu (entorno de pruebas)', quantity: 1_000_000, unit_price: 100, tax_rate: 21, product_id: null },
    ]);
    // The rest of the diagnostic envelope stays as it was: F2 ticket, test source, TICKET series.
    expect(alta!.payload).toMatchObject({ series_code: 'TICKET', invoice_type: 'F2', source_type: 'test' });
  });

  it('clears both invoice#49 rejections: the schema floor (422) and the zero-amount line (409)', async () => {
    const el = await mount();
    await emitTestInvoice(el);

    const item = (lastInvoiceCreate()!.payload.items as Array<{ quantity: number; unit_price: number }>)[0];
    // Gate 1 — schemas/create_invoice.json: `quantity.minimum: 1000` (a bare `1` is the 422).
    expect(item.quantity, 'quantity below 1000 is a scale mistake, not a quantity').toBeGreaterThanOrEqual(1000);
    // Gate 2 — handler: a PRICED line whose amount rounds to 0 is `invoice.line_amount_underflow`.
    const base = Math.round((item.quantity / 1_000_000) * item.unit_price);
    expect(base, 'the line must price above 0 or no invoiceable line exists').toBeGreaterThan(0);
  });

  it('the derived VAT breakdown still squares: base + quota = total', async () => {
    const el = await mount();
    await emitTestInvoice(el);

    const item = (lastInvoiceCreate()!.payload.items as Array<{ quantity: number; unit_price: number; tax_rate: number }>)[0];
    // Same arithmetic the destination runs (manual line, tax-EXCLUSIVE): base = price × qty,
    // quota = base × rate/100, total = base + quota — all integer minor units.
    const base = Math.round((item.quantity / 1_000_000) * item.unit_price);
    const quota = Math.round((base * item.tax_rate) / 100);
    // 1 unit × 1.00 € at 21 %: base 1.00 € + quota 0.21 € — the real test invoice, not 0.00 €.
    expect(base).toBe(100);
    expect(quota).toBe(21);
    expect(base + quota).toBe(121);
  });
});

// ── verifactu#40 — a refusal has to say WHAT was refused, in the user's language ────────────
//
// The demo report ("activating VeriFactu does not persist") was investigated as a persistence
// bug and is not one: since hub#684 the core SEEDS a demo's fiscal identity at boot
// (`business_tax_id = B00000000`), so the taxpayer gate of verifactu#49 is satisfied and the
// save applies — `tests/demo_activation.postgres.test.py` pins that against a real Postgres.
//
// What was left is the half the reporter actually felt: when a save IS refused, the screen did
// not tell the truth about it.
//
//   * The gate name never reached the browser. A rollback arrives as the Postgres CHECK
//     violation, and `PgDatabaseError`'s `Display` writes only the PRIMARY message — the `gate`
//     value lives in the separate DETAIL field, which `message()` drops. So the branch looking
//     for `config_save_requires_issuer` could never match and EVERY gate fell through to the
//     go-live text: a hub with no taxpayer was told that "going live is one way", which is not
//     its problem. Migration 012 moves each gate's name into its own CONSTRAINT NAME, which is
//     part of the primary message.
//   * A demo closure (ADR-0197 §4) arrives as an `ErploraError` with a stable `code` and an
//     ENGLISH sentence written for a developer. The screen printed that sentence verbatim, so a
//     Spanish visitor got untranslated English — and, worse, prose instead of the one thing that
//     is stable and translatable: the code.
//
// These tests pin BOTH: map on the `code` the SDK already carries, fall back to the constraint
// name in the text, and never let raw SQL reach a person.
class FakeErploraError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ErploraError';
    this.code = code;
  }
}

/** The message the RUNTIME really hands over for a gate rollback: primary line only. */
function gateRefusal(constraint: string) {
  return new Error(
    `error returned from database: new row for relation "verifactu__gate" violates check constraint "${constraint}"`,
  );
}

async function saveWith(rejection: unknown) {
  (globalThis as Record<string, unknown>).erplora = {
    ...((globalThis as Record<string, unknown>).erplora as object),
    command: async () => {
      throw rejection;
    },
  };
  const el = await mount();
  const wc = el as unknown as { save: (e: Event) => Promise<void>; error: string; updateComplete: Promise<unknown> };
  await wc.save(new Event('submit'));
  await wc.updateComplete;
  return wc;
}

describe('a refused save says what was refused (verifactu#40)', () => {
  it.each([
    ['demo_fiscal_environment_locked', 'ui.errDemoEnvironmentLocked'],
    ['demo_business_certificate_locked', 'ui.errDemoCertificateLocked'],
    ['demo_fiscal_identity_locked', 'ui.errDemoIdentityLocked'],
  ])('translates the demo closure `%s` instead of printing the runtime English', async (code, key) => {
    const wc = await saveWith(
      new FakeErploraError(code, 'this is a demo hub: its tax authority environment stays on testing'),
    );
    expect(wc.error, 'the demo closure was not mapped to its catalogue key').toBe(key);
    expect(wc.error).not.toMatch(/this is a demo hub/i);
  });

  it('names the missing taxpayer instead of the go-live refusal', async () => {
    // The exact string the browser gets once migration 012 names the constraint after the gate.
    const wc = await saveWith(gateRefusal('config_save_requires_issuer'));
    expect(wc.error, 'a hub with no taxpayer was told the go-live story').toBe('ui.errIssuerRequired');
  });

  it('still names the go-live refusal when THAT is the gate that fired', async () => {
    const wc = await saveWith(gateRefusal('config_save_go_live_is_one_way'));
    expect(wc.error).toBe('ui.errGoLiveIsOneWay');
  });

  it('never shows raw SQL to a person, whichever gate fired', async () => {
    for (const constraint of ['config_save_requires_issuer', 'config_save_go_live_is_one_way', 'verifactu__gate_ok_check']) {
      const wc = await saveWith(gateRefusal(constraint));
      expect(wc.error, `the ${constraint} refusal leaked SQL`).not.toMatch(/verifactu__gate|check constraint|relation/i);
    }
  });
});

// ── verifactu#62 — the SIGNING PERMISSION is named at the POINT OF USE ──────────────────────
//
// The core already does its half (hub#1191/#1171/#1119): an `invoice.created` refused by the
// `certificate` capability dies on the first pass with `capability_denied`, and the hub's setup
// checklist does not call `verifactu` configured while the grant is missing. What was missing is
// this screen — the one place the owner actually turns VeriFactu ON. It took the switch, saved,
// and said nothing, even though the «Business certificate (fiscal signing)» permission is OFF by
// default in every hub whose modules did not enter through the Apps consent dialog (blueprint,
// API, import: grants are deliberately not portable).
//
// Auto-granting is NOT the fix (ADR-0079: a person grants a capability; granting it on activation
// would make the gate decoration). What the market does instead is ask at the point of use —
// iOS/Android prompt when the feature needs the permission, Odoo and Business Central block the
// fiscal activation step and SAY what is missing. So: the permission is listed as a prerequisite
// next to the two that were already listed (taxpayer and certificate), each with the same «go
// there» affordance, and the moment the runtime PROVES the refusal the row turns red.
//
// What this module cannot do, and why the row is neutral until proven otherwise: the grant state
// is not readable from a module. `capabilities::enforce` runs in Rust in front of a NATIVE command
// handler, `system_params` injects `:has_certificate`/`:is_demo_hub` but nothing about grants, and
// the SDK exposes no capability API on purpose (`architecture/hub/module-capabilities.md`: a
// browser-side identity may only SUBTRACT, never grant). Claiming «denied» before a refusal would
// be inventing a fact — so the row states the requirement, and only a real `capability_denied`
// turns it into a denial.

describe('the signing permission is named at the point of use (verifactu#62)', () => {
  // 13/09: the permanent prerequisite row was a MIRROR of Settings → Permissions — it could not be
  // acted on here, and it sat in front of the three controls that can. What stays is the part that
  // was never a mirror: the moment the runtime PROVES the refusal, the screen says so, with the way
  // to grant it. Before that it says nothing — the module cannot read the grant, and a «denied» it
  // has not been told would be inventing a fact.
  it('says nothing about the permission until the runtime has refused it', async () => {
    const el = await mount();
    expect(
      el.shadowRoot.querySelector('ok-inline-feedback[heading="ui.capabilityTitle"]'),
      'a permission nobody has refused yet was painted as a problem',
    ).toBeNull();
  });

  it('the CTA lands on Settings → Permissions, not on Settings → General', async () => {
    window.history.pushState({}, '', '/m/verifactu');
    const el = await mount();
    (el as unknown as { goToPermissions: () => void }).goToPermissions();
    // `/settings` bare lands on the Hub tab (`resolveSettingsTab` degrades an unknown hash), which
    // is the mistake verifactu#49 already paid for with the certificate link.
    expect(window.location.pathname + window.location.hash).toBe('/settings#permissions');
  });

  it('names the refused capability instead of printing the runtime sentence', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...((globalThis as Record<string, unknown>).erplora as object),
      command: async () => {
        throw new FakeErploraError(
          'capability_denied',
          'permiso del módulo `verifactu` denegado: requiere la capability `certificate`',
        );
      },
    };
    const el = await mount();
    const wc = el as unknown as {
      runTest: () => Promise<void>;
      error: string;
      capabilityDenied: boolean;
      updateComplete: Promise<unknown>;
    };
    await wc.runTest();
    await wc.updateComplete;

    expect(wc.error, 'the refusal was not mapped to its catalogue key').toBe('ui.errCapabilityDenied');
    // The catalogue KEY is allowed to contain the word (`ui.errCapabilityDenied`); what must never
    // reach a person is the runtime's own sentence, which names the raw capability id.
    expect(wc.error, 'the runtime prose reached the operator untranslated').not.toMatch(/permiso del módulo|`certificate`/i);
    expect(wc.capabilityDenied, 'a proven refusal was not recorded').toBe(true);
    // …and the refusal is SHOWN, with the way to grant it: a denial nobody sees is the silence
    // verifactu#62 was opened for.
    // The notice carries its title as the `heading` ATTRIBUTE of `ok-inline-feedback`, so that is
    // where «the refusal is on the screen» is read; the way to fix it is its slotted text.
    const notice = el.shadowRoot.querySelector('ok-inline-feedback[heading="ui.capabilityTitle"]');
    expect(notice, 'the proven refusal is not on the screen').toBeTruthy();
    expect(notice?.textContent ?? '', 'the screen names the refusal but offers no way to fix it').toContain('ui.capabilityGoPermissions');
  });

  it('a save that turns VeriFactu ON says what still has to be granted for it to sign', async () => {
    const el = await mount();
    const wc = el as unknown as {
      cfg: Record<string, unknown>;
      save: (e: Event) => Promise<void>;
      error: string;
      updateComplete: Promise<unknown>;
    };
    wc.cfg = { ...wc.cfg, enabled: true };
    await wc.save(new Event('submit'));
    await wc.updateComplete;

    expect(wc.error, 'the save must NOT fail: it is plain SQL and does not depend on the gate').toBe('');
    expect(
      el.shadowRoot.textContent ?? '',
      'the switch was stored as ON and the screen said nothing about the permission',
    ).toContain('ui.enabledNeedsPermission');
  });

  it('a save that leaves VeriFactu OFF does not nag about a permission nothing needs yet', async () => {
    const el = await mount();
    const wc = el as unknown as {
      cfg: Record<string, unknown>;
      save: (e: Event) => Promise<void>;
      updateComplete: Promise<unknown>;
    };
    wc.cfg = { ...wc.cfg, enabled: false };
    await wc.save(new Event('submit'));
    await wc.updateComplete;

    expect(el.shadowRoot.textContent ?? '').not.toContain('ui.enabledNeedsPermission');
  });
});

// ── verifactu#41 — the screen says WHICH ROUTE the records take, in the RUNTIME's words ─────
//
// ADR-0320 gave the hub two mutually exclusive roads to the AEAT: `own` (it signs and files with
// the business's own `.p12`) and `delegated` (the fiscal cell files on its behalf with ERPlora's
// Sello, authorised by the signed Anexo I). This screen showed neither, and since hub#1489 it does
// worse than omit — it LIES.
//
// `:has_certificate` used to be `certificate::can_sign` and was `0` for a hub on the cell road, so
// «not configured» happened to be right. hub#1489 made it `can_transmit` — «has this hub a ROAD?»
// — which answers `1` on BOTH roads. From that commit on, a business with zero certificates reads
// «loaded ✓» on this screen, and «Send test» is offered on a road where the diagnostic cannot run
// (hub#1485, still open: it demands the core identity).
//
// The word that DOES tell the two apart is `transmission_route`, from the core query
// `hub.fiscal.transmission` (hub#1416, frozen in `contracts/kernel/engine.snapshot`). One rule,
// `certificate::route_of`, answered by the core and PAINTED here — never a second deduction of the
// same fact, which is how a screen and a production gate end up disagreeing about a business.
//
// 13/09: the road is now the «Use my own certificate» switch of this screen, and the grant is
// signed in Configuración → «Lo remite ERPlora» (`/m/verifactu/config#delegated`). The invariant this
// block pins did not move with them: the road is READ from the core, never deduced.
const DEFAULT_CONFIG = { issuer_nif: 'B12345678', environment: 'testing', has_certificate: 1 };

/** Mounts with the core query answering `row`; `null` = the runtime does not publish it. */
async function mountWithRoute(row: Record<string, unknown> | null, cfg: Record<string, unknown> = {}) {
  const asked: string[] = [];
  (globalThis as Record<string, unknown>).erplora = {
    ...((globalThis as Record<string, unknown>).erplora as object),
    query: async (name: string) => {
      asked.push(name);
      if (name === 'verifactu.config.get') return [{ ...DEFAULT_CONFIG, ...cfg }];
      if (name === 'hub.fiscal.transmission') return row ? [row] : [];
      return [];
    },
  };
  const el = await mount();
  return { el, asked };
}

/** The «Use my own certificate» switch — the road, as this screen shows it. */
function ownSwitch(el: HTMLElement & { shadowRoot: ShadowRoot }): Element | null {
  return el.shadowRoot.querySelector('[data-testid="settings-own-certificate"]');
}

/** The «Send test» button — the first action of the live-test card. */
function testButton(el: HTMLElement & { shadowRoot: ShadowRoot }): Element | undefined {
  return [...el.shadowRoot.querySelectorAll('.test-actions ion-button')][0];
}

describe('the filing route is read from the core, never deduced (verifactu#41)', () => {
  it('asks `hub.fiscal.transmission` instead of deriving the route from :has_certificate', async () => {
    const { asked } = await mountWithRoute({ transmission_route: 'own' });
    expect(asked, 'the screen never asked the core which road this hub is on').toContain('hub.fiscal.transmission');
  });

  it('the OWN road switches «use my own certificate» ON', async () => {
    const { el } = await mountWithRoute({ transmission_route: 'own' });
    expect(ownSwitch(el)?.hasAttribute('checked'), 'the own road was shown as the delegated one').toBe(true);
  });

  it('the DELEGATED road leaves it OFF, even though :has_certificate says 1', async () => {
    // The hub#1489 case, exactly: a road (so `:has_certificate` is 1) and zero certificates.
    const { el } = await mountWithRoute({ transmission_route: 'delegated', representation_status: 'vigente' });
    expect(ownSwitch(el)?.hasAttribute('checked'), 'a hub with no .p12 was told it files with its own').toBe(false);
  });

  it('the grant is not painted here any more: it lives in Configuración', async () => {
    const { el } = await mountWithRoute({ transmission_route: 'delegated', representation_status: 'pendiente' });
    expect(el.shadowRoot.textContent ?? '', 'the grant is back on the settings screen').not.toContain('ui.grantTitle');
  });

  // This assertion used to read the other way round — «does not offer a live test the delegated
  // road cannot answer» — and it was right while the ENGINE still resolved the diagnostic through
  // the core identity: on this road it could only ever answer «your certificate does not load» to a
  // business that holds none. hub#1485 moved `run_diagnostics` onto `resolve_route`, so the cell
  // road now probes the cell's readiness instead of filing a sample. Withholding the button — and
  // explaining that the test «needs a certificate of your own» — was the last half of that same
  // defect, so the expectation flips with the engine that caused it.
  // What each road offers and says is pinned in `diagnostics-road.test.ts`.
  it('offers the live test on the delegated road (hub#1485)', async () => {
    const { el } = await mountWithRoute({ transmission_route: 'delegated' });
    expect(testButton(el)?.hasAttribute('disabled'), '«Send test» is withheld from a road that can run it')
      .toBe(false);
  });

  it('keeps the live test on the own road', async () => {
    const { el } = await mountWithRoute({ transmission_route: 'own' });
    expect(testButton(el)?.hasAttribute('disabled')).toBe(false);
  });

  it('the road CTA lands on Configuración, in the tab of the road the hub is on', async () => {
    window.history.pushState({}, '', '/m/verifactu/settings');
    const delegated = await mountWithRoute({ transmission_route: 'delegated' });
    (delegated.el as unknown as { goConfig: (t: string) => void }).goConfig('delegated');
    expect(window.location.pathname + window.location.hash).toBe('/m/verifactu/config#delegated');

    const own = await mountWithRoute({ transmission_route: 'own' });
    (own.el as unknown as { goConfig: (t: string) => void }).goConfig('own');
    expect(window.location.pathname + window.location.hash).toBe('/m/verifactu/config#own');
  });

  it('degrades to the old certificate reading when the runtime does not publish the route', async () => {
    // An older hub has neither hub#1416 nor hub#1489, so `:has_certificate` is still `can_sign` —
    // «own certificate», and the pre-hub#1489 rendering is the CORRECT one there. Inventing a route
    // would be the second deduction this issue exists to remove.
    const { el } = await mountWithRoute(null);
    expect(ownSwitch(el)?.hasAttribute('checked'), 'the pre-hub#1489 reading was not the one used').toBe(true);
    expect(testButton(el)?.hasAttribute('disabled')).toBe(false);
  });

  it('survives a core query that refuses, without breaking the rest of the screen', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...((globalThis as Record<string, unknown>).erplora as object),
      query: async (name: string) => {
        if (name === 'hub.fiscal.transmission') throw new FakeErploraError('query_not_found', 'hub.fiscal.transmission');
        if (name === 'verifactu.config.get') return [DEFAULT_CONFIG];
        return [];
      },
    };
    const el = await mount();
    const wc = el as unknown as { error: string };
    expect(wc.error, 'a route the screen only REFLECTS took over the screen-wide error slot').toBe('');
    expect(ownSwitch(el), 'a refused read took the road switch down with it').toBeTruthy();
  });

  it('every string it paints has both catalogues (en + es)', async () => {
    const en = (await import('../../../locales/en.json')).default as Record<string, Record<string, string>>;
    const es = (await import('../../../locales/es.json')).default as Record<string, Record<string, string>>;
    const added = [
      'routeTitle', 'routeOwn', 'routeDelegated', 'routeLoading', 'routeUnknown', 'routeUnknownHint',
      'routeOwnHint', 'routeDelegatedHint', 'grantTitle', 'grantVigente', 'grantPendiente',
      'grantRechazado', 'grantRevocado', 'grantAbsent', 'grantSince', 'grantHint',
      'certNotNeeded', 'certOptionalHint', 'testNeedsOwnCertificate',
      // hub#1485 — `testDelegatedUnavailable` is gone with the behaviour it described.
      'testNeedsGatewayIdentity', 'testRoute', 'testGatewayReady', 'testGatewayNotReady',
      'testAeatNotSentDelegated',
    ];
    for (const k of added) {
      expect(en.ui?.[k], `\`ui.${k}\` has no English source`).toBeTruthy();
      expect(es.ui?.[k], `\`ui.${k}\` was never translated to Spanish`).toBeTruthy();
    }
  });
});
