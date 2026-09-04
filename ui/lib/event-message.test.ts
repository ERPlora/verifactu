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
  ENGINE_MESSAGE_KEYS,
  EVENT_CATALOG_PREFIX,
  catalogKeyFor,
  eventMessage,
  type Translate,
} from './event-message';

const CATALOG: Record<string, unknown> = { en: enLocale, es: esLocale };

/** `t` as the shell implements it, minus the wording: returns the key, so a test can name it. */
const keyEcho: Translate = (_catalog, key) => key;

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
    expect(ENGINE_MESSAGE_KEYS.length).toBe(15);
  });

  // hub#1485 — the THIRD verdict `run_diagnostics` can reach. On the delegated road a failed test
  // is not a certificate the business could renew (it has none, and never will): it is the fiscal
  // cell being unable to file right now. Rendering that as `diagnostic_certificate_invalid` is the
  // very defect hub#1485 exists to remove, so the key has to land here before the screen can tell
  // the two apart.
  it('knows the delegated verdict, which is NOT a broken certificate (hub#1485)', () => {
    expect(ENGINE_MESSAGE_KEYS).toContain('verifactu.diagnostic_gateway_unavailable');
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
      'verifactu.chain_validated': ['valid', 'total', 'issuer_nif', 'environment', 'scope'],
      // first_invalid_seq / first_invalid_id are null on a chain that validates.
      'verifactu.chain_broken': ['valid', 'total', 'issuer_nif', 'environment', 'scope', 'first_invalid_seq'],
      'verifactu.aeat_queried': ['count', 'issuer_nif'],
      'verifactu.chain_recovered_from_aeat': ['source', 'issuer_nif', 'record_hash', 'sequence_number', 'found'],
      'verifactu.chain_continued_manually': ['source', 'issuer_nif', 'record_hash', 'sequence_number'],
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
