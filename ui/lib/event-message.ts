// event-message — the audit sentence, composed from a CODE instead of copied from the engine.
//
// verifactu#63. Every `verifactu_event` row the engine writes carries, inside `details`, a stable
// `message_key` plus the values that sentence needs:
//
//   {"message_key":"verifactu.record_created","record_type":"alta","invoice_number":"F-2026-1",
//    "sequence_number":27,"record_hash":"…","is_first_record":false}
//
// It is the channel hub#1103 opened with `details.scope`: **code in `details`, sentence in the
// module's catalogue** (ADR-0055/0199). The row's own `message` is Spanish prose formatted in
// `hub/crates/plugins/verifactu/src/*.rs` — printing it straight through is what put hardcoded
// Spanish in front of every user of the fiscal audit trail.
//
// The engine keeps writing that prose ON PURPOSE, and this module keeps using it as the fallback:
// for a key the catalogue does not know — a hub on an older module version, an event written before
// hub#1178 — the sentence that came with the row says more than anything we could invent for it.

/** Namespace every key the engine emits lives in. A `message_key` outside it is not ours. */
export const EVENT_MESSAGE_PREFIX = 'verifactu.';

/** Where those keys live in `locales/*.json`: `verifactu.record_created` → `ui.evt.record_created`. */
export const EVENT_CATALOG_PREFIX = 'ui.evt.';

/**
 * Where the REASON behind the dash lives: `producer_facts_missing` → `ui.evt.reason.…` (hub#1575).
 *
 * Three of the five diagnostic verdicts end in `— {cert_message}`, and until hub#1575 that
 * placeholder was filled with Spanish prose the engine wrote: an English reader got «…does not
 * produce a valid test record — faltan los hechos del productor…», half a sentence in a language
 * they did not choose, and it was the half that says what to fix.
 *
 * Its own namespace and not a second `ui.evt.*` key, because a reason is not a verdict: it never
 * stands as the headline of an audit row, and the parity tests walk the two lists apart.
 */
export const EVENT_REASON_PREFIX = 'ui.evt.reason.';

/**
 * The keys `details_for(…)` is called with in `hub/crates/plugins/verifactu/src/` — the module's
 * declared rendering surface, verified against `origin/develop@dcdab14` (`records.rs`,
 * `recovery.rs`, `transmission.rs`, `validation.rs`, `diagnostics.rs`).
 *
 * It is not a lookup table: resolution goes through the catalogue, so a key added to the engine
 * still renders (as its `message`) without touching this list. It is the surface the parity test
 * walks, so `en` and `es` cannot drift apart unnoticed.
 */
export const ENGINE_MESSAGE_KEYS = [
  'verifactu.record_created',
  'verifactu.invoice_type_downgraded',
  'verifactu.xsd_invalid',
  'verifactu.transmission_retry',
  'verifactu.not_transmitted',
  'verifactu.aeat_verdict',
  'verifactu.contingency_processed',
  'verifactu.diagnostic_ran',
  'verifactu.diagnostic_certificate_invalid',
  'verifactu.diagnostic_gateway_unavailable',
  'verifactu.diagnostic_issuer_nif_missing',
  'verifactu.diagnostic_sample_record_invalid',
  'verifactu.chain_validated',
  'verifactu.chain_broken',
  'verifactu.aeat_queried',
  'verifactu.chain_recovered_from_aeat',
  'verifactu.chain_continued_manually',
] as const;

/**
 * The `cert_reason.code` values `diagnostics.rs` files — the reason surface, the twin of
 * [`ENGINE_MESSAGE_KEYS`] one field further in.
 *
 * Same contract: it is not a lookup table (resolution goes through the catalogue, so a code added
 * to the engine still renders — as the engine's own prose — without touching this list), it is the
 * surface the parity test walks so `en` and `es` cannot drift apart unnoticed.
 */
export const ENGINE_CERT_REASON_CODES = [
  // No road at all: with a certificate slot the fault is the certificate, without one it is that
  // this hub has nowhere to file (hub#1485 — the two ask opposite things of the reader).
  'certificate_unavailable',
  'no_transmission_route',
  // The cell answered.
  'gateway_not_ready',
  'gateway_not_ready_unspecified',
  'gateway_unreachable',
  // The test record this hub's own settings produce (hub#1559).
  'producer_facts_missing',
  'sample_envelope_invalid',
  'sample_record_schema_invalid',
  // The three CONSTANT verdicts (verifactu#95). hub#1575 coded the reasons that VARY and left
  // these behind, so «it went well» stayed the one sentence a business read in Spanish — on the
  // two runs it sees most often. Factless on purpose: each is one sentence with nothing to fill.
  'certificate_loaded',
  'gateway_ready',
  'issuer_nif_missing',
] as const;

/**
 * The refusals `xsd.rs::validate_registro` files as codes (hub#1576) — the reason NESTED inside a
 * reason.
 *
 * `sample_record_schema_invalid` says «the AEAT schema refused the test record: {detail}», and
 * until hub#1576 that `{detail}` was a sentence the hub's own validator wrote in Spanish. So the
 * verdict arrived translated and the only actionable half — WHICH element to fix — did not.
 *
 * The element names inside these sentences (`DescripcionOperacion`, `TipoHuella`…) stay in
 * Spanish on purpose: they are the AEAT's own tag names, fixed by law, and a business that rings
 * its accountant has to quote the same word the AEAT uses. They travel as DATA, never inside the
 * sentence, which is exactly what lets the sentence around them be translated.
 *
 * Same contract as the list above: it is not a lookup table (resolution goes through the
 * catalogue), it is the surface the parity test walks so `en` and `es` cannot drift apart.
 */
export const ENGINE_SCHEMA_REASON_CODES = [
  // The envelope itself.
  'schema_envelope_empty',
  'schema_envelope_not_regfactu',
  'schema_record_missing',
  // The header: who is filing, and on whose behalf.
  'schema_header_issuer_missing',
  'schema_issuer_identity_incomplete',
  'schema_representative_incomplete',
  // An element in the wrong place, or missing, or empty. Three codes and not one, because «you
  // left it blank» and «it is not there at all» are different things to go and look for.
  'schema_element_out_of_order',
  'schema_element_missing',
  'schema_element_missing_or_empty',
  'schema_element_empty',
  // A value the schema will not take.
  'schema_value_not_in_enum',
  'schema_value_too_long',
  'schema_recipient_block_required',
  'schema_hash_type_unsupported',
  'schema_hash_malformed',
] as const;

/**
 * Params the engine sends as a bare CODE that would read as prose if interpolated unchanged
 * (`alta`, `production`). They are resolved through the labels the Records and Settings screens
 * already use, so the whole sentence lands in one language — reusing those keys rather than adding
 * a second vocabulary for the same two enums.
 */
const PARAM_LABEL_KEYS: Record<string, Record<string, string>> = {
  record_type: { alta: 'ui.recTypeAlta', anulacion: 'ui.recTypeAnulacion' },
  environment: { testing: 'ui.envTesting', production: 'ui.envProduction' },
};

/** A key suffix that cannot walk out of `ui.evt` — `details` is row data, not a path. */
const SAFE_SUFFIX = /^[a-z][a-z0-9_]*$/;

/**
 * How a reason nests inside another one (hub#1576): a fact called `<x>_reason` is itself a
 * `{code, …facts}`, and the sentence it composes fills the placeholder `{<x>}` beside it.
 *
 * A convention and not a second special case, because it has already happened twice — the
 * diagnostic's verdict, then the schema refusal inside it — and the next one should not need a
 * third branch here. The engine keeps filing the plain `<x>` too, in its own prose: that is the
 * fallback a hub whose module does not know the nested code still paints.
 */
const REASON_FACT_SUFFIX = '_reason';

export type Translate = (
  catalog: Record<string, unknown>,
  key: string,
  params?: Record<string, unknown>,
) => string;

export interface EventRow {
  /** The prose the engine wrote. The fallback, never the first choice. */
  message: string;
  /** JSON as stored (`TEXT NOT NULL DEFAULT '{}'`), or already parsed by the transport. */
  details?: unknown;
}

/** `verifactu.record_created` → `ui.evt.record_created`; anything else → `null`. */
export function catalogKeyFor(messageKey: string): string | null {
  if (!messageKey.startsWith(EVENT_MESSAGE_PREFIX)) return null;
  const suffix = messageKey.slice(EVENT_MESSAGE_PREFIX.length);
  return SAFE_SUFFIX.test(suffix) ? `${EVENT_CATALOG_PREFIX}${suffix}` : null;
}

/** `details` as an object, whatever shape it arrived in. Never throws. */
function parseDetails(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== 'string' || raw.trim() === '') return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    // Not JSON: a row written before this channel existed, or one edited by hand. There is nothing
    // to report to the user that the row itself does not already say — the caller falls back to
    // `message`, which is the engine's own account of what happened.
    return {};
  }
}

/** Whether the catalogue can actually build this sentence, in the active language or in the source. */
function catalogHas(catalog: Record<string, unknown>, locale: string, key: string): boolean {
  for (const lang of [locale, 'en']) {
    let cursor: unknown = catalog[lang];
    for (const part of key.split('.')) {
      cursor = cursor && typeof cursor === 'object'
        ? (cursor as Record<string, unknown>)[part]
        : undefined;
    }
    if (typeof cursor === 'string' && cursor.length > 0) return true;
  }
  return false;
}

/**
 * Replaces the enum codes with their translated labels, resolves the reasons nested one level in,
 * and DROPS everything `t()` must never be handed.
 *
 * Two kinds are dropped. The params the engine sent as `null` — `csv`, `codigo_error`, `note` and
 * `first_invalid_seq` are null on the happy path — because `t()` interpolates whatever it is
 * handed and would print the word «null» inside a fiscal audit line. And the ones that are still
 * OBJECTS, which would print `[object Object]` there: `cert_reason` and `detail_reason` are the
 * SOURCE of a sentence, never a value to interpolate. Dropped, the placeholder survives instead,
 * which is why no sentence in the catalogue is allowed to depend on an optional field (pinned by
 * the parity test).
 *
 * The nested pass runs SECOND on purpose: `detail` and `detail_reason` both arrive, the first
 * being the engine's Spanish and the second the code for it, and the composed sentence has to win
 * whichever order the JSON happened to list them in.
 */
function localizedParams(
  catalog: Record<string, unknown>,
  locale: string,
  t: Translate,
  details: Record<string, unknown>,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [param, value] of Object.entries(details)) {
    if (value === null || value === undefined || typeof value === 'object') continue;
    const labelKey = typeof value === 'string' ? PARAM_LABEL_KEYS[param]?.[value] : undefined;
    params[param] = labelKey ? t(catalog, labelKey) : value;
  }
  for (const [param, value] of Object.entries(details)) {
    if (!param.endsWith(REASON_FACT_SUFFIX)) continue;
    const nested = reasonSentence(catalog, locale, t, value);
    if (nested !== undefined) params[param.slice(0, -REASON_FACT_SUFFIX.length)] = nested;
  }
  return params;
}

/**
 * A `{code, …facts}` the engine filed, as its own sentence — `undefined` when what arrived is not
 * one, or when this catalogue does not know the code.
 *
 * `undefined` is the answer that matters: it is what makes BOTH deployment orders safe. A hub older
 * than the change that files the code sends nothing at all, and a hub newer than this module sends
 * a code the catalogue has never heard of; in either case the caller keeps the engine's own prose,
 * which is the whole reason that prose is still written and still travels.
 *
 * Takes the RAW field rather than the row, because the engine files this shape in more than one
 * place: `details.cert_reason` for the certificate verdict (hub#1575) and `details.aeat.reason` for
 * the AEAT box of the own road (hub#1578). One resolver, so a code cannot read one way in the
 * events list and another in the settings card.
 */
export function reasonSentence(
  catalog: Record<string, unknown>,
  locale: string,
  t: Translate,
  raw: unknown,
): string | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const reason = raw as Record<string, unknown>;
  const code = reason.code;
  if (typeof code !== 'string' || !SAFE_SUFFIX.test(code)) return undefined;
  const key = `${EVENT_REASON_PREFIX}${code}`;
  if (!catalogHas(catalog, locale, key)) return undefined;
  return t(catalog, key, localizedParams(catalog, locale, t, reason));
}

/**
 * The reason a DIAGNOSTIC gives for its certificate verdict (hub#1575): [`reasonSentence`] applied
 * to the field that carries it.
 *
 * Exported because the Settings screen paints the same reason on its own, in the box it already
 * had. One composer, so the events list and the settings box cannot say different things about the
 * same run.
 */
export function certReasonSentence(
  catalog: Record<string, unknown>,
  locale: string,
  t: Translate,
  details: Record<string, unknown>,
): string | undefined {
  return reasonSentence(catalog, locale, t, details.cert_reason);
}

/**
 * The sentence for one audit row: composed from `details.message_key` when the catalogue knows it,
 * and the engine's own `message` when it does not.
 */
export function eventMessage(
  catalog: Record<string, unknown>,
  locale: string,
  t: Translate,
  row: EventRow,
): string {
  const details = parseDetails(row.details);
  const messageKey = details.message_key;
  if (typeof messageKey !== 'string') return row.message;
  const key = catalogKeyFor(messageKey);
  if (!key || !catalogHas(catalog, locale, key)) return row.message;
  // `cert_reason` never reaches `t()` as an object — `localizedParams` drops it, along with any
  // other nested source — and comes back as a sentence instead.
  const params = localizedParams(catalog, locale, t, details);
  const reason = certReasonSentence(catalog, locale, t, details);
  if (reason !== undefined) params.cert_message = reason;
  return t(catalog, key, params);
}
