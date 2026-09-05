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
 * Replaces the enum codes with their translated labels, and DROPS the params the engine sent as
 * `null` — `csv`, `codigo_error`, `note` and `first_invalid_seq` are null on the happy path, and
 * `t()` interpolates whatever it is handed, so keeping them would print the word «null» inside a
 * fiscal audit line. Dropped, the placeholder survives instead, which is why no sentence in the
 * catalogue is allowed to depend on an optional field (pinned by the parity test).
 */
function localizedParams(
  catalog: Record<string, unknown>,
  t: Translate,
  details: Record<string, unknown>,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [param, value] of Object.entries(details)) {
    if (value === null || value === undefined) continue;
    const labelKey = typeof value === 'string' ? PARAM_LABEL_KEYS[param]?.[value] : undefined;
    params[param] = labelKey ? t(catalog, labelKey) : value;
  }
  return params;
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
  return t(catalog, key, localizedParams(catalog, t, details));
}
