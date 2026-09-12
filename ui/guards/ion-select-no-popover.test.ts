// **Ningún ion-select del módulo abre en `popover`.**
//
// El popover de Ionic se posiciona sobre el control que lo dispara, y un Web Component de módulo
// vive en un shadow root: el selector DNI/NIE del otorgamiento no llegaba a abrirse. Los selectores
// que sí funcionaban (entorno y tipo de prueba, en Ajustes) usan la interfaz por defecto dentro de
// un `ion-item`, que es la forma de la documentación de Ionic.
//
// Es un PATRÓN, no un punto — el próximo selector que alguien escriba puede traerlo de vuelta —, así
// que la guardia lee todas las pantallas del módulo en vez de nombrar una.
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

describe('ion-select en las pantallas del módulo', () => {
  const files = sources(root);

  it('la guardia lee pantallas (si no ve ninguna, no está mirando)', () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it('ningún ion-select usa interface="popover"', () => {
    const offenders = files.flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return [...text.matchAll(/<ion-select\b[^>]*>/gs)]
        .filter((m) => /interface\s*=\s*["']popover["']/.test(m[0]))
        .map(() => relative(root, file));
    });
    expect(offenders, 'un popover dentro del shadow root no se posiciona y el selector no abre').toEqual([]);
  });
});
