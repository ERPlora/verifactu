// GUARD (ERPlora/hub#2132): the internal writes the SEND path makes carry the send's permission.
//
// The runtime checks every operation a native handler returns against the permission of the
// command it names (§5.3, hub#459). When a send is refused for its chain, the engine consults the
// AEAT, files the recovered anchor (`_insert_recovery`) and re-chains the record
// (`_rechain_record`). The anchor asked for `configure_verifactu`, so a manager (view, manage,
// transmit) who sent the pending tickets by hand saw the whole drain stop with a permission error,
// while the scheduled drain — running as the system — did the same recovery fine.
//
// The contract pinned here:
//  1. the writes a send may need carry `transmit_verifactu`, like the send itself;
//  2. the doors that recover the chain ON DEMAND keep `configure_verifactu` (admin only): lowering
//     the internal write never lowers the recovery screen. Internal commands are not reachable
//     from the API (their name starts with `_`), so only the engine can issue them.
//
// The behaviour is exercised in the hub (`late_remission_verifactu111::
// a_drain_launched_by_hand_rechains_and_the_ticket_reaches_the_aeat`), which loads this manifest.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'module.json'), 'utf8'),
) as { commands: Record<string, { permission?: string }> };

function permissionOf(command: string): string | undefined {
  return MANIFEST.commands[command]?.permission;
}

describe('send path permissions (hub#2132)', () => {
  it.each(['verifactu._insert_recovery', 'verifactu._rechain_record'])(
    '%s carries the send permission',
    (command) => {
      expect(permissionOf(command)).toBe('verifactu.transmit_verifactu');
    },
  );

  it.each(['verifactu.recovery.from_aeat', 'verifactu.recovery.manual'])(
    '%s stays admin only',
    (command) => {
      expect(permissionOf(command)).toBe('verifactu.configure_verifactu');
    },
  );
});
