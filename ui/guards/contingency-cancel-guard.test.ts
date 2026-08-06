// GUARD (ADR-0202 phase 1, F1 — verifactu#27): `contingency.cancel` cannot discard a
// required record.
//
// A VeriFactu record, once generated, is chained (its fingerprint is part of the hash chain)
// and MUST reach the AEAT: a generated record that is never transmitted is exactly the orphan
// that FAQ §5 forbids. `contingency_cancel` used to mark ANY queue entry as cancelled,
// discarding the retry of records the AEAT does not have yet. The contract fixed here: the
// queue entry can only be discarded when the linked record is already registered at the AEAT
// (`status = 'accepted'`, which per ADR-0189 includes `AceptadoConErrores`); every other state
// (pending/transmitted/rejected/error/retry) keeps its retry — the correction path is a linked,
// immutable subsanation/annulment, never a discard.
//
// This repo has no DB harness (same spirit as `environment-chain-scope.test.ts`): the
// behavioral enforcement is the Postgres CHECK on the `verifactu__gate` table (the `tables`
// module gate pattern) — a refused cancel violates `CHECK (ok = 1)` and rolls back the whole
// command transaction, event emission included. This guard pins that contract at the file
// level:
//  1. a NEW migration creates `verifactu__gate` with `CHECK (ok = 1)` (001 is published →
//     append-only), and the manifest declares it;
//  2. the cancel UPDATE only applies when the linked record is accepted (hub-scoped);
//  3. the command chains guarded UPDATE → assert → gate cleanup, in that order;
//  4. the assert only passes when the cancel actually applied in THIS command run;
//  5. the UI has a friendly i18n message for the refusal, in both locales.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MODULE = join(__dirname, '..', '..');
const MIGRATIONS = join(MODULE, 'migrations', 'postgres');

/** Migration files in application order (the runtime sorts by filename, `NNN_` prefixes). */
function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
}

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '');
}

function commandSql(file: string): string {
  return stripComments(readFileSync(join(MODULE, 'commands', file), 'utf8'));
}

describe('contingency cancel guard (FAQ §5 — verifactu#27)', () => {
  it('a new migration creates verifactu__gate with CHECK (ok = 1)', () => {
    const creating = migrationFiles().filter((f) =>
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+verifactu__gate\b[\s\S]*?CHECK\s*\(\s*ok\s*=\s*1\s*\)/i.test(
        stripComments(readFileSync(join(MIGRATIONS, f), 'utf8')),
      ),
    );
    expect(creating, 'no migration creates the verifactu__gate guard table').toHaveLength(1);
    // Append-only: the gate arrives in a NEW file, never by editing published migrations.
    expect(creating[0]).not.toBe('001_init.sql');
  });

  it('the manifest declares the gate migration', () => {
    const manifest = JSON.parse(readFileSync(join(MODULE, 'module.json'), 'utf8'));
    const declared: string[] = manifest.migrations?.postgres ?? [];
    const creating = migrationFiles().find((f) =>
      /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+verifactu__gate\b/i.test(
        stripComments(readFileSync(join(MIGRATIONS, f), 'utf8')),
      ),
    );
    expect(creating, 'migration creating verifactu__gate not found').toBeDefined();
    expect(declared).toContain(`migrations/postgres/${creating}`);
  });

  it('the cancel UPDATE only applies when the linked record is accepted at the AEAT', () => {
    const sql = commandSql('contingency_cancel.sql');
    expect(sql).toMatch(/UPDATE\s+verifactu_contingencyqueue\b/i);
    // The guard lives in the WHERE: an EXISTS over the linked record requiring 'accepted'.
    const guard = sql.match(/EXISTS\s*\(\s*SELECT[\s\S]*?\)/i)?.[0] ?? '';
    expect(guard, 'no EXISTS guard over verifactu_record').toMatch(/FROM\s+verifactu_record\b/i);
    expect(guard).toMatch(/status\s*=\s*'accepted'/i);
    // Never cross hubs: the subquery is hub-scoped too.
    expect(guard).toMatch(/hub_id\s*=\s*:hub_id/i);
  });

  it('the command chains guarded UPDATE, assert and gate cleanup in that order', () => {
    const manifest = JSON.parse(readFileSync(join(MODULE, 'module.json'), 'utf8'));
    const chain: string[] = manifest.commands?.['verifactu.contingency.cancel']?.sql ?? [];
    expect(chain).toEqual([
      'commands/contingency_cancel.sql',
      'commands/_contingency_cancel_assert.sql',
      'commands/_gate_clear.sql',
    ]);
  });

  it('the assert only passes when the cancel actually applied in this command run', () => {
    const sql = commandSql('_contingency_cancel_assert.sql');
    expect(sql).toMatch(/INSERT\s+INTO\s+verifactu__gate\b/i);
    const probe = sql.match(/CASE\s+WHEN\s+EXISTS\s*\(\s*SELECT[\s\S]*?\)\s*THEN\s*1\s*ELSE\s*0/i)?.[0] ?? '';
    expect(probe, 'no CASE WHEN EXISTS probe').toMatch(/FROM\s+verifactu_contingencyqueue\b/i);
    expect(probe).toMatch(/status\s*=\s*'cancelled'/i);
    // `:now` distinguishes THIS run from an entry cancelled in the past.
    expect(probe).toMatch(/updated_at\s*=\s*:now/i);
  });

  it('the gate cleanup empties the gate table', () => {
    expect(commandSql('_gate_clear.sql')).toMatch(/DELETE\s+FROM\s+verifactu__gate\b/i);
  });

  it('both locales carry the friendly refusal message', () => {
    for (const locale of ['en', 'es']) {
      const catalog = JSON.parse(readFileSync(join(MODULE, 'locales', `${locale}.json`), 'utf8'));
      expect(
        catalog.ui?.errCancelRequiredRecord,
        `locales/${locale}.json misses ui.errCancelRequiredRecord`,
      ).toBeTruthy();
    }
  });
});
