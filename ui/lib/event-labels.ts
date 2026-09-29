// event-labels — the Severity and Type of an audit row, as words (verifactu#134).
//
// `severity` and `event_type` are CODES the engine files in `verifactu_event`: the list filters on
// them with `op: eq` and the AEAT never sees them. Only the CELL changes — the stored code, the
// query and the filter value stay exactly as they are. Painted raw, «warning» and
// «transmission_deferred» sat in the middle of a Spanish table and told the owner nothing.

import { catalogHas, type Translate } from './event-message';

/**
 * The `event_type` values `hub/crates/plugins/verifactu/src/` files, verified against
 * `origin/develop@f8f3dfdb` (`records.rs`, `transmission.rs`, `validation.rs`, `recovery.rs`,
 * `diagnostics.rs`). The order is the one the Type filter lists them in: the life of a record,
 * then the chain, then the checks.
 *
 * It is not a lookup table: a type the engine adds still renders (as its code) without touching
 * this list. It is the surface the parity test walks, and the options of the Type filter.
 */
export const ENGINE_EVENT_TYPES = [
  'record_created',
  'invoice_type_downgraded',
  'transmission_deferred',
  'transmission_success',
  'transmission_warning',
  'transmission_failure',
  'contingency_processed',
  'chain_validated',
  'chain_error',
  'aeat_queried',
  'chain_recovered',
  'diagnostic',
] as const;

/** Where the type labels live in `locales/*.json`: `record_created` → `ui.evtType.record_created`. */
export const EVENT_TYPE_CATALOG_PREFIX = 'ui.evtType.';

/**
 * The severities the table offers, in rising order, with the keys the Severity filter already
 * used — one vocabulary for the filter and the cell.
 */
const SEVERITY_LABEL_KEYS = {
  debug: 'ui.sevDebug',
  info: 'ui.sevInfo',
  warning: 'ui.sevWarning',
  error: 'ui.sevError',
  critical: 'ui.sevCritical',
} as const;

export const EVENT_SEVERITIES = Object.keys(SEVERITY_LABEL_KEYS) as ReadonlyArray<
  keyof typeof SEVERITY_LABEL_KEYS
>;

/** The cell text for a code nobody translated: the code itself, never the word «null». */
function raw(code: unknown): string {
  return code === null || code === undefined ? '' : String(code);
}

/** The label of an event type, or the code itself when this catalogue does not know it. */
export function eventTypeLabel(
  catalog: Record<string, unknown>,
  locale: string,
  t: Translate,
  code: unknown,
): string {
  if (typeof code !== 'string') return raw(code);
  // `catalogHas` only answers yes for a STRING at the end of the path, so a code that is not one
  // of ours (`__proto__`, `toString`, `a.b`) falls through to the code itself.
  const key = `${EVENT_TYPE_CATALOG_PREFIX}${code}`;
  return catalogHas(catalog, locale, key) ? t(catalog, key) : code;
}

/** The label of a severity, or the code itself when it is not one of ours. */
export function severityLabel(
  catalog: Record<string, unknown>,
  _locale: string,
  t: Translate,
  code: unknown,
): string {
  if (typeof code !== 'string' || !Object.hasOwn(SEVERITY_LABEL_KEYS, code)) return raw(code);
  return t(catalog, SEVERITY_LABEL_KEYS[code as keyof typeof SEVERITY_LABEL_KEYS]);
}
