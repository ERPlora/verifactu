// La declaración responsable del SIF, leída para la pantalla del dueño (art. 13.2 RRSIF).
//
// Vivía en el shell del hub (`apps/web/src/lib/responsible-declaration.ts`) y se muda aquí: el hub
// es país-agnóstico y una «declaración responsable» solo existe donde existe el RD 1007/2023.
// El dato NO se mueve — lo sirve el core en `GET /api/system/declaration`, que proyecta el MISMO
// bloque `SistemaInformatico` que viaja dentro de cada registro. Aquí solo se lee.
//
// 🔴 Nada se rellena por defecto. Un valor inventado en el navegador haría que la caja certifique
// una identidad que las facturas no llevan, que es exactamente lo que el art. 13 sanciona.
import { describe, expect, it, vi, afterEach } from 'vitest';

import { DECLARATION_FIELDS, fetchResponsibleDeclaration } from './responsible-declaration';

const FULL_BLOCK = {
  NombreRazon: 'ERPLORA CLOUD SL',
  NIF: 'B27593136',
  NombreSistemaInformatico: 'ERPlora Hub',
  IdSistemaInformatico: 'EC',
  Version: '1.1.22',
  NumeroInstalacion: '00000000-0000-0000-0000-000000000001',
  TipoUsoPosibleSoloVerifactu: 'S',
  TipoUsoPosibleMultiOT: 'S',
  IndicadorMultiplesOT: 'N',
};

function respondWith(status: number, body: unknown): void {
  vi.stubGlobal('localStorage', { getItem: () => 's3ss10n' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchResponsibleDeclaration', () => {
  it('los nueve elementos van en el ORDEN del XSD, que es el orden en que se leen contra un registro', () => {
    expect([...DECLARATION_FIELDS]).toEqual([
      'NombreRazon',
      'NIF',
      'NombreSistemaInformatico',
      'IdSistemaInformatico',
      'Version',
      'NumeroInstalacion',
      'TipoUsoPosibleSoloVerifactu',
      'TipoUsoPosibleMultiOT',
      'IndicadorMultiplesOT',
    ]);
  });

  it('lee el bloque entero, la versión del binario y la referencia del texto firmado', async () => {
    respondWith(200, {
      version: '1.1.22',
      numeroInstalacion: '00000000-0000-0000-0000-000000000001',
      declarationUrl: 'https://erplora.com/legal/declaracion-responsable/',
      declarationVersion: 'v1',
      sistemaInformatico: FULL_BLOCK,
    });

    const d = await fetchResponsibleDeclaration();

    expect(d.version).toBe('1.1.22');
    expect(d.declarationVersion).toBe('v1');
    expect(d.sistemaInformatico).toEqual(FULL_BLOCK);
  });

  // Los nueve o ninguno: la misma regla de todo-o-nada que el runtime aplica a los datos del
  // fabricante. Un bloque a medias no es media declaración, es una declaración equivocada.
  it('un bloque INCOMPLETO no es media declaración: se lee como ausente', async () => {
    const { NIF: _drop, ...incomplete } = FULL_BLOCK;
    respondWith(200, {
      version: '1.1.22',
      numeroInstalacion: 'hub-1',
      declarationUrl: 'https://erplora.com/legal/declaracion-responsable/',
      sistemaInformatico: incomplete,
    });

    expect((await fetchResponsibleDeclaration()).sistemaInformatico).toBeNull();
  });

  // Un espacio en blanco no es una versión: una referencia recortada a nada es una que el plano de
  // control no nombró, y la ficha tiene que callarse en vez de pintar un rótulo vacío.
  it('una referencia en blanco queda AUSENTE, no vacía', async () => {
    respondWith(200, {
      version: '1.1.22',
      numeroInstalacion: 'hub-1',
      declarationUrl: 'https://erplora.com/legal/declaracion-responsable/',
      declarationVersion: '   ',
      sistemaInformatico: FULL_BLOCK,
    });

    expect(await fetchResponsibleDeclaration()).not.toHaveProperty('declarationVersion');
  });

  // 🔴 Un rechazo NUNCA se resuelve en una declaración vacía: una ficha que se quedara muda se ve
  // igual que un hub que no tiene nada que declarar, y ésta es justo la pantalla que se le enseña a
  // una inspección. Quien llama pinta su propio «no se pudo cargar».
  it('si la puerta no contesta, LANZA — callarse aquí es mentir a una inspección', async () => {
    respondWith(503, {});
    await expect(fetchResponsibleDeclaration()).rejects.toThrow();
  });

  it('un cuerpo sin `declarationUrl` tampoco pasa por declaración', async () => {
    respondWith(200, { version: '1.1.22', sistemaInformatico: FULL_BLOCK });
    await expect(fetchResponsibleDeclaration()).rejects.toThrow();
  });
});
