// GUARD (ADR-0202 phase 1, R3): active module = the record is ALWAYS transmitted.
//
// `auto_transmit` was a user-facing setting: at `0` the record was only enqueued in the
// contingency queue and transmission was deferred to a manual/scheduled retry. That contradicts
// the VeriFactu FAQ §5 — once the obliged party operates as VERI*FACTU, transmission is not a
// user decision. The contract fixed here: the setting disappears from the whole module surface
// (command, query, schema, UI, locales) and a migration drops the column, so the crate's
// `int_field(config, "auto_transmit", 1)` read falls back to its default (transmit) even before
// the paired hub PR removes the dead read.
//
// Same file-level spirit as `environment-chain-scope.test.ts` (this repo has no DB harness):
//  1. a NEW migration drops the column (001 is published → append-only, it keeps the
//     historical definition);
//  2. the manifest declares that migration;
//  3. no source surface (commands/, queries/, schemas/, ui/, locales/, module.json) still
//     references the setting.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

/** Every file under `dir` (recursive), as paths relative to the module root. */
function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(MODULE, dir))) {
    const rel = join(dir, entry);
    if (statSync(join(MODULE, rel)).isDirectory()) out.push(...filesUnder(rel));
    else out.push(rel);
  }
  return out;
}

describe('auto_transmit removal (ADR-0202 R3)', () => {
  it('exactly one migration drops the auto_transmit column, and it is not published 001', () => {
    const dropping = migrationFiles().filter((f) =>
      /ALTER\s+TABLE\s+verifactu_config\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+auto_transmit\b/i.test(
        stripComments(readFileSync(join(MIGRATIONS, f), 'utf8')),
      ),
    );
    expect(dropping, 'no migration drops `auto_transmit` from verifactu_config').toHaveLength(1);
    // Append-only: the drop arrives in a NEW file, never by editing published migrations.
    expect(dropping[0]).not.toBe('001_init.sql');
  });

  it('the manifest declares the migration that drops the column', () => {
    const manifest = JSON.parse(readFileSync(join(MODULE, 'module.json'), 'utf8'));
    const declared: string[] = manifest.migrations?.postgres ?? [];
    const dropping = migrationFiles().find((f) =>
      /DROP\s+COLUMN\s+IF\s+EXISTS\s+auto_transmit\b/i.test(
        stripComments(readFileSync(join(MIGRATIONS, f), 'utf8')),
      ),
    );
    expect(dropping, 'migration dropping auto_transmit not found').toBeDefined();
    expect(declared).toContain(`migrations/postgres/${dropping}`);
  });

  it('config_save (command + schema) no longer accepts the setting', () => {
    const sql = stripComments(readFileSync(join(MODULE, 'commands', 'config_save.sql'), 'utf8'));
    expect(sql).not.toMatch(/auto_transmit/i);
    const schema = JSON.parse(readFileSync(join(MODULE, 'schemas', 'config_save.json'), 'utf8'));
    expect(Object.keys(schema.properties ?? {})).not.toContain('auto_transmit');
  });

  it('config_get no longer exposes the setting', () => {
    const sql = stripComments(readFileSync(join(MODULE, 'queries', 'config_get.sql'), 'utf8'));
    expect(sql).not.toMatch(/auto_transmit/i);
  });

  it('no source surface still references auto_transmit (only migrations keep history)', () => {
    const surfaces = [
      ...filesUnder('commands'),
      ...filesUnder('queries'),
      ...filesUnder('schemas'),
      ...filesUnder('ui'),
      ...filesUnder('locales'),
      'module.json',
    ].filter((f) => f !== join('ui', 'guards', 'auto-transmit-removal.test.ts'));
    const offenders = surfaces.filter((f) =>
      /auto_?transmit/i.test(readFileSync(join(MODULE, f), 'utf8')),
    );
    expect(offenders, `auto_transmit still referenced in: ${offenders.join(', ')}`).toEqual([]);
  });
});
