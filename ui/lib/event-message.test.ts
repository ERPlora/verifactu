// The audit screen says WHAT HAPPENED in the reader's language (verifactu#63).
//
// ADR-0055: the assertions below are about KEYS and CODES, never about the sentence. That is the
// whole point of the change — the engine's `message` is Spanish prose baked into
// `hub/crates/plugins/verifactu/src/*.rs`, and a test that pinned the wording would just move the
// hardcoded Spanish from the screen into the suite.

import { describe, expect, it } from 'vitest';
import enLocale from '../../locales/en.json';
import esLocale from '../../locales/es.json';
import {
  ENGINE_CERT_REASON_CODES,
  ENGINE_MESSAGE_KEYS,
  ENGINE_SCHEMA_REASON_CODES,
  ENGINE_WAIT_REASON_CODES,
  EVENT_CATALOG_PREFIX,
  EVENT_REASON_PREFIX,
  catalogKeyFor,
  certReasonSentence,
  eventMessage,
  reasonSentence,
  type Translate,
} from './event-message';

const CATALOG: Record<string, unknown> = { en: enLocale, es: esLocale };

/** `t` as the shell implements it, minus the wording: returns the key, so a test can name it. */
const keyEcho: Translate = (_catalog, key) => key;

/** `t` as the shell implements it, wording included: what the reader of `lang` actually sees. */
function interpolatingIn(lang: 'en' | 'es'): Translate {
  return (catalog, key, params) => {
    let cur: unknown = catalog[lang];
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

/** Records every call, to assert WHICH key was asked for and with which params. */
function spy() {
  const calls: Array<{ key: string; params?: Record<string, unknown> }> = [];
  const t: Translate = (_catalog, key, params) => {
    calls.push({ key, params });
    return key;
  };
  return { calls, t };
}

/** The engine's own prose, verbatim from `records.rs` — the thing that must STOP reaching the UI. */
const ENGINE_PROSE = 'Registro alta #27 de F-2026-1 creado';

function row(details: unknown, message = ENGINE_PROSE) {
  return { message, details };
}

const RECORD_CREATED = JSON.stringify({
  message_key: 'verifactu.record_created',
  record_type: 'alta',
  invoice_number: 'F-2026-1',
  sequence_number: 27,
  record_hash: 'a'.repeat(64),
  is_first_record: false,
});

/** What the engine files when the cell road stops on a field the business never filled (hub#1531). */
const DIAGNOSTIC_ISSUER_NIF_MISSING = JSON.stringify({
  message_key: 'verifactu.diagnostic_issuer_nif_missing',
  cert_ok: false,
  cert_message: 'Configura el NIF del obligado tributario (emisor) antes de probar la conexión.',
  route: 'delegated',
  issuer_nif: '',
  environment: 'testing',
});

/** The verdict hub#1485 added for a cell that answered and cannot transmit. */
const DIAGNOSTIC_GATEWAY_UNAVAILABLE = JSON.stringify({
  message_key: 'verifactu.diagnostic_gateway_unavailable',
  cert_ok: false,
  cert_message: 'No se pudo contactar con la pasarela fiscal: conexión rechazada.',
  route: 'delegated',
  issuer_nif: 'B12345678',
  environment: 'testing',
});

describe('the verdicts of the cell road are in the catalogue too (hub#1531)', () => {
  // 🔴 RED: the engine has been filing these two keys since hub#1485/hub#1531 and the catalogue
  // never learned them, so `eventMessage` falls back to `row.message` — the engine's Spanish prose
  // in front of every reader, which is the exact defect verifactu#63 exists to close.
  it.each([
    ['verifactu.diagnostic_issuer_nif_missing', DIAGNOSTIC_ISSUER_NIF_MISSING],
    ['verifactu.diagnostic_gateway_unavailable', DIAGNOSTIC_GATEWAY_UNAVAILABLE],
  ])('composes %s from the catalogue instead of repeating the engine prose', (messageKey, details) => {
    const engineProse = 'Prueba VeriFactu: la pasarela fiscal no está disponible';
    const short = messageKey.slice('verifactu.'.length);
    for (const lang of ['en', 'es'] as const) {
      const composed = eventMessage(CATALOG, lang, keyEcho, row(details, engineProse));
      expect(composed, `${lang} falls back to the engine prose`).not.toBe(engineProse);
      expect(composed).toBe(`${EVENT_CATALOG_PREFIX}${short}`);
    }
  });

  // And the `es` is a TRANSLATION, not the English string copied across: a catalogue that carries
  // the same bytes in both languages passes every key-shaped assertion and still ships English to
  // a Spanish user.
  it.each([
    'verifactu.diagnostic_issuer_nif_missing',
    'verifactu.diagnostic_gateway_unavailable',
  ])('ships %s in both languages, and they are not the same sentence', (messageKey) => {
    const short = messageKey.slice('verifactu.'.length);
    const en = (enLocale as any).ui.evt[short];
    const es = (esLocale as any).ui.evt[short];
    expect(en, `en is missing ui.evt.${short}`).toBeTruthy();
    expect(es, `es is missing ui.evt.${short}`).toBeTruthy();
    expect(es).not.toBe(en);
  });
});

describe('the sentence comes from the catalog, not from the engine', () => {
  it('composes a known key instead of repeating the Spanish the engine wrote', () => {
    const composed = eventMessage(CATALOG, 'en', keyEcho, row(RECORD_CREATED));
    // The failure this test exists for: the screen printing `message` straight through.
    expect(composed).not.toBe(ENGINE_PROSE);
    expect(composed).toBe(`${EVENT_CATALOG_PREFIX}record_created`);
  });

  it('hands the catalog the params the sentence interpolates', () => {
    const { calls, t } = spy();
    eventMessage(CATALOG, 'en', t, row(RECORD_CREATED));
    const composition = calls.find((c) => c.key === `${EVENT_CATALOG_PREFIX}record_created`);
    expect(composition).toBeDefined();
    expect(composition?.params).toMatchObject({ invoice_number: 'F-2026-1', sequence_number: 27 });
  });

  it('translates the enum params instead of interpolating the engine\'s raw codes', () => {
    // `record_type` arrives as `alta`/`anulacion` and `environment` as `testing`/`production`:
    // Spanish and English words the engine picked. Dropping them into a sentence unchanged is the
    // same defect one level down, so they are resolved through the catalog labels that already
    // exist for the Records table.
    const { calls, t } = spy();
    eventMessage(CATALOG, 'en', t, row(RECORD_CREATED));
    expect(calls.map((c) => c.key)).toContain('ui.recTypeAlta');
    const composition = calls.find((c) => c.key === `${EVENT_CATALOG_PREFIX}record_created`);
    expect(composition?.params?.record_type).toBe('ui.recTypeAlta');
  });

  it('resolves `environment` through the catalog too', () => {
    const { calls, t } = spy();
    const retry = JSON.stringify({
      message_key: 'verifactu.transmission_retry',
      environment: 'production',
      backoff_minutes: 5,
      error: 'timeout',
      attempts: 2,
    });
    eventMessage(CATALOG, 'en', t, row(retry, 'Fallo de transmisión AEAT'));
    const composition = calls.find((c) => c.key === `${EVENT_CATALOG_PREFIX}transmission_retry`);
    expect(composition?.params?.environment).toBe('ui.envProduction');
  });

  it('drops the params the engine sent as null instead of printing «null»', () => {
    // `csv`, `codigo_error`, `descripcion_error` and `note` are null whenever the AEAT accepts a
    // record. `t()` interpolates whatever it is handed, so passing them through would put the word
    // «null» inside a fiscal audit line.
    const { calls, t } = spy();
    const verdict = JSON.stringify({
      message_key: 'verifactu.aeat_verdict',
      environment: 'testing',
      estado_envio: 'Correcto',
      estado_registro: 'Aceptado',
      csv: null,
      codigo_error: null,
      descripcion_error: null,
      note: null,
    });
    eventMessage(CATALOG, 'en', t, row(verdict, 'AEAT (testing): Correcto Aceptado'));
    const composition = calls.find((c) => c.key === `${EVENT_CATALOG_PREFIX}aeat_verdict`);
    expect(Object.keys(composition!.params!).sort()).toEqual([
      'environment',
      'estado_envio',
      'estado_registro',
      'message_key',
    ]);
  });

  it('reads `details` when the row carries it already parsed', () => {
    const composed = eventMessage(CATALOG, 'en', keyEcho, row(JSON.parse(RECORD_CREATED)));
    expect(composed).toBe(`${EVENT_CATALOG_PREFIX}record_created`);
  });
});

describe('an unknown key keeps the sentence that came with the row', () => {
  // Never invent a sentence for a key the catalog does not know: the prose the engine shipped says
  // more than «unknown event» ever could. A hub on an older module version, or a key added to the
  // engine before this catalog catches up, both land here.
  it('falls back to `message` for a key outside the catalog', () => {
    const unknown = JSON.stringify({ message_key: 'verifactu.brand_new_thing', a: 1 });
    expect(eventMessage(CATALOG, 'en', keyEcho, row(unknown))).toBe(ENGINE_PROSE);
  });

  it('refuses a key from outside the `verifactu.` namespace', () => {
    // `details` is data from a row; a key that walks anywhere in the catalog is not a key.
    const foreign = JSON.stringify({ message_key: 'navigation.records.label' });
    expect(eventMessage(CATALOG, 'en', keyEcho, row(foreign))).toBe(ENGINE_PROSE);
  });

  it.each([
    ['no details at all', undefined],
    ['an empty string', ''],
    ['the default empty object', '{}'],
    ['something that is not JSON', 'not json at all'],
    ['JSON that is not an object', '[1,2,3]'],
    ['a details without message_key', '{"scope":"chain"}'],
    ['a message_key that is not a string', '{"message_key":42}'],
  ])('falls back to `message` with %s', (_label, details) => {
    expect(eventMessage(CATALOG, 'en', keyEcho, row(details))).toBe(ENGINE_PROSE);
  });
});

describe('catalogue parity — every key the engine emits, in both languages (ADR-0055)', () => {
  // The mechanical guard: a key added to `en` and forgotten in `es` shows an English sentence to a
  // Spanish user, which is the defect this issue exists to remove. It cannot be caught by review.
  it('inspects the whole engine surface', () => {
    // Guards the guard: an emptied constant would make every loop below pass vacuously.
    expect(ENGINE_MESSAGE_KEYS.length).toBe(18);
  });

  // verifactu#111 — a record that did not leave with its sale files WHY it waits. Without the key
  // here the Records detail cannot say it in the reader's language, and the Events screen shows the
  // engine's Spanish.
  it('knows the audit row of a record that waits for the drain (verifactu#111)', () => {
    expect(ENGINE_MESSAGE_KEYS).toContain('verifactu.transmission_deferred');
  });

  // hub#1485 — the THIRD verdict `run_diagnostics` can reach. On the delegated road a failed test
  // is not a certificate the business could renew (it has none, and never will): it is the fiscal
  // cell being unable to file right now. Rendering that as `diagnostic_certificate_invalid` is the
  // very defect hub#1485 exists to remove, so the key has to land here before the screen can tell
  // the two apart.
  it('knows the delegated verdict, which is NOT a broken certificate (hub#1485)', () => {
    expect(ENGINE_MESSAGE_KEYS).toContain('verifactu.diagnostic_gateway_unavailable');
  });

  // hub#1559 — the FIFTH verdict, and the one that keeps the delegated road honest one box past
  // hub#1531: the obligado NIF is filled in and the test record still does not come out. Without a
  // key of its own the screen reads `diagnostic_gateway_unavailable` and sends the business to
  // watch a status page instead of looking at its own configuration.
  it('tells a test record that is not valid apart from a gateway that cannot file (hub#1559)', () => {
    expect(ENGINE_MESSAGE_KEYS).toContain('verifactu.diagnostic_sample_record_invalid');
  });

  it.each(ENGINE_MESSAGE_KEYS)('%s resolves in en and es', (messageKey) => {
    const key = catalogKeyFor(messageKey);
    expect(key).not.toBeNull();
    for (const lang of ['en', 'es'] as const) {
      const dict = CATALOG[lang] as Record<string, Record<string, string>>;
      const entry = dict.ui?.evt?.[key!.slice(EVENT_CATALOG_PREFIX.length)];
      expect(typeof entry, `${lang} is missing ${key}`).toBe('string');
      expect(entry!.length).toBeGreaterThan(0);
    }
  });

  // Review of hub#1559 — being present in both dictionaries is not being translated. An `es` entry
  // pasted from `en` passes every check above and still puts English in front of a Spanish reader:
  // the ADR-0055 defect wearing a Spanish key. Every sentence here is a full clause in both
  // languages, so byte-for-byte identity is the one shape a real translation can never take.
  it.each(ENGINE_MESSAGE_KEYS)('%s is translated into es, not copied from en', (messageKey) => {
    const short = catalogKeyFor(messageKey)!.slice(EVENT_CATALOG_PREFIX.length);
    type Evt = Record<string, Record<string, Record<string, string>>>;
    const en = (CATALOG.en as Evt).ui.evt[short];
    const es = (CATALOG.es as Evt).ui.evt[short];
    expect(es, `es copies en for ${short}`).not.toBe(en);
  });

  it('builds every sentence out of params the engine ALWAYS sends', () => {
    // Two ways a placeholder betrays the reader, and this pins both:
    //   - `{param}` the engine never sends is printed raw, braces and all;
    //   - `{param}` the engine sends as `null` on the happy path is dropped by `localizedParams`,
    //     so it ALSO gets printed raw.
    // Hence the lists below are the ALWAYS-PRESENT subset of each payload, not the whole payload.
    // Read off `hub/crates/plugins/verifactu/src/` at origin/develop@dcdab14.
    const alwaysSent: Record<string, string[]> = {
      'verifactu.record_created': ['record_type', 'invoice_number', 'sequence_number', 'record_hash', 'is_first_record'],
      'verifactu.invoice_type_downgraded': ['invoice_number', 'declared', 'effective', 'reason', 'sequence_number'],
      'verifactu.xsd_invalid': ['validation_error'],
      'verifactu.transmission_retry': ['environment', 'backoff_minutes', 'error', 'attempts'],
      'verifactu.not_transmitted': ['reason', 'error', 'attempts'],
      // csv / codigo_error / descripcion_error / note are null whenever the AEAT accepts.
      'verifactu.aeat_verdict': ['environment', 'estado_envio', 'estado_registro'],
      'verifactu.contingency_processed': ['successful', 'failed'],
      'verifactu.diagnostic_ran': ['environment', 'cert_ok', 'issuer_nif', 'invoice_type', 'sample_number'],
      'verifactu.diagnostic_certificate_invalid': ['environment', 'cert_ok', 'cert_message', 'issuer_nif'],
      'verifactu.diagnostic_gateway_unavailable': ['environment', 'cert_ok', 'cert_message', 'issuer_nif', 'route'],
      'verifactu.diagnostic_issuer_nif_missing': ['environment', 'cert_ok', 'cert_message', 'issuer_nif', 'route'],
      'verifactu.diagnostic_sample_record_invalid': ['environment', 'cert_ok', 'cert_message', 'issuer_nif', 'route'],
      'verifactu.chain_validated': ['valid', 'total', 'issuer_nif', 'environment', 'scope'],
      // first_invalid_seq / first_invalid_id are null on a chain that validates.
      'verifactu.chain_broken': ['valid', 'total', 'issuer_nif', 'environment', 'scope', 'first_invalid_seq'],
      'verifactu.aeat_queried': ['count', 'issuer_nif'],
      'verifactu.chain_recovered_from_aeat': ['source', 'issuer_nif', 'record_hash', 'sequence_number', 'found'],
      'verifactu.chain_continued_manually': ['source', 'issuer_nif', 'record_hash', 'sequence_number'],
      // `why` is the engine's prose; the module overrides it with `why_reason` composed here.
      'verifactu.transmission_deferred': ['why'],
    };
    expect(Object.keys(alwaysSent).sort()).toEqual([...ENGINE_MESSAGE_KEYS].sort());

    let placeholdersChecked = 0;
    for (const messageKey of ENGINE_MESSAGE_KEYS) {
      const short = catalogKeyFor(messageKey)!.slice(EVENT_CATALOG_PREFIX.length);
      for (const lang of ['en', 'es'] as const) {
        const dict = CATALOG[lang] as Record<string, Record<string, Record<string, string>>>;
        const sentence = dict.ui.evt[short];
        for (const [, placeholder] of sentence.matchAll(/\{([a-z_]+)\}/g)) {
          placeholdersChecked += 1;
          expect(
            alwaysSent[messageKey],
            `${lang} ${short}: {${placeholder}} is not always sent`,
          ).toContain(placeholder);
        }
      }
    }
    // Without this the loop would pass vacuously on a catalogue of sentences with no params at all.
    expect(placeholdersChecked).toBeGreaterThan(20);
  });
});

describe('the missing-NIF verdict stands on its own in each language (hub#1531)', () => {
  // `cert_message` is Spanish prose the engine writes, and on this verdict it is a constant that
  // says nothing the catalogue sentence does not. A sentence that leans on it switches language
  // halfway for an English reader — the ADR-0055 defect one placeholder further in.
  it.each(['en', 'es'] as const)('never repeats the engine\'s cert_message in %s', (lang) => {
    const details = JSON.parse(DIAGNOSTIC_ISSUER_NIF_MISSING) as { cert_message: string };
    const composed = eventMessage(
      CATALOG,
      lang,
      interpolatingIn(lang),
      row(DIAGNOSTIC_ISSUER_NIF_MISSING, 'Prueba VeriFactu: falta el NIF del obligado tributario'),
    );
    expect(composed).not.toContain(details.cert_message);
    expect(composed).not.toMatch(/\{[a-z_]+\}/);
  });
});

// ── hub#1575: the reason behind the dash, in the reader's language ───────────────────────────
//
// Three of the five diagnostic verdicts end in `— {cert_message}`, and `cert_message` is Spanish
// prose the engine wrote. A business running ERPlora in English read «…does not produce a valid
// test record — faltan los hechos del productor…»: half a sentence in a language it did not
// choose, and it is the half that says what to fix.
//
// The engine now files the reason as `details.cert_reason` = `{code, …facts}` and keeps the prose
// as the fallback, the same shape `message_key` has had since hub#1178.

/** What the engine files when the producer facts have not arrived (hub#1559 + hub#1575). */
const DIAGNOSTIC_SAMPLE_RECORD_INVALID = JSON.stringify({
  message_key: 'verifactu.diagnostic_sample_record_invalid',
  cert_ok: false,
  cert_message:
    'payload inválido: faltan los hechos del productor (`SistemaInformatico`): este hub todavía no los ha recibido del plano de control',
  cert_reason: {
    code: 'producer_facts_missing',
    error:
      'payload inválido: faltan los hechos del productor (`SistemaInformatico`): este hub todavía no los ha recibido del plano de control',
  },
  route: 'delegated',
  issuer_nif: 'B12345678',
  environment: 'testing',
});

/** The engine's Spanish, the exact substring that must stop reaching an English reader. */
const ENGINE_CERT_PROSE = 'faltan los hechos del productor';

describe('the reason behind the dash is composed too (hub#1575)', () => {
  it.each(['en', 'es'] as const)('leaves no engine prose inside the %s sentence', (lang) => {
    const composed = eventMessage(
      CATALOG,
      lang,
      interpolatingIn(lang),
      row(DIAGNOSTIC_SAMPLE_RECORD_INVALID, 'Prueba VeriFactu: el registro de prueba no es válido'),
    );

    if (lang === 'en') {
      expect(composed, 'the reason is still the engine Spanish').not.toContain(ENGINE_CERT_PROSE);
    }
    expect(composed, 'a placeholder survived').not.toMatch(/\{[a-z_]+\}/);
  });

  // The positive the check above cannot catch on its own: `es` legitimately contains Spanish, so
  // «no engine prose» proves nothing there. What proves it is that the two languages differ AND
  // that neither is the engine's own sentence.
  it('says it differently in each language, and in neither the engine words', () => {
    const en = eventMessage(CATALOG, 'en', interpolatingIn('en'), row(DIAGNOSTIC_SAMPLE_RECORD_INVALID));
    const es = eventMessage(CATALOG, 'es', interpolatingIn('es'), row(DIAGNOSTIC_SAMPLE_RECORD_INVALID));

    expect(es).not.toBe(en);
    expect(es).not.toContain(ENGINE_CERT_PROSE);
  });

  // 🔒 The fallback hub#1178 left, one field further in: a hub whose engine predates the code
  // sends no `cert_reason`, and the sentence has to keep the prose rather than lose the half that
  // says what to fix. This is what makes the merge order safe in BOTH directions.
  it('keeps the engine prose when the hub sends no code', () => {
    const details = JSON.parse(DIAGNOSTIC_SAMPLE_RECORD_INVALID) as Record<string, unknown>;
    delete details.cert_reason;

    const composed = eventMessage(
      CATALOG,
      'en',
      interpolatingIn('en'),
      row(JSON.stringify(details)),
    );

    expect(composed).toContain(ENGINE_CERT_PROSE);
    expect(composed).not.toMatch(/\{[a-z_]+\}/);
  });

  // …and so does a code this catalogue has never heard of — a hub ahead of this module.
  it('keeps the engine prose for a code it does not know', () => {
    const details = JSON.parse(DIAGNOSTIC_SAMPLE_RECORD_INVALID) as Record<string, unknown>;
    details.cert_reason = { code: 'a_reason_from_the_future' };

    const composed = eventMessage(
      CATALOG,
      'en',
      interpolatingIn('en'),
      row(JSON.stringify(details)),
    );

    expect(composed).toContain(ENGINE_CERT_PROSE);
  });

  // The Settings screen paints the same reason on its own, in the box it already had. Same
  // composer, so the two surfaces cannot say different things about one run.
  it('composes the reason on its own for the Settings box', () => {
    const details = JSON.parse(DIAGNOSTIC_SAMPLE_RECORD_INVALID) as Record<string, unknown>;

    const sentence = certReasonSentence(CATALOG, 'en', interpolatingIn('en'), details);

    expect(sentence).toBeTruthy();
    expect(sentence).not.toContain(ENGINE_CERT_PROSE);
    expect(certReasonSentence(CATALOG, 'en', interpolatingIn('en'), {})).toBeUndefined();
  });
});

describe('reason parity — every code the engine emits, in both languages (hub#1575)', () => {
  it('inspects the whole reason surface', () => {
    // Guards the guard: an emptied constant would make every loop below pass vacuously.
    expect(ENGINE_CERT_REASON_CODES.length).toBe(13);
  });

  it.each(ENGINE_CERT_REASON_CODES)('%s resolves in en and es', (code) => {
    for (const lang of ['en', 'es'] as const) {
      const dict = CATALOG[lang] as Record<string, Record<string, Record<string, string>>>;
      const entry = dict.ui?.evt?.reason?.[code];
      expect(typeof entry, `${lang} is missing ${EVENT_REASON_PREFIX}${code}`).toBe('string');
      expect(entry!.length).toBeGreaterThan(0);
    }
  });

  it.each(ENGINE_CERT_REASON_CODES)('%s is translated into es, not copied from en', (code) => {
    type Evt = Record<string, Record<string, Record<string, Record<string, string>>>>;
    const en = (CATALOG.en as Evt).ui.evt.reason[code];
    const es = (CATALOG.es as Evt).ui.evt.reason[code];
    expect(es, `es copies en for ${code}`).not.toBe(en);
  });

  it('builds every reason out of facts the engine ALWAYS sends', () => {
    // Read off `hub/crates/plugins/verifactu/src/diagnostics.rs` — the facts each `CertReason`
    // carries, never the whole payload: a placeholder the engine does not send is printed raw,
    // braces and all, which is the one shape worse than the Spanish it replaces.
    const alwaysSent: Record<string, string[]> = {
      certificate_unavailable: ['error'],
      no_transmission_route: ['error'],
      gateway_unreachable: ['error'],
      gateway_not_ready: ['status', 'reason', 'detail'],
      gateway_not_ready_unspecified: [],
      producer_facts_missing: ['error'],
      sample_envelope_invalid: ['error'],
      sample_record_schema_invalid: ['detail'],
      // verifactu#95 — one constant sentence each, nothing to fill.
      certificate_loaded: [],
      gateway_ready: [],
      issuer_nif_missing: [],
      // hub#1580 — the own road's call to the AEAT. Factless for the same reason: the raw
      // transport failure is painted BESIDE the sentence, out of `aeat.detail`, never inside it.
      aeat_tls_rejected: [],
      aeat_unreachable: [],
    };
    expect(Object.keys(alwaysSent).sort()).toEqual([...ENGINE_CERT_REASON_CODES].sort());

    for (const code of ENGINE_CERT_REASON_CODES) {
      for (const lang of ['en', 'es'] as const) {
        type Evt = Record<string, Record<string, Record<string, Record<string, string>>>>;
        const sentence = (CATALOG[lang] as Evt).ui.evt.reason[code];
        for (const [, placeholder] of sentence.matchAll(/\{([a-z_]+)\}/g)) {
          expect(alwaysSent[code], `${lang} ${code}: {${placeholder}} is not always sent`).toContain(
            placeholder,
          );
        }
      }
    }
  });

  // 🔒 A reason that quotes the engine's own Spanish inside itself would move the defect one level
  // down instead of removing it, which is why `{error}` — always the engine's own prose — is
  // banned outright.
  //
  // `{detail}` is allowed in the two codes that carry one, and since hub#1576 it is clean in both:
  // for `gateway_not_ready` it is the fiscal cell's own status (`expired`, `absent`), and for
  // `sample_record_schema_invalid` the validator now files its refusal as `detail_reason` —
  // `{code, …facts}` composed from THIS catalogue — with the Spanish sentence left behind as the
  // fallback for a hub that does not know the code. Until then it was the validator's own Spanish
  // («Descripcion es obligatorio y viene vacío»), kept anyway because losing it would have left
  // the reader with nothing actionable.
  it('never bakes the engine prose into a reason sentence', () => {
    for (const code of ENGINE_CERT_REASON_CODES) {
      for (const lang of ['en', 'es'] as const) {
        type Evt = Record<string, Record<string, Record<string, Record<string, string>>>>;
        const sentence = (CATALOG[lang] as Evt).ui.evt.reason[code];
        expect(sentence, `${lang} ${code}`).not.toContain('{error}');
      }
    }
  });
});

// ── hub#1576: the refusal of the SCHEMA, one level further down ──────────────────────────────
//
// hub#1575 translated the reason the diagnostic gives, and left the last half of one of them
// untranslated: `sample_record_schema_invalid` says «the AEAT schema refused the test record:
// {detail}», and `{detail}` was a sentence the hub's own XSD validator wrote in Spanish. So the
// English reader got the verdict in English and the only actionable half — WHICH field to fix —
// in a language it did not choose.
//
// The validator now files each refusal as a code with the element as data, and the reason nests:
// `detail` keeps the Spanish prose, `detail_reason` carries `{code, …facts}`, and this catalogue
// composes it. The nesting is resolved by convention — a fact called `<x>_reason` fills `{<x>}` —
// so the channel does not need a second special case the next time it happens.

/** The element names are the AEAT's own and stay in Spanish by law; the sentence around them is not. */
const SCHEMA_REFUSAL = {
  code: 'sample_record_schema_invalid',
  detail: 'DescripcionOperacion es obligatorio y viene vacío',
  detail_reason: { code: 'schema_element_empty', element: 'DescripcionOperacion' },
};

/** The validator's Spanish, the exact substring that must stop reaching an English reader. */
const VALIDATOR_PROSE = 'es obligatorio y viene vacío';

describe('the reason the SCHEMA gave is composed too (hub#1576)', () => {
  it('composes the nested reason into the placeholder the Spanish detail used to fill', () => {
    const sentence = reasonSentence(CATALOG, 'en', interpolatingIn('en'), SCHEMA_REFUSAL);

    expect(sentence, 'the validator Spanish is still in the sentence').not.toContain(VALIDATOR_PROSE);
    expect(sentence, 'the element the schema named is the actionable half').toContain(
      'DescripcionOperacion',
    );
    expect(sentence, 'a placeholder survived').not.toMatch(/\{[a-z_]+\}/);
  });

  // The positive the check above cannot catch on its own: `es` legitimately contains Spanish.
  it('says it differently in each language, and in neither the validator words', () => {
    const en = reasonSentence(CATALOG, 'en', interpolatingIn('en'), SCHEMA_REFUSAL);
    const es = reasonSentence(CATALOG, 'es', interpolatingIn('es'), SCHEMA_REFUSAL);

    expect(es).not.toBe(en);
    expect(en).not.toContain(VALIDATOR_PROSE);
  });

  // 🔒 The fallback, both directions of the merge order: a hub whose engine predates hub#1576
  // sends no `detail_reason`, and the sentence keeps the Spanish rather than lose what to fix.
  it('keeps the validator prose when the hub sends no nested code', () => {
    const { detail_reason: _dropped, ...older } = SCHEMA_REFUSAL;

    const sentence = reasonSentence(CATALOG, 'en', interpolatingIn('en'), older);

    expect(sentence).toContain(VALIDATOR_PROSE);
  });

  // …and so does a nested code this catalogue has never heard of — a hub ahead of this module.
  it('keeps the validator prose for a nested code it does not know', () => {
    const sentence = reasonSentence(CATALOG, 'en', interpolatingIn('en'), {
      ...SCHEMA_REFUSAL,
      detail_reason: { code: 'schema_something_from_the_future', element: 'X' },
    });

    expect(sentence).toContain(VALIDATOR_PROSE);
  });

  // 🔒 And an unresolved nested reason NEVER reaches `t()` as an object. `t` interpolates whatever
  // it is handed, so a `{detail_reason}` left in would print `[object Object]` inside a fiscal
  // line — the one shape worse than the Spanish it replaces.
  it('never hands the catalogue a raw object', () => {
    const { t, calls } = spy();

    reasonSentence(CATALOG, 'en', t, {
      ...SCHEMA_REFUSAL,
      detail_reason: { code: 'schema_something_from_the_future' },
    });

    const params = calls.find((c) => c.key.startsWith(EVENT_REASON_PREFIX))?.params ?? {};
    for (const [name, value] of Object.entries(params)) {
      expect(typeof value, `${name} reached t() as an object`).not.toBe('object');
    }
  });

  // 🔒 The whole way through, from the audit row the engine writes: the nesting has to survive
  // `eventMessage`, which is the surface the events list actually paints.
  it('reaches the audit line whole', () => {
    const composed = eventMessage(CATALOG, 'en', interpolatingIn('en'), {
      message: 'Prueba VeriFactu: el registro de prueba no es válido',
      details: JSON.stringify({
        message_key: 'verifactu.diagnostic_sample_record_invalid',
        cert_reason: SCHEMA_REFUSAL,
        environment: 'testing',
      }),
    });

    expect(composed).toContain('DescripcionOperacion');
    expect(composed).not.toContain(VALIDATOR_PROSE);
    expect(composed).not.toContain('[object Object]');
    expect(composed).not.toMatch(/\{[a-z_]+\}/);
  });
});

describe('schema reason parity — every refusal the validator emits, in both languages (hub#1576)', () => {
  it('inspects the whole schema surface', () => {
    // Guards the guard: an emptied constant would make every loop below pass vacuously.
    // Thirty-seven is the number of DISTINCT codes `xsd.rs::validate_registro` can file, pinned on
    // both sides — the hub asserts the same number in `the_schema_codes_are_not_all_the_same_one`.
    // It grew from fifteen in hub#1579, when the breakdown, the rectification and the F2 ceiling
    // stopped refusing in untranslatable prose.
    expect(ENGINE_SCHEMA_REASON_CODES.length).toBe(37);
  });

  it.each(ENGINE_SCHEMA_REASON_CODES)('%s resolves in en and es', (code) => {
    for (const lang of ['en', 'es'] as const) {
      const dict = CATALOG[lang] as Record<string, Record<string, Record<string, string>>>;
      const entry = dict.ui?.evt?.reason?.[code];
      expect(typeof entry, `${lang} is missing ${EVENT_REASON_PREFIX}${code}`).toBe('string');
      expect(entry!.length).toBeGreaterThan(0);
    }
  });

  it.each(ENGINE_SCHEMA_REASON_CODES)('%s is translated into es, not copied from en', (code) => {
    type Evt = Record<string, Record<string, Record<string, Record<string, string>>>>;
    const en = (CATALOG.en as Evt).ui.evt.reason[code];
    const es = (CATALOG.es as Evt).ui.evt.reason[code];
    expect(es, `es copies en for ${code}`).not.toBe(en);
  });

  it('builds every refusal out of facts the validator ALWAYS sends', () => {
    // Read off `hub/crates/plugins/verifactu/src/xsd.rs::validate_registro` — the `json!({…})` each
    // `named(...)` carries. A placeholder the validator does not send is printed raw, braces and
    // all, which is the one shape worse than the Spanish it replaces.
    const alwaysSent: Record<string, string[]> = {
      schema_envelope_empty: [],
      schema_envelope_not_regfactu: [],
      schema_header_issuer_missing: [],
      schema_issuer_identity_incomplete: ['element'],
      schema_representative_incomplete: ['element'],
      schema_element_out_of_order: ['element', 'sequence'],
      schema_record_missing: [],
      schema_element_missing: ['element'],
      schema_element_missing_or_empty: ['element'],
      schema_element_empty: ['element'],
      schema_value_not_in_enum: ['element', 'value', 'allowed'],
      schema_recipient_block_required: ['invoice_type'],
      schema_value_too_long: ['element', 'value', 'max'],
      schema_hash_type_unsupported: ['value'],
      schema_hash_malformed: [],
      // The rectification block (hub#1579): what a rectifying invoice must carry, and what a
      // plain one must not.
      schema_rectification_field_on_plain_invoice: ['invoice_type', 'element', 'allowed'],
      schema_rectification_type_missing: ['invoice_type', 'allowed'],
      schema_rectification_amount_required: [],
      schema_rectification_amount_not_allowed: [],
      // The breakdown (hub#1579). `line` travels in almost all of them: with up to twelve
      // `DetalleDesglose` in one envelope, «the rate is not allowed» without saying WHICH line
      // is a search, not an instruction.
      schema_breakdown_empty: [],
      schema_breakdown_too_many_lines: ['count', 'max'],
      schema_breakdown_value_not_in_enum: ['line', 'element', 'value', 'allowed'],
      schema_breakdown_regime_not_in_enum: ['line', 'value'],
      schema_breakdown_regime_not_allowed: ['line', 'tax', 'allowed'],
      schema_breakdown_regime_required: ['line', 'tax'],
      schema_breakdown_regime_requires_n2: ['line', 'regime', 'qualification'],
      schema_breakdown_qualification_conflict: ['line'],
      schema_breakdown_qualification_missing: ['line'],
      schema_breakdown_exemption_igic_only: ['line', 'value'],
      schema_breakdown_base_missing: ['line', 'element'],
      schema_breakdown_exempt_amount_not_allowed: ['line', 'element'],
      schema_breakdown_untaxed_amount_not_allowed: ['line', 'qualification', 'element'],
      schema_breakdown_reverse_charge_not_zero: ['line', 'element', 'value'],
      schema_breakdown_reverse_charge_missing: ['line', 'element'],
      schema_breakdown_vat_rate_not_allowed: ['line', 'value'],
      schema_breakdown_surcharge_rate_not_allowed: ['line', 'value'],
      // The simplified-invoice ceiling (hub#1579).
      schema_simplified_over_ceiling: ['total', 'ceiling', 'tolerance'],
    };
    expect(Object.keys(alwaysSent).sort()).toEqual([...ENGINE_SCHEMA_REASON_CODES].sort());

    for (const code of ENGINE_SCHEMA_REASON_CODES) {
      for (const lang of ['en', 'es'] as const) {
        type Evt = Record<string, Record<string, Record<string, Record<string, string>>>>;
        const sentence = (CATALOG[lang] as Evt).ui.evt.reason[code];
        for (const [, placeholder] of sentence.matchAll(/\{([a-z_]+)\}/g)) {
          expect(alwaysSent[code], `${lang} ${code}: {${placeholder}} is not always sent`).toContain(
            placeholder,
          );
        }
      }
    }
  });

  // 🔒 Same ban as the reasons above: a sentence that quotes the engine's own prose inside itself
  // would move the defect one level down instead of removing it.
  it('never bakes the engine prose into a schema sentence', () => {
    for (const code of ENGINE_SCHEMA_REASON_CODES) {
      for (const lang of ['en', 'es'] as const) {
        type Evt = Record<string, Record<string, Record<string, Record<string, string>>>>;
        const sentence = (CATALOG[lang] as Evt).ui.evt.reason[code];
        expect(sentence, `${lang} ${code}`).not.toContain('{error}');
        expect(sentence, `${lang} ${code}`).not.toContain('{detail}');
      }
    }
  });
});

describe('wait parity — why a record did not leave with its sale (verifactu#111)', () => {
  it('inspects both reasons the engine files', () => {
    // Guards the guard: an emptied constant would make every loop below pass vacuously.
    expect([...ENGINE_WAIT_REASON_CODES].sort()).toEqual([
      'earlier_records_pending',
      'no_transmission_route',
    ]);
  });

  it.each(ENGINE_WAIT_REASON_CODES)('%s resolves in en and es, translated', (code) => {
    type Evt = Record<string, Record<string, Record<string, Record<string, string>>>>;
    const en = (CATALOG.en as Evt).ui.evt.reason[code];
    const es = (CATALOG.es as Evt).ui.evt.reason[code];
    expect(typeof en, `en is missing ${EVENT_REASON_PREFIX}${code}`).toBe('string');
    expect(typeof es, `es is missing ${EVENT_REASON_PREFIX}${code}`).toBe('string');
    expect(es, `es copies en for ${code}`).not.toBe(en);
    // Factless: the engine files `{code}` alone, so any placeholder would print raw.
    expect(en.match(/\{[a-z_]+\}/g)).toBeNull();
    expect(es.match(/\{[a-z_]+\}/g)).toBeNull();
  });

  it('composes the reason in the reader language, never the engine prose', () => {
    const ENGINE_WHY = 'antes tiene que salir un registro anterior de la misma cadena';
    const details = JSON.stringify({
      message_key: 'verifactu.transmission_deferred',
      why: ENGINE_WHY,
      why_reason: { code: 'earlier_records_pending' },
    });

    const sentence = eventMessage(CATALOG, 'en', interpolatingIn('en'), row(details));

    type Evt = Record<string, Record<string, Record<string, Record<string, string>>>>;
    expect(sentence).toContain((CATALOG.en as Evt).ui.evt.reason.earlier_records_pending);
    expect(sentence).not.toContain(ENGINE_WHY);
    expect(sentence).not.toContain('{why}');
  });
});

// ── The F2 ceiling refusal says its amounts in the hub's money format (hub#2269) ─────────────
//
// It was the one refusal of the Events screen that painted money by hand: the hub sent
// `total: "4840.00"` and the sentence put a fixed «€» after it, so a Spanish reader got
// «…y esta suma 4840.00 €» (point decimal, no thousands separator) while every other amount of
// the module reads «4.840,00 €». The hub now sends the three amounts as integer cents too
// (ADR-0123) and the module paints them through `erplora().formatMoney` — the one formatter
// the shell owns, with the hub's currency, scale and locale.

/** The refusal as a hub with hub#2269 files it: the cents beside the legacy decimal strings. */
const OVER_CEILING = {
  code: 'schema_simplified_over_ceiling',
  total: '4840.00',
  ceiling: '3000.00',
  tolerance: '10.00',
  total_cents: 484000,
  ceiling_cents: 300000,
  tolerance_cents: 1000,
};

/** The same refusal from a hub older than hub#2269: only the decimal strings. */
const OVER_CEILING_OLDER_HUB = {
  code: 'schema_simplified_over_ceiling',
  total: '4840.00',
  ceiling: '3000.00',
  tolerance: '10.00',
};

/** A formatter that names what it was handed, so a test can say WHICH minor units reached it. */
const moneyEcho = (minor: number): string => `MONEY(${minor})`;

/** The shell's `formatMoney` for a EUR hub (`apps/web/src/lib/money.ts`), grouping forced (hub#1090). */
function eurosIn(locale: 'es' | 'en') {
  const tag = locale === 'es' ? 'es-ES' : 'en-US';
  return (minor: number): string =>
    new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR', useGrouping: true }).format(minor / 100);
}

describe('the F2 ceiling refusal paints its amounts with the hub money formatter (hub#2269)', () => {
  it('hands formatMoney the cents the hub sends, for all three amounts', () => {
    const sentence = reasonSentence(CATALOG, 'es', interpolatingIn('es'), OVER_CEILING, moneyEcho);

    expect(sentence).toContain('MONEY(484000)');
    expect(sentence).toContain('MONEY(300000)');
    expect(sentence).toContain('MONEY(1000)');
    expect(sentence, 'the hand-formatted decimal string still reaches the screen').not.toContain('4840.00');
  });

  // Both deployment orders: a hub older than hub#2269 sends only the strings, and the amount has
  // to read the same. The string is EUR by contract (the AEAT ceiling), so it crosses the named
  // frontier `eurosToCents` and then the same formatter.
  it('converts the decimal string of an older hub at the named frontier, then formats it', () => {
    const sentence = reasonSentence(CATALOG, 'es', interpolatingIn('es'), OVER_CEILING_OLDER_HUB, moneyEcho);

    expect(sentence).toContain('MONEY(484000)');
    expect(sentence).toContain('MONEY(300000)');
    expect(sentence).toContain('MONEY(1000)');
  });

  it('prefers the integer cents over the string when both arrive', () => {
    const sentence = reasonSentence(
      CATALOG,
      'en',
      interpolatingIn('en'),
      { ...OVER_CEILING, total: '1.00' },
      moneyEcho,
    );

    expect(sentence).toContain('MONEY(484000)');
    expect(sentence).not.toContain('MONEY(100)');
  });

  // The formatter already puts the currency: a «€» left in the sentence would read «4.840,00 € €».
  it('leaves the currency symbol to the formatter, in both languages', () => {
    type Evt = Record<string, Record<string, Record<string, Record<string, string>>>>;
    for (const lang of ['en', 'es'] as const) {
      const sentence = (CATALOG[lang] as Evt).ui.evt.reason.schema_simplified_over_ceiling;
      expect(sentence, `${lang} hard-codes a currency symbol`).not.toContain('€');
    }
  });

  // The whole way through, from the audit row a refused transmission writes: this is the cell the
  // Events screen paints.
  it('reads «4.840,00 €» in Spanish and «€4,840.00» in English on the audit line', () => {
    const auditRow = {
      message: 'XML no conforme al esquema de la AEAT; no se ha transmitido: …',
      details: JSON.stringify({
        message_key: 'verifactu.xsd_invalid',
        validation_error: 'una factura simplificada F2 no puede pasar de 3.000,00 € … y suma 4840.00 €',
        validation_error_reason: OVER_CEILING,
      }),
    };

    const es = eventMessage(CATALOG, 'es', interpolatingIn('es'), auditRow, eurosIn('es'));
    const en = eventMessage(CATALOG, 'en', interpolatingIn('en'), auditRow, eurosIn('en'));

    expect(es).toContain('4.840,00 €');
    expect(es).toContain('3.000,00 €');
    expect(es).toContain('10,00 €');
    expect(en).toContain('€4,840.00');
    expect(en).toContain('€3,000.00');
    for (const line of [es, en]) {
      expect(line).not.toContain('4840.00');
      expect(line).not.toMatch(/€\s*€/);
      expect(line).not.toMatch(/\{[a-z_]+\}/);
    }
  });

  // The settings card composes the same refusal on its own (the diagnostic's `detail_reason`).
  it('formats the amounts when the refusal is nested in a diagnostic reason too', () => {
    const sentence = certReasonSentence(
      CATALOG,
      'es',
      interpolatingIn('es'),
      {
        cert_reason: {
          code: 'sample_record_schema_invalid',
          detail: 'una factura simplificada F2 no puede pasar de 3.000,00 €',
          detail_reason: OVER_CEILING,
        },
      },
      moneyEcho,
    );

    expect(sentence).toContain('MONEY(484000)');
  });

  // Only a decimal amount crosses into money: anything else turned into cents would be `NaN → 0`
  // and the reader would see a confident «0,00 €» where the hub sent something it could not parse.
  it('leaves a legacy value that is not a decimal amount as the hub sent it', () => {
    const sentence = reasonSentence(
      CATALOG,
      'es',
      interpolatingIn('es'),
      { ...OVER_CEILING_OLDER_HUB, total: 'n/a' },
      moneyEcho,
    );

    expect(sentence).toContain('n/a');
    expect(sentence).not.toContain('MONEY(0)');
    expect(sentence).toContain('MONEY(300000)');
  });

  // The minor unit is an integer by contract (ADR-0123): a fractional one is not cents, so the
  // decimal string beside it wins.
  it('falls back to the decimal string when the cents are not an integer', () => {
    const sentence = reasonSentence(
      CATALOG,
      'es',
      interpolatingIn('es'),
      { ...OVER_CEILING, total_cents: 4840.5 },
      moneyEcho,
    );

    expect(sentence).toContain('MONEY(484000)');
    expect(sentence).not.toContain('MONEY(4840.5)');
  });
});
