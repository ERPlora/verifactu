// El otorgamiento de representación (Anexo I del acuerdo de colaboración social 017), mudado del
// shell del hub a este módulo: ERPlora remite los registros VERI*FACTU EN NOMBRE del obligado, y
// eso exige su consentimiento firmado. Nada de esto existe fuera de España, así que no es del hub.
//
// 🔴 Las tres llamadas van al RUNTIME, nunca al SaaS: el token de máquina del hub es secreto suyo y
// no cruza a este navegador (ADR-0003). El runtime pone la cabecera y reenvía; este lado no guarda
// ni el documento firmado ni la copia del documento de identidad.
import { describe, expect, it, vi, afterEach } from 'vitest';

import {
  GRANT_MODEL_PATH,
  GRANT_PATH,
  RepresentationGrantError,
  downloadGrantModel,
  getGrant,
  postGrant,
} from './representation-grant';

interface Call {
  url: string;
  init: RequestInit;
}

function stub(reply: unknown, calls: Call[] = []): Call[] {
  vi.stubGlobal('localStorage', { getItem: () => 's3ss10n' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string, init: RequestInit) => {
      calls.push({ url, init });
      return reply;
    }),
  );
  return calls;
}

const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

function capture(extra: Record<string, unknown> = {}) {
  return {
    obligado_nif: 'B12345674',
    obligado_name: 'Bar Manolo SL',
    signer_nif: '12345678Z',
    signer_name: 'Manolo García',
    document_type: 'dni' as const,
    signed_document: new File(['%PDF'], 'modelo.pdf', { type: 'application/pdf' }),
    dni_copy: new File(['img'], 'dni.jpg', { type: 'image/jpeg' }),
    ...extra,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getGrant', () => {
  it('lee el estado y el motivo del rechazo, que es lo único accionable de un «rechazado»', async () => {
    const calls = stub(
      okJson({
        status: 'rechazado',
        at: '2026-09-10',
        rejected_reason: 'la firma no coincide con el NIF',
        signature_kind: 'handwritten',
        document_type: 'dni',
      }),
    );

    const state = await getGrant();

    expect(calls[0].url).toBe(GRANT_PATH);
    expect(state.status).toBe('rechazado');
    expect(state.rejected_reason).toBe('la firma no coincide con el NIF');
  });

  // 🔴 «No lo sé» y «no has firmado» no son lo mismo. Degradar a `absent` manda a firmar otra vez
  // un otorgamiento que el negocio ya tiene.
  it('si el runtime no contesta LANZA, en vez de decir que no hay otorgamiento', async () => {
    stub({ ok: false, status: 0, json: async () => ({}) });
    await expect(getGrant()).rejects.toBeInstanceOf(RepresentationGrantError);
  });

  it('el rechazo conserva su código y el status del plano de control', async () => {
    stub({
      ok: false,
      status: 409,
      json: async () => ({ ok: false, error: 'cloud_rejected', status_code: 404 }),
    });

    await expect(getGrant()).rejects.toMatchObject({ code: 'cloud_rejected', statusCode: 404 });
  });
});

describe('downloadGrantModel', () => {
  it('devuelve el PDF pre-relleno; los diez huecos viajan en el cuerpo', async () => {
    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    const calls = stub({ ok: true, status: 200, blob: async () => pdf });

    const blob = await downloadGrantModel({
      obligado_nif: 'B12345674',
      obligado_name: 'Bar Manolo SL',
      obligado_municipio: 'Vigo',
      obligado_via: 'Rúa do Príncipe',
      obligado_numero: '10',
      signer_nif: '12345678Z',
      signer_name: 'Manolo García',
      signer_municipio: '',
      signer_via: '',
      signer_numero: '',
    });

    expect(blob).toBe(pdf);
    expect(calls[0].url).toBe(GRANT_MODEL_PATH);
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body as string).obligado_municipio).toBe('Vigo');
  });

  it('un rechazo llega con su código, no como un PDF roto', async () => {
    stub({
      ok: false,
      status: 404,
      json: async () => ({ ok: false, error: 'cloud_rejected', status_code: 404 }),
    });

    await expect(
      downloadGrantModel({
        obligado_nif: '',
        obligado_name: '',
        obligado_municipio: '',
        obligado_via: '',
        obligado_numero: '',
        signer_nif: '',
        signer_name: '',
        signer_municipio: '',
        signer_via: '',
        signer_numero: '',
      }),
    ).rejects.toMatchObject({ code: 'cloud_rejected', statusCode: 404 });
  });
});

describe('postGrant', () => {
  it('sube el modelo firmado y la copia del documento como multipart', async () => {
    const calls = stub(okJson({ status: 'pendiente', at: '2026-09-12' }));

    const status = await postGrant(capture());

    expect(status).toEqual({ status: 'pendiente', at: '2026-09-12' });
    expect(calls[0].url).toBe(GRANT_PATH);
    const form = calls[0].init.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('obligado_nif')).toBe('B12345674');
    expect((form.get('signed_document') as File).name).toBe('modelo.pdf');
    expect((form.get('dni_copy') as File).name).toBe('dni.jpg');
    // El navegador pone el `boundary`; escribir el `Content-Type` a mano lo borra y la subida se
    // pierde entera.
    expect((calls[0].init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  // Un adjunto en blanco es lo que hace que el revisor no sepa si falta o si falló al subirse.
  it('lo que no se adjuntó NO viaja como parte vacía', async () => {
    const calls = stub(okJson({ status: 'pendiente', at: '2026-09-12' }));

    await postGrant(capture());

    const form = calls[0].init.body as FormData;
    expect(form.has('signature_sample')).toBe(false);
    expect(form.has('representation_proof')).toBe(false);
  });

  it('la muestra de firma y el justificante viajan cuando SÍ se adjuntan', async () => {
    const calls = stub(okJson({ status: 'pendiente', at: '2026-09-12' }));

    await postGrant(
      capture({
        signature_sample: new File(['s'], 'firma.png', { type: 'image/png' }),
        representation_proof: new File(['p'], 'poder.pdf', { type: 'application/pdf' }),
      }),
    );

    const form = calls[0].init.body as FormData;
    expect((form.get('signature_sample') as File).name).toBe('firma.png');
    expect((form.get('representation_proof') as File).name).toBe('poder.pdf');
  });

  it('un rechazo de la subida conserva su código para que la pantalla diga QUÉ cambiar', async () => {
    stub({
      ok: false,
      status: 422,
      json: async () => ({ ok: false, error: 'signed_document_not_pdf' }),
    });

    await expect(postGrant(capture())).rejects.toMatchObject({
      code: 'signed_document_not_pdf',
    });
  });
});
