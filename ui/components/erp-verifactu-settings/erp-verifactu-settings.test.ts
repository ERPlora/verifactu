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
/** The prerequisite row's status pill — the one whose label belongs to the capability block. */
function capabilityPill(el: HTMLElement & { shadowRoot: ShadowRoot }): Element | undefined {
  return [...el.shadowRoot.querySelectorAll('ok-status-pill')].find((p) =>
    ['ui.capabilityPending', 'ui.capabilityDenied'].includes(p.getAttribute('label') ?? ''));
}

describe('the signing permission is named at the point of use (verifactu#62)', () => {
  it('lists the permission as a prerequisite, with the way to grant it', async () => {
    const el = await mount();
    const text = el.shadowRoot.textContent ?? '';
    expect(text, 'the screen never mentions the permission VeriFactu needs to sign').toContain('ui.capabilityTitle');
    expect(text, 'the screen says what is missing but offers no way to fix it').toContain('ui.capabilityGoPermissions');
    // Neutral until the runtime says otherwise: the module cannot read the grant, and painting a
    // red «denied» it has not been told would be inventing a fact.
    expect(capabilityPill(el)?.getAttribute('tone')).toBe('neutral');
    expect(capabilityPill(el)?.getAttribute('label')).toBe('ui.capabilityPending');
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
    expect(wc.capabilityDenied, 'a proven refusal left the prerequisite row neutral').toBe(true);
    // The pill carries its label as an ATTRIBUTE, like the two prerequisites above it, so this is
    // what «the row turned red» means in the DOM.
    expect(capabilityPill(el)?.getAttribute('label')).toBe('ui.capabilityDenied');
    expect(capabilityPill(el)?.getAttribute('tone')).toBe('danger');
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
// The module reflects, it does not own: the grant is signed in Ajustes → Negocio (`/settings#tax`),
// where the runtime composes the Anexo I and a person at ERPlora approves it (ADR-0320 §5).
const DEFAULT_CONFIG = { issuer_nif: 'B12345678', environment: 'testing', has_certificate: 1 };

/** Every grant state the core publishes (`fiscal_profile::REPRESENTATION_*`), by its label. */
const GRANT_LABELS: Record<string, string> = {
  vigente: 'ui.grantVigente',
  pendiente: 'ui.grantPendiente',
  rechazado: 'ui.grantRechazado',
  revocado: 'ui.grantRevocado',
  absent: 'ui.grantAbsent',
};

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

/** The pill that belongs to the OWN-certificate prerequisite row. */
function certPill(el: HTMLElement & { shadowRoot: ShadowRoot }): Element | undefined {
  return [...el.shadowRoot.querySelectorAll('ok-status-pill')].find((p) =>
    ['ui.certLoaded', 'ui.certNotConfigured', 'ui.certNotNeeded'].includes(p.getAttribute('label') ?? ''));
}

/** The pill of the representation-grant row, whichever state it is in. */
function grantPill(el: HTMLElement & { shadowRoot: ShadowRoot }): Element | undefined {
  const states = Object.values(GRANT_LABELS);
  return [...el.shadowRoot.querySelectorAll('ok-status-pill')].find((p) =>
    states.includes(p.getAttribute('label') ?? ''));
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

  it('names the OWN route with the same words as Settings → Business', async () => {
    const { el } = await mountWithRoute({ transmission_route: 'own' });
    const text = el.shadowRoot.textContent ?? '';
    expect(text, 'the screen does not say which road the records take').toContain('ui.routeTitle');
    expect(text).toContain('ui.routeOwn');
    expect(text, 'the own route was described as the delegated one').not.toContain('ui.routeDelegated');
  });

  it('names the DELEGATED route, and does not claim a certificate the business has not got', async () => {
    // The hub#1489 case, exactly: a road (so `:has_certificate` is 1) and zero certificates.
    const { el } = await mountWithRoute({ transmission_route: 'delegated', representation_status: 'vigente' });
    expect(el.shadowRoot.textContent ?? '').toContain('ui.routeDelegated');
    expect(certPill(el)?.getAttribute('label'), 'a hub with no .p12 was told its certificate is loaded')
      .not.toBe('ui.certLoaded');
    expect(certPill(el)?.getAttribute('tone'), 'the missing certificate was painted as a success').not.toBe('success');
  });

  it('shows the grant state and its date, ONLY on the delegated route', async () => {
    const { el } = await mountWithRoute({
      transmission_route: 'delegated',
      representation_status: 'pendiente',
      representation_at: '2026-08-11T09:00:00Z',
    });
    const text = el.shadowRoot.textContent ?? '';
    expect(text, 'the grant state is missing on the road that depends on it').toContain('ui.grantTitle');
    // The state travels as the pill's ATTRIBUTE, like every other prerequisite on this screen.
    expect(grantPill(el)?.getAttribute('label')).toBe('ui.grantPendiente');
    expect(text, 'the grant carries no date, so nobody can tell a fresh upload from a stale one')
      .toContain('ui.grantSince');
    expect(
      [...el.shadowRoot.querySelectorAll('.kv code')].map((c) => c.textContent ?? ''),
      'the grant date is labelled but never printed',
    ).toContainEqual(expect.stringContaining('2026'));

    const own = await mountWithRoute({ transmission_route: 'own', representation_status: 'absent' });
    expect(own.el.shadowRoot.textContent ?? '', 'a hub with its own certificate was asked for a grant it does not need')
      .not.toContain('ui.grantTitle');
  });

  it.each([
    ['vigente', GRANT_LABELS.vigente, 'success'],
    ['pendiente', GRANT_LABELS.pendiente, 'warning'],
    ['rechazado', GRANT_LABELS.rechazado, 'danger'],
    ['revocado', GRANT_LABELS.revocado, 'danger'],
    ['absent', GRANT_LABELS.absent, 'warning'],
    // `''` is «never asked» and `absent` is «asked, there is none». Same row: the difference is
    // real for the runtime and means the same one thing to whoever has to sign it.
    ['', GRANT_LABELS.absent, 'warning'],
  ])('paints the grant state `%s` as %s', async (status, key, tone) => {
    const { el } = await mountWithRoute({ transmission_route: 'delegated', representation_status: status });
    const pill = [...el.shadowRoot.querySelectorAll('ok-status-pill')].find((p) => p.getAttribute('label') === key);
    expect(pill, `the grant state \`${status}\` is not painted`).toBeTruthy();
    expect(pill!.getAttribute('tone')).toBe(tone);
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

  it('the route CTA lands on Settings → Business (#tax), where the grant is signed', async () => {
    window.history.pushState({}, '', '/m/verifactu');
    const { el } = await mountWithRoute({ transmission_route: 'delegated' });
    (el as unknown as { goToSettings: () => void }).goToSettings();
    expect(window.location.pathname + window.location.hash).toBe('/settings#tax');
  });

  it('degrades to the old certificate reading when the runtime does not publish the route', async () => {
    // An older hub has neither hub#1416 nor hub#1489, so `:has_certificate` is still `can_sign` —
    // «own certificate», and the pre-hub#1489 rendering is the CORRECT one there. Inventing a route
    // would be the second deduction this issue exists to remove.
    const { el } = await mountWithRoute(null);
    expect(el.shadowRoot.textContent ?? '', 'a route the core did not publish was made up').toContain('ui.routeUnknown');
    expect(certPill(el)?.getAttribute('label')).toBe('ui.certLoaded');
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
    expect(el.shadowRoot.textContent ?? '').toContain('ui.routeUnknown');
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
