// The seam this module already used for the gateway identity, widened to carry what the
// representation grant needs: a JSON body, a multipart upload and a PDF that comes back as bytes.
//
// It is the same seam and the same caveat as `gateway-identity.ts` documents: the SDK has no door
// for core REST, the screen runs inside the shell's page, and the session it needs is the one the
// shell keeps. One implementation on purpose — two copies of «call a core route» is how one of them
// forgets the session header and fails only for the customer who locked their browser down.
import { describe, expect, it, vi, afterEach } from 'vitest';

import { coreFetch, coreFetchBlob, HUB_SESSION_KEY, MODULE_HEADER, MODULE_ID } from './core-fetch';

function stubFetch(impl: (url: string, init: RequestInit) => unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(impl));
}

function stubSession(token: string | null): void {
  const store = new Map<string, string>();
  if (token !== null) store.set(HUB_SESSION_KEY, token);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('coreFetch', () => {
  it('lleva la sesión que guarda el shell, y el módulo no la toca para nada más', async () => {
    stubSession('s3ss10n');
    let seen: RequestInit | undefined;
    stubFetch((_url, init) => {
      seen = init;
      return { ok: true, status: 200, json: async () => ({ status: 'vigente' }) };
    });

    const reply = await coreFetch('/api/fiscal/representation-grant');

    expect(reply.ok).toBe(true);
    expect(reply.body).toEqual({ status: 'vigente' });
    expect((seen?.headers as Record<string, string>)['X-Hub-Session']).toBe('s3ss10n');
    expect(seen?.credentials).toBe('same-origin');
  });

  // 🔴 La llamada NOMBRA a su módulo. Es lo que lee el gate del runtime
  // (`flows_api::require_module_capability`): quien no nombra módulo pasa —el shell no es un
  // módulo—, y quien lo nombra necesita la capability declarada Y concedida. Sin esta cabecera la
  // puerta del certificado quedaría abierta para cualquier pantalla de módulo, que es exactamente
  // lo que el gate vino a cerrar.
  it('la llamada nombra a su módulo, que es lo que hace que el gate del runtime muerda', async () => {
    stubSession('s');
    let seen: RequestInit | undefined;
    stubFetch((_url, init) => {
      seen = init;
      return { ok: true, status: 200, json: async () => ({}) };
    });

    await coreFetch('/api/business/certificate');

    expect((seen?.headers as Record<string, string>)[MODULE_HEADER]).toBe(MODULE_ID);
    expect(MODULE_ID, 'el id tiene que ser el del manifest, o el gate mira otra concesión').toBe('verifactu');
  });

  it('un navegador sin `localStorage` no rompe la pantalla: se llama sin cabecera', async () => {
    vi.stubGlobal('localStorage', undefined);
    let seen: RequestInit | undefined;
    stubFetch((_url, init) => {
      seen = init;
      return { ok: true, status: 200, json: async () => ({}) };
    });

    await coreFetch('/api/system/declaration');

    expect((seen?.headers as Record<string, string>)['X-Hub-Session']).toBeUndefined();
  });

  it('un cuerpo JSON viaja con su `Content-Type`; un FormData NO lo lleva puesto a mano', async () => {
    stubSession('s');
    const calls: RequestInit[] = [];
    stubFetch((_url, init) => {
      calls.push(init);
      return { ok: true, status: 200, json: async () => ({}) };
    });

    await coreFetch('/a', { method: 'POST', json: { obligado_nif: 'B12345674' } });
    const form = new FormData();
    form.append('signed_document', new Blob(['x']), 'modelo.pdf');
    await coreFetch('/b', { method: 'POST', form });

    expect((calls[0].headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(calls[0].body).toBe(JSON.stringify({ obligado_nif: 'B12345674' }));
    // 🔴 Poner `Content-Type: multipart/form-data` a mano rompe la subida: sin el `boundary` que
    // genera el navegador, el runtime no puede separar las partes y el modelo firmado se pierde.
    expect((calls[1].headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(calls[1].body).toBe(form);
  });

  it('la red caída es una RESPUESTA con status 0, no una excepción que nadie captura', async () => {
    stubSession('s');
    stubFetch(() => {
      throw new TypeError('Failed to fetch');
    });

    const reply = await coreFetch('/api/fiscal/representation-grant');

    expect(reply).toEqual({ ok: false, status: 0, body: {} });
  });

  it('un cuerpo que no es JSON (la página del proxy) deja `body` vacío y conserva el status', async () => {
    stubSession('s');
    stubFetch(() => ({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    }));

    expect(await coreFetch('/x')).toEqual({ ok: false, status: 502, body: {} });
  });
});

describe('coreFetchBlob', () => {
  it('devuelve los BYTES del modelo oficial, que es un PDF y no un JSON', async () => {
    stubSession('s');
    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    stubFetch(() => ({ ok: true, status: 200, blob: async () => pdf }));

    const reply = await coreFetchBlob('/api/fiscal/representation-grant/model', {
      obligado_nif: 'B12345674',
    });

    expect(reply.ok).toBe(true);
    expect(reply.blob).toBe(pdf);
  });

  it('un rechazo NO se lee como PDF: se lee su código, que es lo que la pantalla traduce', async () => {
    stubSession('s');
    stubFetch(() => ({
      ok: false,
      status: 404,
      json: async () => ({ ok: false, error: 'cloud_rejected', status_code: 404 }),
    }));

    const reply = await coreFetchBlob('/api/fiscal/representation-grant/model', {});

    expect(reply.ok).toBe(false);
    expect(reply.status).toBe(404);
    expect(reply.blob).toBeNull();
    expect(reply.body).toEqual({ ok: false, error: 'cloud_rejected', status_code: 404 });
  });
});
