// GUARD (ADR-0202 phase 1, R4): the VeriFactu chain is scoped per AEAT environment.
//
// `verifactu_record` carried no `environment` column, so flipping the config toggle chained the
// first production record onto the fingerprint of a testing one. The contract fixed here:
// `production` and `testing` are two PARALLEL, INDEPENDENT chains — the uniqueness of the
// sequence and of the (invoice, date, type) key is per (hub_id, issuer_nif, environment).
//
// This repo has no DB harness (the behavioral enforcement is the Postgres unique index itself,
// exercised by the hub e2e that load modules from disk — hub#313 pairs the crate anchor), so this
// guard pins the SQL contract at the file level, same spirit as the workspace `guards/` tests:
//  1. a migration adds `environment` to `verifactu_record` (001 is published → append-only);
//  2. the FINAL definition of both unique indexes is scoped by environment, and any
//     redefinition drops the old index first (`CREATE ... IF NOT EXISTS` would silently keep
//     the unscoped one);
//  3. the insertion SQL (`_insert_record`, `_insert_recovery`) writes the column;
//  4. the manifest declares the new migration (Cloud unions with the zip, but the manifest is
//     the contract).
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

/** Last CREATE UNIQUE INDEX definition for `name` across migrations + the file that holds it. */
function finalIndexDefinition(name: string): { file: string; columns: string[] } | null {
  let found: { file: string; columns: string[] } | null = null;
  const re = new RegExp(
    `CREATE\\s+UNIQUE\\s+INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${name}\\s+ON\\s+verifactu_record\\s*\\(([^)]*)\\)`,
    'gi',
  );
  for (const file of migrationFiles()) {
    const sql = stripComments(readFileSync(join(MIGRATIONS, file), 'utf8'));
    for (const match of sql.matchAll(re)) {
      found = { file, columns: match[1].split(',').map((c) => c.trim()) };
    }
  }
  return found;
}

describe('environment-scoped chain (ADR-0202 R4)', () => {
  it('a migration adds the environment column to verifactu_record', () => {
    const adding = migrationFiles().filter((f) =>
      /ALTER\s+TABLE\s+verifactu_record\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+environment\b/i.test(
        stripComments(readFileSync(join(MIGRATIONS, f), 'utf8')),
      ),
    );
    expect(adding, 'no migration adds `environment` to verifactu_record').toHaveLength(1);
    // Append-only: the column arrives via ALTER in a NEW file, never by editing published 001.
    expect(adding[0]).not.toBe('001_init.sql');
  });

  it('uq_verifactu_record_hub_seq is scoped per (hub_id, issuer_nif, environment)', () => {
    const def = finalIndexDefinition('uq_verifactu_record_hub_seq');
    expect(def).not.toBeNull();
    expect(def!.columns).toEqual(['hub_id', 'issuer_nif', 'environment', 'sequence_number']);
  });

  it('uq_verifactu_record is scoped per (hub_id, issuer_nif, environment)', () => {
    const def = finalIndexDefinition('uq_verifactu_record');
    expect(def).not.toBeNull();
    expect(def!.columns).toEqual([
      'hub_id',
      'issuer_nif',
      'environment',
      'invoice_number',
      'invoice_date',
      'record_type',
    ]);
  });

  it('every index redefinition drops the published index first (IF NOT EXISTS is a no-op)', () => {
    for (const name of ['uq_verifactu_record_hub_seq', 'uq_verifactu_record']) {
      const def = finalIndexDefinition(name)!;
      expect(def, `index ${name} not found`).not.toBeNull();
      if (def.file === '001_init.sql') continue; // never redefined — nothing to drop
      const sql = stripComments(readFileSync(join(MIGRATIONS, def.file), 'utf8'));
      const drop = new RegExp(`DROP\\s+INDEX\\s+IF\\s+EXISTS\\s+${name}\\s*;`, 'i');
      expect(drop.test(sql), `${def.file} redefines ${name} without dropping it first`).toBe(true);
    }
  });

  it('the insertion SQL writes the environment column', () => {
    for (const cmd of ['_insert_record.sql', '_insert_recovery.sql']) {
      const sql = stripComments(readFileSync(join(MODULE, 'commands', cmd), 'utf8'));
      const columns = sql.match(/INSERT\s+INTO\s+verifactu_record\s*\(([^)]*)\)/i)?.[1] ?? '';
      expect(
        columns.split(',').map((c) => c.trim()),
        `${cmd} does not write environment`,
      ).toContain('environment');
    }
  });

  it('the manifest declares the migration that adds the column', () => {
    const manifest = JSON.parse(readFileSync(join(MODULE, 'module.json'), 'utf8'));
    const declared: string[] = manifest.migrations?.postgres ?? [];
    const adding = migrationFiles().find((f) =>
      /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+environment\b/i.test(
        stripComments(readFileSync(join(MIGRATIONS, f), 'utf8')),
      ),
    );
    expect(adding, 'migration adding environment not found').toBeDefined();
    expect(declared).toContain(`migrations/postgres/${adding}`);
  });
});
