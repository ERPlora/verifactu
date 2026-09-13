// **No module screen declares an <ion-alert> inside its template** (verifactu#112).
//
// A module Web Component renders into a shadow root. Ionic styles `ion-alert` from the document, and
// those styles do not reach a shadow root: the backdrop paints and the dialog does not. On banco-pre
// (2026-09-13) «Recuperar cadena desde la AEAT» turned the whole screen black and the chain could
// never be recovered, while the accessibility tree still listed both buttons.
//
// It is a PATTERN, not a point — the next confirmation anyone writes can bring it back —, so the
// guard reads every screen of the module. A confirmation is created in the document instead
// (`document.createElement('ion-alert')` appended to `document.body`), as `sales` does to void a sale.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'components');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return full.endsWith('.ts') && !full.endsWith('.test.ts') ? [full] : [];
  });
}

/** What the screen RENDERS: a comment that names the element explains, it does not paint it. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('ion-alert in the module screens', () => {
  const files = sources(root);

  it('the guard reads screens (if it sees none, it is not looking)', () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it('no screen declares <ion-alert> in a template: it renders black inside a shadow root', () => {
    const offenders = files
      .filter((file) => /<ion-alert[\s>]/.test(withoutComments(readFileSync(file, 'utf8'))))
      .map((file) => relative(root, file));
    expect(offenders, 'create the alert in the document instead (verifactu#112)').toEqual([]);
  });
});
