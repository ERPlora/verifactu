// GUARD (verifactu#77, ERPlora/hub#1435 + ADR-0320 point 8): **«delegated» is the name of a ROAD,
// never of a certificate this hub holds.**
//
// A hub used to be able to carry a second certificate in a `delegated` slot: ERPlora's own `.p12`,
// handed down by the control plane so we could sign before the AEAT on its behalf. That slot is
// **retired** — the key no longer travels. The hub builds the XML and the fiscal cell transmits it
// with ERPlora's Seal, which never leaves the platform (`CertificateKind` has ONE variant and
// `SLOTS` ONE entry in the core's `crates/runtime/src/certificate.rs`; the SaaS closed its half in
// saas#1435 phase 2 — no model, no endpoint, no columns).
//
// What survives, and must keep surviving, is `ROUTE_DELEGATED`: the transmission ROUTE a hub with
// no own certificate takes. Same word, opposite lifetime — which is exactly why the module's prose
// drifted: this repo told a demo user it «signs with ERPlora's delegated certificate», offered a
// slots table with a `delegated` row, and listed a gap (the `Representante` block) that hub#1460
// closed from the token's signed identity. All of it described a slot that no longer exists.
//
// The contract pinned here, over the surfaces a customer actually reads:
//
//  1. **Locales**: no VALUE says «delegated»/«delegado» in any language. The screen speaks of what
//     happens («ERPlora does it for you»), never of the wire word — so any reappearance of the
//     word in a visible string is the regression coming back.
//  2. **Docs + README**: the word may appear ONLY as the name of the route — qualified by
//     `route`/`road`/`vía`/`ruta` in its own sentence or table cell, or as the literal wire value
//     in backticks (`` `delegated` ``, which `hub.fiscal.transmission` really answers). A
//     «delegated certificate», a slots table row or an «own or delegated» enumeration is a claim
//     about a slot, and the slot is gone.
//  3. **The whole module**: nobody names `set_delegated`, the control plane's retired door.
//
// File-level, like `auto-transmit-removal.test.ts`: what is being pinned is prose, and prose has no
// DB harness. The tests below assert on the CLAIM (a forbidden shape), never on the wording — the
// strings themselves stay free to be rewritten, which is the point of ADR-0055.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const MODULE = join(__dirname, '..', '..');

/** This guard names the forbidden shapes on purpose; it must not sweep itself. */
const SELF = join('ui', 'guards', 'delegated-certificate-slot-retired.test.ts');

/** The retired slot's word, in both languages of this module. */
const DELEGATED = /\bdelegat(?:ed|ing)\b|\bdelegad[oa]s?\b/i;

/** The word that makes it legitimate: it is a ROUTE, not a certificate. */
const ROUTE_WORD = /\b(?:route|road|v[ií]a|ruta)\b/i;

/** Markdown emphasis is decoration: `certificado **delegado**` is the same claim as without it. */
function stripEmphasis(text: string): string {
  return text.replace(/[*_]{1,3}/g, '');
}

/**
 * A doc's smallest self-contained unit of claim: a sentence, or one cell of a markdown table.
 * Splitting on `|` matters — a routes table puts the wire value in one cell and its explanation
 * («ERPlora files … with its own certificate») in the next, and only reading them apart keeps the
 * true row from being read as the false one.
 */
function segments(text: string): string[] {
  return stripEmphasis(text)
    .split(/[.;:!?\n|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Every file under `dir` (recursive), relative to the module root. */
function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(MODULE, dir))) {
    const rel = join(dir, entry);
    if (statSync(join(MODULE, rel)).isDirectory()) out.push(...filesUnder(rel));
    else out.push(rel);
  }
  return out;
}

/** Every leaf string of a locale catalogue, with the key path that reaches it. */
function leafStrings(node: unknown, path: string[] = []): Array<{ key: string; value: string }> {
  if (typeof node === 'string') return [{ key: path.join('.'), value: node }];
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leafStrings(v, [...path, k]));
  }
  return [];
}

const localeFiles = readdirSync(join(MODULE, 'locales')).filter((f) => f.endsWith('.json'));

describe('the delegated certificate SLOT is retired, the delegated ROUTE is not (verifactu#77)', () => {
  it('no visible string names the retired slot, in any language', () => {
    expect(localeFiles.length, 'no locale catalogues found — the sweep would pass on nothing')
      .toBeGreaterThan(1);

    const offenders: string[] = [];
    for (const file of localeFiles) {
      const catalogue = JSON.parse(readFileSync(join(MODULE, 'locales', file), 'utf8'));
      for (const { key, value } of leafStrings(catalogue)) {
        if (DELEGATED.test(value)) offenders.push(`locales/${file} → ${key}`);
      }
    }
    expect(
      offenders,
      `a visible string still speaks of a delegated certificate: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('every locale carries the demo refusal, and it claims no certificate of ERPlora’s', () => {
    // The demo hub is the one that read the lie: it cannot hold an own certificate (the AEAT
    // issues no fictitious one) and it receives none from us either — it transmits through the
    // cell, with `HUB_DEMO` pinning the test environment.
    for (const file of localeFiles) {
      const catalogue = JSON.parse(readFileSync(join(MODULE, 'locales', file), 'utf8'));
      const message = catalogue.ui?.errDemoCertificateLocked;
      expect(typeof message, `locales/${file} has no ui.errDemoCertificateLocked`).toBe('string');
      expect(String(message).trim().length, `locales/${file}: the demo refusal is empty`)
        .toBeGreaterThan(0);
      expect(DELEGATED.test(String(message)), `locales/${file}: the demo refusal names the slot`)
        .toBe(false);
    }
  });

  it('the docs name «delegated» only as the transmission route', () => {
    const docs = [...filesUnder('docs').filter((f) => f.endsWith('.md')), 'README.md'];
    expect(docs.length, 'no docs swept').toBeGreaterThan(1);

    const offenders: string[] = [];
    for (const rel of docs) {
      const raw = readFileSync(join(MODULE, rel), 'utf8');
      raw.split('\n').forEach((line, i) => {
        for (const segment of segments(line)) {
          if (!DELEGATED.test(segment)) continue;
          // The bare wire value in backticks is the contract word the core answers with.
          if (/^`delegated`$/.test(segment)) continue;
          if (ROUTE_WORD.test(segment)) continue;
          offenders.push(`${rel}:${i + 1} → ${segment.slice(0, 80)}`);
        }
      });
    }
    expect(
      offenders,
      `the docs describe a delegated CERTIFICATE, not the route:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('nothing in the module names the control plane’s retired door', () => {
    const swept = ['commands', 'queries', 'schemas', 'ui', 'locales', 'docs', 'migrations', 'tests']
      .flatMap((dir) => filesUnder(dir))
      .concat('module.json', 'README.md')
      .filter((rel) => rel !== SELF);

    const offenders = swept.filter((rel) =>
      /set_delegated/.test(readFileSync(join(MODULE, rel), 'utf8')),
    );
    expect(offenders, `\`set_delegated\` is gone from the core; still named in: ${offenders.join(', ')}`)
      .toEqual([]);
  });
});

// Sanity: the sweep is only worth its green if it can see a positive. `relative`/`sep` keep the
// paths above platform-neutral; this asserts the helpers themselves behave.
describe('the sweep detects what it is looking for', () => {
  it('the route wording passes and the slot wording does not', () => {
    expect(segments('| `delegated` | ERPlora files with its own certificate |')).toContain(
      '`delegated`',
    );
    expect(segments('On the **delegated** road the hub does not sign').some(
      (s) => DELEGATED.test(s) && ROUTE_WORD.test(s),
    )).toBe(true);
    expect(segments('Neither an own nor a **delegated** certificate is available').some(
      (s) => DELEGATED.test(s) && !ROUTE_WORD.test(s),
    )).toBe(true);
    expect(segments('el certificado **delegado** de ERPlora').some(
      (s) => DELEGATED.test(s) && !ROUTE_WORD.test(s),
    )).toBe(true);
    expect(relative(MODULE, join(MODULE, SELF)).split(sep).join('/')).toBe(
      'ui/guards/delegated-certificate-slot-retired.test.ts',
    );
  });
});
