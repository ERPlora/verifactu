// **Configuración** — SOLO subidas, separada de Ajustes.
//
// Ajustes son los interruptores del módulo, incluido el de la vía. Esto es lo que cuesta y se hace
// una vez en la vida del negocio, y son exactamente dos cosas, una por vía:
//
//   · **Lo remite ERPlora** — subir el otorgamiento firmado, que es lo que le permite usar su sello.
//   · **Mi certificado**    — subir el `.p12` del negocio.
//
// Abre por la delegada porque es la que no pide certificado y por la que empieza todo el mundo: el
// mismo defecto que Holded, «si no subes el tuyo, usa el suyo».
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import './erp-verifactu-config';

/** Lo que contesta cada puerta del core, por ruta. Se sobrescribe por test. */
let doors: Record<string, { ok: boolean; status: number; body: unknown }> = {};

function stubCore() {
  vi.stubGlobal('localStorage', { getItem: () => 's3ss10n' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      const hit = Object.entries(doors).find(([path]) => String(url).includes(path));
      const reply = hit?.[1] ?? { ok: false, status: 404, body: {} };
      return {
        ok: reply.ok,
        status: reply.status,
        json: async () => reply.body,
        blob: async () => new Blob(['%PDF']),
      };
    }),
  );
}

/** `hub.fiscal.transmission` es una CORE QUERY: va por el dispatcher, no por REST. */
function stubClient(transmission: Record<string, unknown> | null) {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => (name === 'hub.fiscal.transmission' ? [transmission] : []),
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
}

beforeEach(() => {
  document.body.replaceChildren();
  window.history.pushState({}, '', '/m/verifactu/config');
  doors = { '/api/business/certificate': { ok: true, status: 200, body: { ok: true, data: { present: false } } } };
  stubCore();
  stubClient({ transmission_route: 'delegated', representation_status: 'absent' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function mount() {
  const el = document.createElement('erp-verifactu-config');
  document.body.appendChild(el);
  const wc = el as unknown as { updateComplete: Promise<unknown> };
  for (let i = 0; i < 3; i += 1) {
    await wc.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await wc.updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

const testid = (el: HTMLElement, id: string) =>
  el.shadowRoot?.querySelector<HTMLElement>(`[data-testid="${id}"]`) ?? null;

describe('Configuración · las dos pestañas', () => {
  it('abre por la vía delegada, que es la que no pide nada', async () => {
    const el = await mount();

    expect(testid(el, 'config-tab-delegated')).toBeTruthy();
    expect(testid(el, 'config-tab-own')).toBeTruthy();
    expect((el as unknown as { tab: string }).tab).toBe('delegated');
  });

  // 🔴 El deep link se sirve en `connectedCallback` Y en CADA `popstate`, nunca «una vez»: el shell
  // mantiene viva la vista del módulo y no la remonta con la misma ruta, así que el segundo atajo
  // llega a la MISMA instancia del WC solo como `popstate` (medido en flows#57). Una guarda de
  // «ya servido» deja al usuario mirando la pestaña equivocada.
  it('el hash elige la pestaña, al abrir y en cada vuelta atrás', async () => {
    window.history.pushState({}, '', '/m/verifactu/config#own');
    const el = await mount();
    expect((el as unknown as { tab: string }).tab).toBe('own');

    window.history.pushState({}, '', '/m/verifactu/config#delegated');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect((el as unknown as { tab: string }).tab).toBe('delegated');

    // Y la vuelta: la MISMA dirección otra vez tiene que volver a servirse.
    window.history.pushState({}, '', '/m/verifactu/config#own');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect((el as unknown as { tab: string }).tab).toBe('own');
  });

  it('un hash que no conocemos abre la vía delegada en vez de dejar la pantalla en blanco', async () => {
    window.history.pushState({}, '', '/m/verifactu/config#vaporware');
    expect((await mount() as unknown as { tab: string }).tab).toBe('delegated');
  });
});

describe('Configuración › Mi certificado · la subida', () => {
  it('pide el fichero y la contraseña, y nada más', async () => {
    window.history.pushState({}, '', '/m/verifactu/config#own');
    const el = await mount();

    expect(testid(el, 'config-p12-file')).toBeTruthy();
    expect(testid(el, 'config-p12-password')).toBeTruthy();
    // El interruptor de la vía vive en Ajustes: aquí no se decide, aquí se sube.
    expect(testid(el, 'config-own-certificate')).toBeNull();
  });

  // El mismo control de subida que el otorgamiento: `ok-dropzone`, arrastrar o elegir, y el tipo
  // filtrado en el propio control. Un `<input type="file">` nativo pintaba «No file chosen» en
  // inglés en mitad de una pantalla en español.
  it('el certificado se sube con ok-dropzone, que solo acepta .p12 / .pfx', async () => {
    window.history.pushState({}, '', '/m/verifactu/config#own');
    const el = await mount();

    const zone = testid(el, 'config-p12-file');
    expect(zone?.tagName.toLowerCase()).toBe('ok-dropzone');
    expect(zone?.getAttribute('accept')).toContain('.p12');
    expect(zone?.getAttribute('accept')).toContain('.pfx');
    expect(el.shadowRoot?.querySelector('input[type="file"]'), 'queda un input nativo').toBeNull();
  });

  it('lo que se suelta en la zona es lo que se sube', async () => {
    window.history.pushState({}, '', '/m/verifactu/config#own');
    const el = await mount();
    const p12 = new File(['p12'], 'empresa.p12', { type: 'application/x-pkcs12' });

    testid(el, 'config-p12-file')!.dispatchEvent(
      new CustomEvent('ok-change', { detail: { files: [p12] }, bubbles: true, composed: true }),
    );
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    expect((el as unknown as { pickedFile: File | null }).pickedFile).toBe(p12);
  });

  // «Se detecta y todo, si existe»: si el hub ya tiene uno, la pantalla dice de quién es y desde
  // cuándo, y ofrece quitarlo. Sin certificado no hay nada que quitar y el botón no aparece.
  it('describe el certificado que YA hay, y solo entonces ofrece quitarlo', async () => {
    doors['/api/business/certificate'] = {
      ok: true,
      status: 200,
      body: {
        ok: true,
        data: { present: true, subject: 'CN=BAR MANOLO SL', uploaded_at: '2026-09-01T10:00:00Z' },
      },
    };
    window.history.pushState({}, '', '/m/verifactu/config#own');
    const el = await mount();

    expect(el.shadowRoot?.textContent).toContain('CN=BAR MANOLO SL');
    expect(testid(el, 'config-p12-remove')).toBeTruthy();
  });

  it('sin certificado no ofrece quitar nada', async () => {
    window.history.pushState({}, '', '/m/verifactu/config#own');
    const el = await mount();

    expect(testid(el, 'config-p12-remove')).toBeNull();
  });
});

describe('Configuración › Lo remite ERPlora · el otorgamiento', () => {
  it('la pestaña que abre lleva el otorgamiento, no un hueco', async () => {
    const el = await mount();

    expect(testid(el, 'config-grant')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('erp-verifactu-grant')).toBeTruthy();
  });

  // El otorgamiento ya no pide el domicilio: lo lee de Ajustes → Negocio (`GET /api/settings`),
  // que es la fuente única del hub. Esta pantalla es la que se lo pasa.
  it('le pasa al otorgamiento el domicilio fiscal de Ajustes → Negocio', async () => {
    doors['/api/settings'] = {
      ok: true,
      status: 200,
      body: {
        business_street: 'Rúa do Príncipe',
        business_street_number: '10',
        business_city: 'Vigo',
      },
    };
    const el = await mount();
    const grant = el.shadowRoot?.querySelector('erp-verifactu-grant') as unknown as {
      businessStreet: string;
      businessNumber: string;
      businessCity: string;
    };

    expect(grant.businessStreet).toBe('Rúa do Príncipe');
    expect(grant.businessNumber).toBe('10');
    expect(grant.businessCity).toBe('Vigo');
  });
});
