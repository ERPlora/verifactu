// When an audit event happened, as a person reads it (verifactu#141).
//
// `verifactu_event.timestamp` is ISO-8601 TEXT with an offset. The table sorted and filtered on it
// correctly and then printed it verbatim — «2026-09-27T10:00:05+02:00» in the middle of a Spanish
// screen. These pin the cell: date and time in the hub's language, on the hub's clock.
import { describe, expect, it } from 'vitest';
import { formatEventTime } from './event-time';

const STORED = '2026-09-27T10:00:05+02:00';

describe('formatEventTime', () => {
  it('reads as a Spanish date and time for a Spanish hub', () => {
    expect(formatEventTime(STORED, { locale: 'es', timezone: 'Europe/Madrid' })).toBe('27/09/2026, 10:00:05');
  });

  it('follows the hub language, not a fixed one', () => {
    expect(formatEventTime(STORED, { locale: 'en', timezone: 'Europe/Madrid' })).toBe('09/27/2026, 10:00:05');
  });

  it('is on the hub clock, not on the offset the row was written with', () => {
    // Same instant, written in UTC: the owner in Madrid still reads 10:00.
    expect(formatEventTime('2026-09-27T08:00:05Z', { locale: 'es', timezone: 'Europe/Madrid' })).toBe('27/09/2026, 10:00:05');
    // A hub in the Canaries reads its own hour for a row stamped on the peninsula.
    expect(formatEventTime(STORED, { locale: 'es', timezone: 'Atlantic/Canary' })).toBe('27/09/2026, 09:00:05');
  });

  it('never shows the technical ISO form for a valid timestamp', () => {
    expect(formatEventTime(STORED, { locale: 'es', timezone: 'Europe/Madrid' })).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('degrades an unknown zone to UTC instead of throwing on every row', () => {
    expect(formatEventTime(STORED, { locale: 'es', timezone: 'Mars/Olympus' })).toBe('27/09/2026, 08:00:05');
    expect(formatEventTime(STORED, { locale: 'es', timezone: '' })).toBe('27/09/2026, 08:00:05');
  });

  it('keeps what it cannot read instead of losing it', () => {
    expect(formatEventTime('not a date', { locale: 'es', timezone: 'Europe/Madrid' })).toBe('not a date');
    expect(formatEventTime(STORED, { locale: 'not a locale', timezone: 'Europe/Madrid' })).toBe(STORED);
    expect(formatEventTime(null, { locale: 'es', timezone: 'Europe/Madrid' })).toBe('');
    expect(formatEventTime(undefined, { locale: 'es', timezone: 'Europe/Madrid' })).toBe('');
  });
});
