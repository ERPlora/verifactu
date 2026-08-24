// GUARD (verifactu#53): «Cadena íntegra» no puede leerse como «los importes están bien».
//
// LA DECISIÓN. `verifactu.chain.validate` **mantiene su contrato criptográfico**: recalcula las
// huellas SHA-256 y verifica el encadenado, y eso es lo único que afirma. No pasa a re-auditar la
// aritmética de los registros, y es deliberado:
//
//  1. Un registro ya sellado es INMUTABLE (RD 1007/2023). Un control que se ejecuta cuando el daño
//     ya está encadenado y remitido no evita nada — informa. La guarda que sí evita el daño es la
//     que impide SELLAR (`013_arithmetic_integrity.sql`), y ésa es la mitad que arregla el bug.
//  2. «Íntegra» significa una cosa concreta ante Hacienda —la cadena de huellas no se ha
//     manipulado— y esa respuesta tiene que seguir siendo legible. Mezclarle un segundo juicio
//     sobre los importes hace que un `valid: false` deje de decir qué pasó.
//
// LO QUE SÍ ERA UN DEFECTO. El texto. «Cadena íntegra: 27 registro(s) verificados» se lee como «27
// registros verificados [como correctos]», y no es eso lo que se verificó — el informe de QA la citó
// justo así, como prueba de que los registros imposibles estaban bien. La respuesta se queda igual —
// pero DICE qué comprobó y qué no.
//
// El mensaje del motor nativo vive en el hub (`hub/crates/verifactu/src/lib.rs`) y va en su propia
// issue. Aquí se fija lo que el módulo POSEE: la etiqueta de la vista de recuperación y sus dos
// catálogos. Este guard existe para que nadie vuelva a dejar la afirmación a medias.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MODULE = join(__dirname, '..', '..');
const RECOVERY = join(MODULE, 'ui', 'components', 'erp-verifactu-recovery', 'erp-verifactu-recovery.ts');

function catalog(locale: string): Record<string, string> {
  return JSON.parse(readFileSync(join(MODULE, 'locales', `${locale}.json`), 'utf8')).ui ?? {};
}

describe('chain.validate says what it verified (verifactu#53)', () => {
  it('both locales carry the note that says what the check covers — and what it does not', () => {
    for (const locale of ['en', 'es']) {
      const note = catalog(locale).recChainScope;
      expect(note, `locales/${locale}.json misses ui.recChainScope`).toBeTruthy();
      // It has to name BOTH halves: what is checked (the fingerprints/chaining) and what is not
      // (the amounts). A note that only says "hashes" still leaves the reader guessing.
      expect(note.toLowerCase()).toMatch(locale === 'es' ? /huella|encadenad/ : /fingerprint|chain/);
      expect(note.toLowerCase()).toMatch(locale === 'es' ? /importe|cuota/ : /amount|quota/);
    }
  });

  it('the verdict itself no longer claims more than it checked', () => {
    for (const locale of ['en', 'es']) {
      const ui = catalog(locale);
      for (const key of ['recChainValid', 'recChainBroken']) {
        expect(ui[key], `locales/${locale}.json misses ui.${key}`).toBeTruthy();
        // The verdict names the fingerprint chain, not a bare "intact"/"broken" that reads as a
        // clean bill of health for the records themselves.
        expect(
          ui[key].toLowerCase(),
          `ui.${key} (${locale}) still reads as a verdict on the records, not on the hash chain`,
          // «huella»/«fingerprint», NO «cadena»/«chain»: el texto viejo ya era «Chain intact ✓» /
          // «Cadena íntegra ✓», así que aceptar la palabra «chain» dejaba la aserción MUDA en
          // inglés — pasaba igual sin el arreglo. Se comprobó con un control negativo: sustituido
          // `locales/en.json` por el de `origin/main`, esta aserción seguía en verde. Lo que
          // distingue al texto nuevo es nombrar la HUELLA, que es lo único que se verificó.
        ).toMatch(locale === 'es' ? /huella/ : /fingerprint/);
      }
    }
  });

  it('the recovery view renders the note next to the verdict', () => {
    const src = readFileSync(RECOVERY, 'utf8');
    expect(src, 'erp-verifactu-recovery does not render ui.recChainScope').toMatch(
      /ui\.recChainScope/,
    );
  });

  it('the module does NOT smuggle an arithmetic audit into the chain check', () => {
    // The manifest keeps `chain.validate` where it was: a read-only native handler. If someone
    // ever wants the audit here, it is a decision to re-take out loud, not a quiet edit.
    const manifest = JSON.parse(readFileSync(join(MODULE, 'module.json'), 'utf8'));
    const cmd = manifest.commands?.['verifactu.chain.validate'];
    expect(cmd?.handler).toEqual({ type: 'native', function: 'validate_chain' });
    expect(cmd?.permission).toBe('verifactu.view_verifactu');
    // And the guard that DOES stop the damage is declared.
    expect(manifest.migrations?.postgres ?? []).toContain(
      'migrations/postgres/013_arithmetic_integrity.sql',
    );
  });
});
