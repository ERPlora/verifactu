// GUARD (ADR-0202 phase 1, R1 — verifactu#25): going live is ONE WAY.
//
// `config_save` was a blind UPSERT: it overwrote `environment` without looking at anything, so a
// hub that had already gone live could be flipped back to `testing`. Every sale from that moment
// on is REAL but its record is sent to preproduction — for the AEAT it never existed. That is the
// generated-but-never-remitted orphan FAQ §5 forbids, and «the receipt says test» does not save
// it: the invoice is real. Its QR would also point at `prewww2`, which the customer cannot check.
//
// The contract fixed here: with ≥1 record ACCEPTED in `production` (per ADR-0189 `accepted`
// covers AceptadoConErrores), `config_save` refuses to set `environment = 'testing'`. Everything
// else stays legal: testing→production (the go-live itself), production→production, and any flip
// on a hub that has not sent an accepted production record yet.
//
// The legitimate way to try things out after go-live is ANOTHER hub (a free one, or the demo with
// its environment pinned to testing) — never walking the live chain backwards.
//
// This repo has no DB harness (same spirit as `contingency-cancel-guard.test.ts`): the behavioral
// enforcement is the Postgres CHECK on `verifactu__gate` — a refused flip violates
// `CHECK (ok = 1)` and rolls back the whole command transaction, its outbox event included. This
// guard pins that contract at the file level:
//  1. the UPSERT refuses the illegal flip (hub-scoped, production + accepted);
//  2. the command chains guarded UPSERT → assert → gate cleanup, in that order;
//  3. the assert only passes when the config actually landed in THIS command run;
//  4. the UI has a friendly i18n message for the refusal, in both locales.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MODULE = join(__dirname, '..', '..');

function read(...parts: string[]): string {
  return readFileSync(join(MODULE, ...parts), 'utf8');
}

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '');
}

const manifest = JSON.parse(read('module.json')) as {
  commands: Record<string, { sql: string[] }>;
};

describe('R1 — going live is one way: production→testing is refused', () => {
  it('the config UPSERT only applies when the flip is legal', () => {
    const sql = stripComments(read('commands', 'config_save.sql'));
    // It must look at the records table: without that it cannot know the hub went live.
    expect(sql).toMatch(/verifactu_record/i);
    // The condition is the ILLEGAL one: incoming testing + an accepted production record.
    expect(sql).toMatch(/'testing'/);
    expect(sql).toMatch(/'production'/);
    expect(sql).toMatch(/status\s*=\s*'accepted'/i);
    // Hub-scoped: another hub's chain must never decide this hub's flip.
    expect(sql).toMatch(/hub_id\s*=\s*:hub_id/i);
  });

  it('the command chains guarded upsert → assert → gate cleanup', () => {
    const chain = manifest.commands['verifactu.config.save'].sql;
    expect(chain).toEqual([
      'commands/config_save.sql',
      'commands/_config_save_assert.sql',
      'commands/_gate_clear.sql',
    ]);
  });

  it('the assert only passes when the config landed in THIS command run', () => {
    const sql = stripComments(read('commands', '_config_save_assert.sql'));
    expect(sql).toMatch(/verifactu__gate/i);
    // `:now` pins this run: a row updated by an earlier save must not satisfy the assert.
    expect(sql).toMatch(/updated_at\s*=\s*:now/i);
    expect(sql).toMatch(/hub_id\s*=\s*:hub_id/i);
  });

  it('the settings screen maps the gate violation to that message', () => {
    const ui = read('ui', 'components', 'erp-verifactu-settings', 'erp-verifactu-settings.ts');
    // The runtime surfaces the raw CHECK violation; the user must not read `verifactu__gate`.
    expect(ui).toMatch(/verifactu__gate/);
    expect(ui).toMatch(/ui\.errGoLiveIsOneWay/);
  });

  it('the refusal has a friendly message in both locales', () => {
    for (const lang of ['en', 'es']) {
      const catalog = JSON.parse(read('locales', `${lang}.json`)) as {
        ui?: Record<string, string>;
      };
      expect(
        catalog.ui?.errGoLiveIsOneWay,
        `locales/${lang}.json misses ui.errGoLiveIsOneWay`,
      ).toBeTruthy();
    }
  });
});
