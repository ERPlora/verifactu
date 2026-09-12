// **Toda frase que pintan las pantallas de Configuración existe en los dos idiomas.**
//
// Los tests de componente sustituyen `t()` por «devuelve la clave», que es lo que los hace legibles
// y robustos a un cambio de rótulo — y lo que los deja CIEGOS a una frase que falta en el catálogo:
// la clave sale igual en el test y en la pantalla. Así llegó `grant.privacyRights` a verse cruda,
// en mitad del aviso de protección de datos, con toda la suite en verde.
//
// Es un PATRÓN y no un punto, así que la guardia no nombra frases: lee las claves literales que el
// código de las dos pantallas pide y exige que cada una resuelva a texto en `en` y en `es`. Las que
// se construyen en tiempo de ejecución (los códigos de rechazo, los estados del otorgamiento) se
// recorren desde su propia lista.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const catalogs = {
  en: JSON.parse(readFileSync(join(root, 'locales', 'en.json'), 'utf8')),
  es: JSON.parse(readFileSync(join(root, 'locales', 'es.json'), 'utf8')),
} as Record<string, Record<string, unknown>>;

const SCREENS = [
  'ui/components/erp-verifactu-grant/erp-verifactu-grant.ts',
  'ui/components/erp-verifactu-config/erp-verifactu-config.ts',
];

function resolve(catalog: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    catalog,
  );
}

/** Las claves LITERALES que pide el código: `t('grant.x')`, `t("ui.y")`. */
function literalKeys(source: string): string[] {
  return [...source.matchAll(/\bt\(\s*['"]((?:ui|grant)\.[A-Za-z0-9_.]+)['"]/g)].map((m) => m[1]);
}

describe('las pantallas de Configuración no pintan claves crudas', () => {
  for (const screen of SCREENS) {
    const keys = [...new Set(literalKeys(readFileSync(join(root, screen), 'utf8')))];

    it(`${screen}: la guardia VE claves (si lee cero, no está mirando nada)`, () => {
      expect(keys.length).toBeGreaterThan(10);
    });

    for (const locale of ['en', 'es']) {
      it(`${screen}: cada clave tiene texto en «${locale}»`, () => {
        const missing = keys.filter((k) => typeof resolve(catalogs[locale], k) !== 'string');
        expect(missing, `se verían crudas en ${locale}`).toEqual([]);
      });
    }
  }

  // Las que se arman en ejecución: los códigos de rechazo y los estados del otorgamiento.
  it('cada código de rechazo que conoce el otorgamiento tiene su frase, más `unknown`', () => {
    const source = readFileSync(join(root, SCREENS[0]), 'utf8');
    const block = source.slice(source.indexOf('KNOWN_REFUSALS = new Set(['), source.indexOf(']);', source.indexOf('KNOWN_REFUSALS')));
    const codes = [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(codes.length, 'la guardia no encontró la lista de rechazos').toBeGreaterThan(10);

    for (const locale of ['en', 'es']) {
      const missing = [...codes, 'unknown'].filter(
        (c) => typeof resolve(catalogs[locale], `grant.errors.${c}`) !== 'string',
      );
      expect(missing, `rechazos sin frase en ${locale}`).toEqual([]);
    }
  });

});
