// event-time — when an audit event happened, as a person reads it (verifactu#141).
//
// `verifactu_event.timestamp` is ISO-8601 TEXT with the offset the engine wrote it with. The list
// sorts and filters on that text, and that stays: only the CELL changes. Painted raw it read
// «2026-09-27T10:00:05+02:00», the one technical string left on a screen that otherwise speaks the
// owner's language.
//
// Date AND time to the second: this is an audit trail, and a sealed record and its deferred
// submission are routinely seconds apart. On the BUSINESS clock — the hub's IANA zone the shell
// publishes as `erplora.timezone` — never the device's: a tablet on the wrong zone must not move a
// fiscal event by hours. Same rule as the WhatsApp inbox (`whatsapp_inbox/ui/lib/message-time.ts`).

export interface EventTimeOptions {
  /** Hub language (`erplora.locale`). */
  locale: string;
  /** Hub IANA zone (`erplora.timezone`). */
  timezone: string;
}

/** A zone `Intl` accepts. An unknown one degrades to UTC like the runtime's own `timezone_name()`:
 *  a clock wrong by a known amount beats a `RangeError` on every row. */
function usableZone(timezone: string): string {
  if (!timezone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return timezone;
  } catch {
    return 'UTC';
  }
}

export function formatEventTime(value: unknown, opts: EventTimeOptions): string {
  const raw = value == null ? '' : String(value);
  if (!raw) return '';
  const instant = new Date(raw);
  if (Number.isNaN(instant.getTime())) return raw;
  try {
    return new Intl.DateTimeFormat(opts.locale || 'es', {
      timeZone: usableZone(opts.timezone),
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).format(instant);
  } catch {
    return raw; // an unknown locale is not a reason to lose the value
  }
}
