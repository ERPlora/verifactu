// hub#1485 — «Probar conexión» on the DELEGATED road.
//
// The engine used to resolve the diagnostic through `build_identity`, which only knows about the
// business's own `.p12`. A hub that files through the fiscal cell (ADR-0320: ERPlora presents with
// its Seal, the business holds no certificate) was therefore told its certificate would not load —
// and sent off to renew one it has never had. hub#1485 moved `run_diagnostics` onto `resolve_route`,
// the same door transmission and consult already use, so the engine now answers per road:
//
//   own       → files the sample to the AEAT, as always;
//   delegated → does NOT file (ADR-0189: a filed record cannot be undone, and in `production` the
//               sample would burn the Anexo I), and probes the cell's `/readyz` instead. `aeat`
//               stays null and `details` carries `route` + `gateway`.
//
// This file pins the SCREEN's half of that: the road decides what the card offers and what it says.
// Before it, the module deliberately switched the live test OFF on the delegated road and explained
// that «the live test needs a certificate of your own» — true against the old engine, and exactly
// the sentence hub#1485 exists to delete.
//
// The component is imported STATICALLY on purpose (verifactu#31): a dynamic import inside a test
// charges the whole OutfitKit/SDK transform to that test's 5 s budget.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-settings';
import { HUB_SESSION_KEY } from '../../lib/gateway-identity';
import enLocale from '../../../locales/en.json';
import esLocale from '../../../locales/es.json';

const originalFetch = globalThis.fetch;

/** A cell identity that is installed and nowhere near expiry, i.e. a hub that CAN reach the cell. */
type ShellT = (catalog: unknown, key: string, params?: Record<string, unknown>) => string;

/** The shell's `t`, minus the wording: returns the key, so a test names a KEY and never prose. */
const keyEcho: ShellT = (_catalog, key) => key;

const ENROLLED = { has_key: true, has_certificate: true, common_name: 'hub-h1.fiscal.erplora.internal', not_after: '2099-01-01' };

/**
 * Mounts the screen with the road the core reports and the last diagnostic the engine wrote.
 * `identity` is what `/api/business/gateway-identity` answers — `absent` here is a hub that has
 * not enrolled yet.
 */
async function mountWith(
  { route, details, identity = ENROLLED, locale = 'es', t = keyEcho }:
  { route: string; details?: Record<string, unknown>; identity?: unknown; locale?: string; t?: ShellT },
) {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'verifactu.config.get') return [{ issuer_nif: 'B12345678', environment: 'testing', has_certificate: 1 }];
      if (name === 'hub.fiscal.transmission') return [{ transmission_route: route }];
      if (name === 'verifactu.diagnostics.last') return details ? [{ details: JSON.stringify(details) }] : [];
      return [];
    },
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale,
    // By default the shell's `t` minus the wording: returns the key, so a test names a KEY and
    // never prose (ADR-0055). Which sentence each key carries is pinned by the catalogue parity
    // test — and rendered for real, in both languages, by the last block of this file.
    t,
  };
  globalThis.fetch = (async (path: string) => (path === '/api/business/gateway-identity'
    ? new Response(JSON.stringify(identity), { status: 200 })
    : new Response('{}', { status: 200 }))) as unknown as typeof fetch;

  const el = document.createElement('erp-verifactu-settings') as HTMLElement & { shadowRoot: ShadowRoot };
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el;
}

/** The «Run test» button — found by the label key, so a reordered card cannot silently match another. */
function testButton(el: HTMLElement & { shadowRoot: ShadowRoot }) {
  return [...el.shadowRoot.querySelectorAll('ion-button')]
    .find((b) => (b.textContent ?? '').includes('ui.testRun')) as HTMLElement | undefined;
}

/**
 * What the TEST card renders, attributes included — and nothing else on the screen.
 *
 * Two traps this closes. `ok-inline-feedback` takes its heading as an ATTRIBUTE, so reading
 * `textContent` would miss every heading and make «the card does not say X» pass for free. And the
 * road block (`renderRoute`) already prints `ui.routeOwn`/`ui.routeDelegated` in its own card at the
 * top: asserting against the whole shadow root would let the test card say nothing about the road
 * and still pass.
 */
function cardText(el: HTMLElement & { shadowRoot: ShadowRoot }) {
  const card = [...el.shadowRoot.querySelectorAll('.card')]
    .find((c) => c.innerHTML.includes('ui.testTitle'));
  if (!card) throw new Error('the live-test card is not on the screen');
  return card.innerHTML;
}

beforeEach(() => {
  document.body.replaceChildren();
  globalThis.localStorage?.setItem(HUB_SESSION_KEY, 'sess-abc');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('the live test follows the ROAD, not the certificate (hub#1485)', () => {
  it('is offered to a hub that files through the cell', async () => {
    const el = await mountWith({ route: 'delegated' });

    const button = testButton(el);
    expect(button, 'the run-test button is not on the card').toBeTruthy();
    expect(button!.hasAttribute('disabled'), 'the cell road may run the test since hub#1485').toBe(false);
  });

  it('is still offered on the own road', async () => {
    const el = await mountWith({ route: 'own' });
    expect(testButton(el)!.hasAttribute('disabled')).toBe(false);
  });

  // The one road where the button has nothing to reach: no certificate of its own AND no identity
  // the cell would accept. It is sent to the enrolment section above rather than to a `.p12`.
  it('is withheld from a hub with no road at all, and says which one to open', async () => {
    const el = await mountWith({ route: 'delegated', identity: { has_key: false, has_certificate: false } });

    expect(testButton(el)!.hasAttribute('disabled')).toBe(true);
    expect(cardText(el)).toContain('ui.testNeedsGatewayIdentity');
    expect(cardText(el), 'a hub with no .p12 must not be sent to renew one').not.toContain('ui.testNeedsOwnCertificate');
  });
});

describe('the result names the road it took (hub#1485)', () => {
  const DELEGATED_OK = {
    cert_ok: true,
    cert_message: 'Pasarela fiscal disponible: ERPlora presenta por ti.',
    route: 'delegated',
    environment: 'testing',
    huella: 'ABC123',
    aeat: null,
    gateway: { ok: true, status: 'ready', reason: '', transmission_enabled: true, holder_nif: 'B12345678' },
  };

  it('does not blame a certificate for a sample the cell road never files', async () => {
    const el = await mountWith({ route: 'delegated', details: DELEGATED_OK });

    const text = cardText(el);
    // `ui.testAeatNotSent` reads «Send not attempted (check the certificate)». On this road NOT
    // sending is the correct outcome, so pointing at a certificate is the hub#1485 defect again.
    // Matched with a boundary, never as a substring: `ui.testAeatNotSentDelegated` — the key that
    // is SUPPOSED to be here — contains the other one whole, so a plain `toContain` could never
    // fail and the guard would be decorative.
    expect(text, 'the delegated road never files a sample: that is by design, not a fault')
      .not.toMatch(/ui\.testAeatNotSent(?![A-Za-z])/);
    expect(text).toContain('ui.testAeatNotSentDelegated');
  });

  it('paints the road and the readiness of the cell', async () => {
    const el = await mountWith({ route: 'delegated', details: DELEGATED_OK });

    const text = cardText(el);
    expect(text, 'the card must say WHICH road answered').toContain('ui.testRoute');
    expect(text).toContain('ui.routeDelegated');
    expect(text, 'the cell answered ready, and the card has to show it').toContain('ui.testGatewayReady');
  });

  it('shows the reason the cell gave when it cannot file', async () => {
    const el = await mountWith({
      route: 'delegated',
      details: { ...DELEGATED_OK, cert_ok: false, gateway: { ok: false, status: 'degraded', reason: 'seal_unavailable', transmission_enabled: false, holder_nif: '' } },
    });

    const text = cardText(el);
    expect(text).toContain('ui.testGatewayNotReady');
    expect(text, 'the reason the cell gave is the only actionable thing here').toContain('seal_unavailable');
  });

  it('leaves the own road exactly as it was: it files, and the AEAT answers', async () => {
    const el = await mountWith({
      route: 'own',
      details: { cert_ok: true, cert_message: 'ok', route: 'own', environment: 'testing', aeat: { ok: true, estado_registro: 'Correcto', csv: 'CSV-1' }, gateway: null },
    });

    const text = cardText(el);
    expect(text).toContain('ui.testAeatAccepted');
    expect(text, 'there is no cell on this road').not.toContain('ui.testGatewayReady');
    expect(text).toContain('ui.routeOwn');
  });
});

// ── hub#1575: the reason the test failed, in the reader's language ───────────────────────────
//
// The events list was not the only surface printing the engine's Spanish: the Settings card paints
// the same reason in its own box, straight out of `details.cert_message`. A business running
// ERPlora in English pressed «Run test» and read «faltan los hechos del productor…» inside an
// otherwise English screen — the half of the answer that says what to fix.
//
// The engine now files `details.cert_reason` = `{code, …facts}` (hub#1575) and keeps the prose as
// the fallback. Both surfaces compose through the SAME `certReasonSentence`, so the events list and
// this card cannot say different things about one run.
describe('the certificate box says WHY in the reader language (hub#1575)', () => {
  /** The engine's Spanish, the exact substring that must stop reaching the box. */
  const ENGINE_PROSE = 'faltan los hechos del productor';

  const NO_PRODUCER_FACTS = {
    cert_ok: false,
    cert_message: `payload inválido: ${ENGINE_PROSE} (\`SistemaInformatico\`)`,
    cert_reason: { code: 'producer_facts_missing', error: `payload inválido: ${ENGINE_PROSE}` },
    route: 'delegated',
    environment: 'testing',
    aeat: null,
    gateway: null,
  };

  it('composes the reason from the code instead of pasting the engine prose', async () => {
    const el = await mountWith({ route: 'delegated', details: NO_PRODUCER_FACTS });

    // The harness `t` answers with the KEY, so this names a key and never prose (ADR-0055).
    expect(cardText(el)).toContain('ui.evt.reason.producer_facts_missing');
    expect(cardText(el), 'the engine Spanish is still on the screen').not.toContain(ENGINE_PROSE);
  });

  // 🔒 The fallback: a hub whose engine predates hub#1575 files no code at all, and the box has to
  // keep the prose rather than lose the half that says what to fix. This is what makes the merge
  // order safe in BOTH directions.
  it('keeps the engine prose when the hub sends no code', async () => {
    const { cert_reason: _dropped, ...older } = NO_PRODUCER_FACTS;

    const el = await mountWith({ route: 'delegated', details: older });

    expect(cardText(el)).toContain(ENGINE_PROSE);
  });

  // …and so does a code this catalogue has never heard of — a hub ahead of this module.
  it('keeps the engine prose for a code it does not know', async () => {
    const el = await mountWith({
      route: 'delegated',
      details: { ...NO_PRODUCER_FACTS, cert_reason: { code: 'a_reason_from_the_future' } },
    });

    expect(cardText(el)).toContain(ENGINE_PROSE);
    expect(cardText(el)).not.toContain('ui.evt.reason.a_reason_from_the_future');
  });
});

// ── verifactu#95: the CONSTANT verdicts of the certificate box ───────────────────────────────
//
// hub#1575 translated the reason the test FAILED for, and it did it for the verdicts whose reason
// is variable. The three CONSTANT sentences stayed behind: on a good run the box reads «Certificado
// cargado correctamente.» or «Pasarela fiscal disponible: ERPlora presenta por ti.», and with no
// issuer tax ID it reads «Configura el NIF del obligado tributario (emisor)…» — Spanish inside an
// otherwise English screen, on the two runs a business sees most often.
//
// Same channel, one field further: the engine files them as `cert_reason` codes too and the box
// composes them like any other, so «it went well» is not the one sentence left untranslated.
describe('the certificate box says the CONSTANT verdicts in the reader language (verifactu#95)', () => {
  const CASES = [
    { code: 'certificate_loaded', road: 'own', certOk: true, prose: 'Certificado cargado' },
    { code: 'gateway_ready', road: 'delegated', certOk: true, prose: 'Pasarela fiscal disponible' },
    { code: 'issuer_nif_missing', road: 'delegated', certOk: false, prose: 'Configura el NIF del obligado' },
  ];

  function details({ code, road, certOk, prose }: (typeof CASES)[number]) {
    return {
      cert_ok: certOk,
      cert_message: `${prose} …`,
      cert_reason: { code },
      route: road,
      environment: 'testing',
      aeat: null,
      gateway: null,
    };
  }

  it.each(CASES)('composes $code from the code instead of pasting the engine prose', async (c) => {
    const el = await mountWith({ route: c.road, details: details(c) });

    // The harness `t` answers with the KEY, so this names a key and never prose (ADR-0055).
    expect(cardText(el)).toContain(`ui.evt.reason.${c.code}`);
    expect(cardText(el), 'the engine Spanish is still on the screen').not.toContain(c.prose);
  });

  // 🔒 The fallback that makes the merge order safe in BOTH directions, on these three too: an
  // engine older than this change files no code, and the box keeps the sentence it always had.
  it.each(CASES)('keeps the engine prose for $code when the hub sends no code', async (c) => {
    const { cert_reason: _dropped, ...older } = details(c);

    const el = await mountWith({ route: c.road, details: older });

    expect(cardText(el)).toContain(c.prose);
  });
});

// ── hub#1578: the AEAT box, on the OWN road ──────────────────────────────────────────────────
//
// hub#1575 and verifactu#95 fixed the CERTIFICATE box. On the own road that box is green — the
// `.p12` does load — and the failure lands one box lower, in «AEAT»: the sample record cannot be
// built or does not pass the schema, and `aeat.error` carries the engine's Spanish straight to the
// screen. An English hub read «payload inválido: faltan los hechos del productor…» in red, in the
// one box that says what to fix.
//
// Same channel, same shape: the engine files `aeat.reason` = `{code, …facts}` beside the prose, and
// the box composes it through the SAME resolver the certificate box uses. What the AEAT itself
// says (`codigo_error`/`descripcion_error`) is NOT this: Hacienda writes it, and it stays as it is.
describe('the AEAT box says WHY in the reader language (hub#1578)', () => {
  /** The engine's Spanish, the exact substring that must stop reaching the box. */
  const ENGINE_PROSE = 'faltan los hechos del productor';

  const OWN_SAMPLE_REFUSED = {
    cert_ok: true,
    cert_message: 'Certificado cargado correctamente.',
    cert_reason: { code: 'certificate_loaded' },
    route: 'own',
    environment: 'testing',
    aeat: {
      ok: false,
      error: `payload inválido: ${ENGINE_PROSE} (\`SistemaInformatico\`)`,
      reason: { code: 'producer_facts_missing', error: `payload inválido: ${ENGINE_PROSE}` },
    },
    gateway: null,
  };

  it('composes the reason from the code instead of pasting the engine prose', async () => {
    const el = await mountWith({ route: 'own', details: OWN_SAMPLE_REFUSED });

    const text = cardText(el);
    // The harness `t` answers with the KEY, so this names a key and never prose (ADR-0055).
    expect(text, 'the AEAT box still has to be the error box').toContain('ui.testAeatError');
    expect(text).toContain('ui.evt.reason.producer_facts_missing');
    expect(text, 'the engine Spanish is still on the screen').not.toContain(ENGINE_PROSE);
  });

  // The other half of the own road: the tax ID this hub never filled in. It is the same code the
  // delegated road already files for it (`issuer_nif_missing`), because for whoever reads it, it is
  // the same field to fill — the road it happened on does not change the sentence.
  it('composes the missing issuer tax ID with the code the other road already uses', async () => {
    const el = await mountWith({
      route: 'own',
      details: {
        ...OWN_SAMPLE_REFUSED,
        aeat: {
          ok: false,
          error: 'Configura el NIF del obligado tributario (emisor) antes de enviar la prueba.',
          reason: { code: 'issuer_nif_missing' },
        },
      },
    });

    const text = cardText(el);
    expect(text).toContain('ui.evt.reason.issuer_nif_missing');
    expect(text, 'the engine Spanish is still on the screen').not.toContain('Configura el NIF del obligado');
  });

  // 🔒 The fallback, both directions of the merge order. An engine older than hub#1578 files no
  // `reason` at all, and the box has to keep the prose rather than go blank in the one place that
  // says what to fix.
  it('keeps the engine prose when the hub sends no code', async () => {
    const { reason: _dropped, ...olderAeat } = OWN_SAMPLE_REFUSED.aeat;

    const el = await mountWith({ route: 'own', details: { ...OWN_SAMPLE_REFUSED, aeat: olderAeat } });

    expect(cardText(el)).toContain(ENGINE_PROSE);
  });

  // …and so does a code this catalogue has never heard of — a hub ahead of this module.
  it('keeps the engine prose for a code it does not know', async () => {
    const el = await mountWith({
      route: 'own',
      details: {
        ...OWN_SAMPLE_REFUSED,
        aeat: { ...OWN_SAMPLE_REFUSED.aeat, reason: { code: 'a_reason_from_the_future' } },
      },
    });

    const text = cardText(el);
    expect(text).toContain(ENGINE_PROSE);
    expect(text).not.toContain('ui.evt.reason.a_reason_from_the_future');
  });

  // 🔒 What the AEAT answers is NOT ours to translate: Hacienda writes `codigo_error` and
  // `descripcion_error` in Spanish by law, and a rejection whose code the support desk quotes must
  // arrive verbatim. This pins that the new branch did not swallow the answer path.
  it('leaves the AEAT own rejection exactly as Hacienda wrote it', async () => {
    const el = await mountWith({
      route: 'own',
      details: {
        ...OWN_SAMPLE_REFUSED,
        aeat: { ok: false, estado_registro: 'Incorrecto', codigo_error: '1189', descripcion_error: 'Falta el bloque Destinatarios' },
      },
    });

    const text = cardText(el);
    expect(text).toContain('1189');
    expect(text).toContain('Falta el bloque Destinatarios');
  });
});

// ── The whole card, mounted with the REAL catalogue in each language ─────────────────────────
//
// Every block above hands the screen a `t` that answers with the KEY. That is what lets a test
// name a key and never prose (ADR-0055) — and it also means none of them ever renders a translated
// sentence, so a screen that pasted the engine's Spanish after all, or looked the catalogue up in
// the wrong place, would pass them as long as the key existed. This block closes that gap the way
// the resolver's own tests do (`event-message.test.ts`): the SAME run, mounted in `en` and in
// `es` with the real dictionaries, has to speak each language from the catalogue, and the English
// card has to carry none of the engine's Spanish while still naming the element to fix.

const REAL_CATALOG: Record<string, unknown> = { en: enLocale, es: esLocale };

/** `t` as the shell implements it, wording included: what a reader of `lang` actually sees. */
function realT(lang: 'en' | 'es'): ShellT {
  return (_catalog, key, params) => {
    let cur: unknown = REAL_CATALOG[lang];
    for (const part of key.split('.')) {
      cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[part] : undefined;
    }
    let out = typeof cur === 'string' ? cur : key;
    for (const [k, v] of Object.entries(params ?? {})) {
      out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
    return out;
  };
}

/** The live-test card once the titles are translated: found by the title of `lang`, not by its key. */
function translatedCardText(el: HTMLElement & { shadowRoot: ShadowRoot }, lang: 'en' | 'es') {
  const title = (REAL_CATALOG[lang] as { ui: { testTitle: string } }).ui.testTitle;
  const card = [...el.shadowRoot.querySelectorAll('.card')].find((c) => c.innerHTML.includes(title));
  if (!card) throw new Error(`the live-test card is not on the screen in ${lang}`);
  return card.innerHTML;
}

describe('the boxes speak the reader language from the catalogue, mounted for real (verifactu#95 · hub#1578 · hub#1576)', () => {
  /** The validator's Spanish, verbatim, and the wrapper the engine puts around it. */
  const VALIDATOR_PROSE = 'DescripcionOperacion es obligatorio y viene vacío';
  const ENGINE_WRAPPER = 'XML no conforme al esquema';

  /**
   * One own-road run as the engine on hub#1576 files it: the `.p12` loads (a CONSTANT verdict,
   * verifactu#95), and the sample record fails the schema in the AEAT box (hub#1578) for a reason
   * that nests one level further down (hub#1576). Every box carries its code beside the prose.
   */
  const OWN_RUN = {
    cert_ok: true,
    cert_message: 'Certificado cargado correctamente.',
    cert_reason: { code: 'certificate_loaded' },
    route: 'own',
    environment: 'testing',
    aeat: {
      ok: false,
      error: `${ENGINE_WRAPPER}: payload inválido: ${VALIDATOR_PROSE}`,
      reason: {
        code: 'sample_record_schema_invalid',
        detail: `payload inválido: ${VALIDATOR_PROSE}`,
        detail_reason: { code: 'schema_element_empty', element: 'DescripcionOperacion' },
      },
    },
    gateway: null,
  };

  it('in en, every box reads English and still names the element to fix', async () => {
    const el = await mountWith({ route: 'own', details: OWN_RUN, locale: 'en', t: realT('en') });

    const text = translatedCardText(el, 'en');
    expect(text).toContain('the certificate loaded correctly');
    expect(text).toContain(
      'the AEAT schema refused the test record: DescripcionOperacion is required and came in empty',
    );
    expect(text, 'the engine Spanish reached an English screen').not.toContain('Certificado cargado');
    expect(text, 'the validator Spanish reached an English screen').not.toContain(VALIDATOR_PROSE);
    expect(text, 'the engine wrapper reached an English screen').not.toContain(ENGINE_WRAPPER);
    expect(text, 'a placeholder survived').not.toMatch(/\{[a-z_]+\}/);
    expect(text).not.toContain('[object Object]');
  });

  // The positive the English card cannot prove on its own: Spanish is legitimate here, so what is
  // pinned is WHOSE Spanish — the catalogue's sentences, never the engine's wording.
  it('in es, every box reads the catalogue Spanish, not the engine wording', async () => {
    const el = await mountWith({ route: 'own', details: OWN_RUN, locale: 'es', t: realT('es') });

    const text = translatedCardText(el, 'es');
    expect(text).toContain('el certificado se ha cargado correctamente');
    expect(text).toContain(
      'el esquema de la AEAT ha rechazado el registro de prueba: DescripcionOperacion es obligatorio y viene vacío',
    );
    expect(text, 'the engine wording was pasted instead of composed').not.toContain('Certificado cargado correctamente.');
    expect(text, 'the engine wrapper was pasted instead of composed').not.toContain(ENGINE_WRAPPER);
    expect(text, 'a placeholder survived').not.toMatch(/\{[a-z_]+\}/);
  });
});
