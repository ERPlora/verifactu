// GUARD (verifactu#49): the taxpayer (obligado tributario) has ONE source — the hub.
//
// The settings screen used to ask AGAIN for the issuer tax ID and company name that the hub
// already holds in Settings → Business (`hub_settings`, ADR-0061), and it showed them EMPTY
// behind a placeholder that reads exactly like a real value (`B12345678` / `Mi Empresa SL`).
// Two failures came out of that:
//
//  1. **Two truths.** A tax ID typed here that differs from the hub's means the invoice is
//     ISSUED on behalf of one taxpayer and DECLARED on behalf of another. The placeholder was
//     an active invitation to type precisely that.
//  2. **VeriFactu could be switched on with no taxpayer at all.** `config.get` came back
//     `{"enabled":1,"issuer_nif":"","issuer_name":""}` and nothing complained — while the
//     engine's `resolve_nif` (hub `crates/verifactu`) needs that column to walk the chain, so
//     `chain.validate`, `recovery.*` and `diagnostics.run` had no anchor.
//
// The contract pinned here:
//  1. `config_get.sql` resolves the issuer from the hub's global fiscal identity
//     (`:business_tax_id` / `:business_legal_name`) when the module's own column is empty —
//     the runtime injects both into every query and command (ADR-0061), so the single source
//     was available and unused;
//  2. `config_save.sql` PERSISTS that effective issuer, so the column the engine reads stops
//     drifting from the hub — the module keeps its column (the engine reads it) but never owns
//     the value;
//  3. a gate assert refuses a save that leaves VeriFactu ENABLED with an empty taxpayer;
//  4. the UI shows the identity read-only with a link to where it is actually changed, and no
//     longer carries a fake tax ID as a placeholder;
//  5. `setup.route` and the screen's own link point at `/settings#tax` — the Business tab, where
//     both the fiscal identity and the certificate live — instead of `/settings`, which lands on
//     General (country, currency, language, theme) with nothing to do about VeriFactu.
//
// Same spirit as `environment-one-way.test.ts`: this repo has no DB harness, so the behavioural
// enforcement is the Postgres CHECK on `verifactu__gate`, and this guard pins the contract at the
// file level.
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
  setup: { route: string };
  commands: Record<string, { sql?: string[] }>;
};

const settingsUi = read('ui', 'components', 'erp-verifactu-settings', 'erp-verifactu-settings.ts');

describe('the taxpayer comes from the hub, not from a second form', () => {
  it('config_get falls back to the hub global fiscal identity', () => {
    const sql = stripComments(read('queries', 'config_get.sql'));
    // The single source (ADR-0061), injected by the runtime into every query.
    expect(sql).toMatch(/:business_tax_id/);
    expect(sql).toMatch(/:business_legal_name/);
    // Fallback, not override: a module column with a value still wins (the engine reads it).
    expect(sql).toMatch(/COALESCE\s*\(\s*NULLIF\s*\(\s*vc\.issuer_nif[^)]*\)\s*,\s*:business_tax_id\s*\)/i);
    expect(sql).toMatch(/COALESCE\s*\(\s*NULLIF\s*\(\s*vc\.issuer_name[^)]*\)\s*,\s*:business_legal_name\s*\)/i);
  });

  it('config_save persists the effective issuer so the engine stops drifting from the hub', () => {
    const sql = stripComments(read('commands', 'config_save.sql'));
    expect(sql).toMatch(/COALESCE\s*\(\s*NULLIF\s*\(\s*:issuer_nif[^)]*\)\s*,\s*:business_tax_id\s*\)/i);
    expect(sql).toMatch(/COALESCE\s*\(\s*NULLIF\s*\(\s*:issuer_name[^)]*\)\s*,\s*:business_legal_name\s*\)/i);
  });
});

describe('VeriFactu cannot be enabled without a taxpayer', () => {
  it('the assert refuses an enabled config with an empty issuer', () => {
    const sql = stripComments(read('commands', '_config_save_issuer_assert.sql'));
    // It writes the gate row whose CHECK (ok = 1) rolls the transaction back.
    expect(sql).toMatch(/INSERT\s+INTO\s+verifactu__gate/i);
    expect(sql).toMatch(/config_save_requires_issuer/);
    // It looks at the PERSISTED state of THIS hub, after the upsert — not at the raw payload.
    expect(sql).toMatch(/FROM\s+verifactu_config/i);
    expect(sql).toMatch(/hub_id\s*=\s*:hub_id/i);
    expect(sql).toMatch(/enabled/i);
    expect(sql).toMatch(/issuer_nif/i);
  });

  it('the command chains upsert → go-live assert → issuer assert → gate cleanup', () => {
    expect(manifest.commands['verifactu.config.save'].sql).toEqual([
      'commands/config_save.sql',
      'commands/_config_save_assert.sql',
      'commands/_config_save_issuer_assert.sql',
      'commands/_gate_clear.sql',
    ]);
  });

  it('the UI maps the refusal to a friendly message, in both locales', () => {
    expect(settingsUi).toMatch(/errIssuerRequired/);
    for (const locale of ['en', 'es']) {
      const catalog = JSON.parse(read('locales', `${locale}.json`)) as Record<string, Record<string, string>>;
      expect(catalog.ui.errIssuerRequired ?? '').not.toBe('');
    }
  });
});

describe('the screen stops inviting a second, divergent taxpayer', () => {
  it('no fake tax ID / company name is offered as a placeholder', () => {
    expect(settingsUi).not.toMatch(/B12345678/);
    expect(settingsUi).not.toMatch(/Mi Empresa SL/);
  });

  it('the issuer is shown read-only, not as an editable input', () => {
    // The two `ion-input`s that wrote `issuer_nif` / `issuer_name` are gone: the value is not
    // owned here, so it cannot be typed here.
    expect(settingsUi).not.toMatch(/set\(\s*'issuer_nif'/);
    expect(settingsUi).not.toMatch(/set\(\s*'issuer_name'/);
    // …and it is displayed with a pointer to where it IS changed.
    expect(settingsUi).toMatch(/obligadoFromHub/);
    for (const locale of ['en', 'es']) {
      const catalog = JSON.parse(read('locales', `${locale}.json`)) as Record<string, Record<string, string>>;
      expect(catalog.ui.obligadoFromHub ?? '').not.toBe('');
    }
  });
});

describe('the pointers land on the tab that actually has the fix', () => {
  it('setup.route points at the Business tab, not General', () => {
    expect(manifest.setup.route).toBe('/settings#tax');
  });

  it('the screen link points at the Business tab too', () => {
    expect(settingsUi).toMatch(/'\/settings#tax'/);
    expect(settingsUi).not.toMatch(/pushState\(\{\}, '', '\/settings'\)/);
  });
});
