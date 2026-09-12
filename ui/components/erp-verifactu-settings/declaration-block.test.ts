// La ficha de la **declaración responsable** dentro de la pantalla del módulo (art. 13.2 RRSIF).
//
// Vivía en Ajustes → Negocio del hub y se muda aquí: el hub es país-agnóstico y esta ficha solo
// existe donde existe el RD 1007/2023. Es la pantalla que un negocio le enseña a una inspección,
// así que lo que se fija aquí es que no pueda MENTIR: ni inventar datos que las facturas no llevan,
// ni quedarse muda cuando no ha podido leerlos.
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import './erp-verifactu-settings';

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

function stubDeclarationDoor(status: number, body: unknown): void {
  vi.stubGlobal('localStorage', { getItem: () => 's3ss10n' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/api/system/declaration')) {
        return { ok: status >= 200 && status < 300, status, json: async () => body };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }),
  );
}

beforeEach(() => {
  document.body.replaceChildren();
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) =>
      name === 'verifactu.config.get'
        ? [{ issuer_nif: 'B12345678', environment: 'testing', has_certificate: 1 }]
        : [],
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function mount() {
  const el = document.createElement('erp-verifactu-settings');
  document.body.appendChild(el);
  const wc = el as unknown as { updateComplete: Promise<unknown> };
  await wc.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wc.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wc.updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

const text = (el: HTMLElement) => el.shadowRoot?.textContent ?? '';

describe('declaración responsable · la pantalla que se le enseña a una inspección', () => {
  it('pinta los nueve elementos con su NOMBRE LITERAL del registro, no traducido', async () => {
    stubDeclarationDoor(200, {
      version: '1.1.22',
      numeroInstalacion: '00000000-0000-0000-0000-000000000001',
      declarationUrl: 'https://erplora.com/legal/declaracion-responsable/',
      declarationVersion: 'v1',
      sistemaInformatico: FULL_BLOCK,
    });

    const el = await mount();
    const body = text(el);

    // El valor y el nombre del elemento van juntos: es lo que se coteja contra un registro.
    expect(body).toContain('ERPLORA CLOUD SL');
    expect(body).toContain('NombreRazon');
    expect(body).toContain('IdSistemaInformatico');
    expect(body).toContain('NumeroInstalacion');
    expect(body).toContain('00000000-0000-0000-0000-000000000001');
    // Y el enlace al texto firmado, con la versión del texto al lado (art. 13.3: pueden convivir
    // varias, así que «lee la declaración» a secas no dice CUÁL).
    const link = el.shadowRoot?.querySelector<HTMLAnchorElement>('[data-testid="declaration-link"]');
    expect(link?.href).toBe('https://erplora.com/legal/declaracion-responsable/');
    expect(body).toContain('v1');
  });

  it('sin los datos del fabricante lo DICE, y sigue enseñando lo que este hub sí sabe de sí mismo', async () => {
    stubDeclarationDoor(200, {
      version: '1.1.22',
      numeroInstalacion: 'hub-1',
      declarationUrl: 'https://erplora.com/legal/declaracion-responsable/',
      sistemaInformatico: null,
    });

    const el = await mount();

    expect(el.shadowRoot?.querySelector('[data-testid="declaration-pending"]')).toBeTruthy();
    // La versión instalada y el número de instalación son suyos y se enseñan igual.
    expect(text(el)).toContain('1.1.22');
    expect(text(el)).toContain('hub-1');
  });

  // 🔴 Callarse aquí se ve igual que «este hub no tiene nada que declarar», y es la última pantalla
  // donde eso puede pasar.
  it('si no se pudo leer, la ficha lo DICE en vez de quedarse muda', async () => {
    stubDeclarationDoor(503, {});

    const el = await mount();

    expect(el.shadowRoot?.querySelector('[data-testid="declaration-error"]')).toBeTruthy();
  });
});
