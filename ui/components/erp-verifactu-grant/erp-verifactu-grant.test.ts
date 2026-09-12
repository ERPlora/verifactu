// **El otorgamiento de representación**, en la pantalla de Configuración de este módulo.
//
// Lo que estos tests fijan son las reglas que hacen que el trámite no se atasque, y ninguna es
// cosmética — cada una costó una vuelta con una persona de ERPlora desempatando a mano:
//
//  · el estado se ENSEÑA antes que nada, y «no lo sé» no se pinta como «no has firmado»;
//  · el formulario NO se ofrece mientras está vigente o en revisión;
//  · la muestra de firma solo con NIE, y el representante legal + su justificante solo si el
//    obligado es una SOCIEDAD;
//  · el motivo del rechazo se enseña: es lo único accionable de un «devuelto».
//
// Y dos que vienen de Ioan (13/09):
//
//  · **los datos del negocio NO se piden aquí.** NIF, razón social y domicilio fiscal ya viven en
//    Ajustes → Negocio, que es la fuente única del hub (ADR-0061); pedirlos otra vez era invitar a
//    firmar un modelo con un domicilio distinto del de las facturas. Si falta algo, se dice y se
//    lleva allí;
//  · **los adjuntos van por `ok-dropzone`**, el componente de OutfitKit que ya existe: arrastrar y
//    soltar o pulsar, con el tipo filtrado en el propio control.
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import './erp-verifactu-grant';

let grantDoor: { ok: boolean; status: number; body: unknown };
let calls: Array<{ url: string; init: RequestInit }>;

function stubCore() {
  calls = [];
  vi.stubGlobal('localStorage', { getItem: () => 's3ss10n' });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string, init: RequestInit) => {
      calls.push({ url, init });
      return {
        ok: grantDoor.ok,
        status: grantDoor.status,
        json: async () => grantDoor.body,
        blob: async () => new Blob(['%PDF'], { type: 'application/pdf' }),
      };
    }),
  );
  // La descarga crea un object URL; happy-dom no lo trae.
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }));
}

beforeEach(() => {
  document.body.replaceChildren();
  grantDoor = { ok: true, status: 200, body: { status: 'absent', at: '', rejected_reason: '' } };
  stubCore();
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
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

interface Business {
  nif: string;
  name: string;
  city: string;
  street: string;
  number: string;
}

const AUTONOMO: Business = { nif: '12345678Z', name: 'Manolo García', city: 'Vigo', street: 'Rúa do Príncipe', number: '10' };
const SOCIEDAD: Business = { nif: 'B12345674', name: 'Bar Manolo SL', city: 'Vigo', street: 'Rúa do Príncipe', number: '10' };

type GrantEl = HTMLElement & {
  obligadoNif: string;
  obligadoName: string;
  businessCity: string;
  businessStreet: string;
  businessNumber: string;
  updateComplete: Promise<unknown>;
  shadowRoot: ShadowRoot;
};

/** El negocio llega de fuera: es la identidad fiscal del hub, fuente única (ADR-0061). */
async function mount(business: Business = AUTONOMO): Promise<GrantEl> {
  const el = document.createElement('erp-verifactu-grant') as GrantEl;
  el.obligadoNif = business.nif;
  el.obligadoName = business.name;
  el.businessCity = business.city;
  el.businessStreet = business.street;
  el.businessNumber = business.number;
  document.body.appendChild(el);
  for (let i = 0; i < 3; i += 1) {
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await el.updateComplete;
  return el;
}

const testid = (el: HTMLElement, id: string) =>
  el.shadowRoot?.querySelector<HTMLElement>(`[data-testid="${id}"]`) ?? null;

/** Lo que hace `ok-dropzone` cuando el usuario suelta o elige un fichero. */
async function drop(el: GrantEl, id: string, file: File) {
  const zone = testid(el, id);
  expect(zone, `no hay zona de subida «${id}»`).toBeTruthy();
  zone!.dispatchEvent(new CustomEvent('ok-change', { detail: { files: [file] }, bubbles: true, composed: true }));
  await el.updateComplete;
}

const pdf = (name = 'modelo.pdf') => new File(['%PDF'], name, { type: 'application/pdf' });
const jpg = (name = 'dni.jpg') => new File(['img'], name, { type: 'image/jpeg' });

describe('el estado, antes que nada', () => {
  it('sin otorgamiento lo dice y ofrece el trámite', async () => {
    const el = await mount();

    expect(el.shadowRoot.textContent).toContain('grant.stateAbsent');
    expect(testid(el, 'grant-download-model')).toBeTruthy();
  });

  // 🔴 «No lo sé» y «no has firmado» no son lo mismo: enseñar el segundo cuando pasa el primero
  // manda a alguien a firmar un otorgamiento que ya tiene.
  it('si el runtime no contesta dice que NO SE SABE, no que falte firmar', async () => {
    grantDoor = { ok: false, status: 0, body: {} };
    const el = await mount();

    expect(el.shadowRoot.textContent).toContain('grant.stateUnreachable');
    expect(el.shadowRoot.textContent).not.toContain('grant.stateAbsent');
  });

  it('vigente NO pide nada', async () => {
    grantDoor = { ok: true, status: 200, body: { status: 'vigente', at: '2026-09-01' } };
    const el = await mount();

    expect(el.shadowRoot.textContent).toContain('grant.stateVigente');
    expect(testid(el, 'grant-download-model')).toBeNull();
    expect(testid(el, 'grant-submit')).toBeNull();
  });

  it('en revisión tampoco pide nada', async () => {
    grantDoor = { ok: true, status: 200, body: { status: 'pendiente', at: '2026-09-10' } };
    const el = await mount();

    expect(el.shadowRoot.textContent).toContain('grant.statePendiente');
    expect(testid(el, 'grant-submit')).toBeNull();
  });

  it('un rechazo enseña el MOTIVO, que es lo único accionable', async () => {
    grantDoor = {
      ok: true,
      status: 200,
      body: { status: 'rechazado', at: '2026-09-11', rejected_reason: 'la firma no coincide' },
    };
    const el = await mount();

    expect(testid(el, 'grant-rejected-reason')?.textContent).toContain('la firma no coincide');
    expect(testid(el, 'grant-submit')).toBeTruthy();
  });
});

describe('cada estado del otorgamiento con su tono (verifactu#41, mudado de Ajustes)', () => {
  // Estas filas vivían en Ajustes como píldoras de la vía; ahora el estado lo pinta este panel, y la
  // regla es la misma: vigente en verde, en revisión informativo, devuelto o revocado en rojo, y sin
  // firmar en aviso. «Nunca preguntado» (`''`) y «preguntado, no hay» (`absent`) no son lo mismo
  // para el runtime, pero aquí `''` es «no se sabe» y tiene su propia frase.
  it.each([
    ['vigente', 'success'],
    ['pendiente', 'info'],
    ['rechazado', 'danger'],
    ['revocado', 'danger'],
    ['absent', 'warning'],
  ])('`%s` se pinta con tono %s', async (status, tone) => {
    grantDoor = { ok: true, status: 200, body: { status, at: '2026-09-01' } };
    const el = await mount();

    const feedback = testid(el, `grant-state-${status}`);
    expect(feedback, `el estado \`${status}\` no se pinta`).toBeTruthy();
    expect(feedback!.getAttribute('tone')).toBe(tone);
  });
});

describe('los datos del negocio NO se piden aquí', () => {
  it('no hay bloque «Tu negocio»: ni NIF, ni razón social, ni domicilio', async () => {
    const el = await mount();

    for (const id of [
      'grant-party-obligado',
      'grant-obligado-nif',
      'grant-obligado-name',
      'grant-obligado-municipio',
      'grant-obligado-via',
      'grant-obligado-numero',
    ]) {
      expect(testid(el, id), `el otorgamiento vuelve a pedir «${id}»: eso vive en Ajustes → Negocio`).toBeNull();
    }
  });

  // Sin domicilio el modelo sale con la línea de puntos y hay que rellenarlo a mano: se puede, pero
  // es el camino por el que el domicilio firmado acaba sin coincidir con el de las facturas. Se dice
  // y se lleva a donde se arregla, que es un sitio y no dos.
  it('si al negocio le falta domicilio lo DICE y lleva a Ajustes → Negocio', async () => {
    const el = await mount({ ...AUTONOMO, city: '', number: '' });

    const aviso = testid(el, 'grant-business-missing');
    expect(aviso, 'faltan datos del negocio y la pantalla no lo dice').toBeTruthy();
    const enlace = testid(el, 'grant-business-fix');
    expect(enlace).toBeTruthy();
    enlace!.click();
    expect(window.location.pathname + window.location.hash).toBe('/settings#business');
  });

  it('con el negocio completo no hay aviso', async () => {
    expect(testid(await mount(), 'grant-business-missing')).toBeNull();
  });

  it('el modelo sale con el domicilio de Ajustes → Negocio, no con uno tecleado aquí', async () => {
    const el = await mount();
    await (el as unknown as { downloadModel: () => Promise<void> }).downloadModel();

    const modelo = calls.find((c) => c.url.includes('/representation-grant/model'));
    expect(modelo, 'no se pidió el modelo').toBeTruthy();
    const body = JSON.parse(String(modelo!.init.body));
    expect(body).toMatchObject({
      obligado_nif: '12345678Z',
      obligado_name: 'Manolo García',
      obligado_municipio: 'Vigo',
      obligado_via: 'Rúa do Príncipe',
      obligado_numero: '10',
    });
  });
});

describe('quién firma depende de QUÉ es el negocio', () => {
  // El modelo oficial (Anexo I del acuerdo 017) tiene dos redacciones: una persona física firma
  // ELLA MISMA, con su NIF y su domicilio; una entidad firma «en su nombre D/Dña … como
  // representante legal según documento justificativo que se adjunta». Pedir un «representante» a
  // un autónomo es pedirle algo que no existe — y en ese mismo papel «representante» a secas es
  // ERPlora, así que el rótulo es «representante legal», el literal del modelo.
  it('un AUTÓNOMO no tiene representante legal: firma él mismo y no se le pide nada más', async () => {
    const el = await mount(AUTONOMO);

    expect(testid(el, 'grant-party-signer')).toBeNull();
    expect(testid(el, 'grant-representation-proof')).toBeNull();
    // Y puede pedir el modelo sin teclear nada.
    expect(testid(el, 'grant-download-model')?.hasAttribute('disabled')).toBe(false);
  });

  it('para un autónomo el firmante que viaja ES el negocio, porque la API lo exige igual', async () => {
    const el = await mount(AUTONOMO);
    await (el as unknown as { downloadModel: () => Promise<void> }).downloadModel();

    const body = JSON.parse(String(calls.find((c) => c.url.includes('/model'))!.init.body));
    expect(body.signer_nif).toBe('12345678Z');
    expect(body.signer_name).toBe('Manolo García');
  });

  it('una SOCIEDAD pide su representante legal y el justificante de representación', async () => {
    const el = await mount(SOCIEDAD);

    expect(testid(el, 'grant-party-signer')?.textContent).toContain('grant.partyLegalRepresentative');
    expect(testid(el, 'grant-signer-name')).toBeTruthy();
    expect(testid(el, 'grant-signer-nif')).toBeTruthy();
    expect(testid(el, 'grant-representation-proof')).toBeTruthy();
    // Sin representante no hay modelo que rellenar.
    expect(testid(el, 'grant-download-model')?.hasAttribute('disabled')).toBe(true);

    const wc = el as unknown as { signerNif: string; signerName: string };
    wc.signerNif = '12345678Z';
    wc.signerName = 'Manolo García';
    await el.updateComplete;

    expect(testid(el, 'grant-download-model')?.hasAttribute('disabled')).toBe(false);
  });

  // El selector DNI/NIE no se abría: `interface="popover"` se posiciona sobre el control que lo
  // dispara, y dentro del shadow DOM de este componente no lo encuentra. `mode="md"` y
  // `fill="outline"` además forzaban Material en un shell fijado en `ios`. La forma que funciona es
  // la de la documentación de Ionic: dentro de un `ion-item`, con la etiqueta flotante y la interfaz
  // por defecto — la misma que ya usan los selectores de Ajustes de este módulo.
  it('el selector DNI/NIE va dentro de un ion-item, con la interfaz por defecto', async () => {
    const el = await mount();
    const select = testid(el, 'grant-document-type');

    expect(select?.tagName.toLowerCase()).toBe('ion-select');
    expect(select?.parentElement?.tagName.toLowerCase(), 'el select no va dentro de un ion-item').toBe('ion-item');
    expect(select?.getAttribute('label-placement')).toBe('floating');
    for (const attr of ['interface', 'mode', 'fill']) {
      expect(select?.hasAttribute(attr), `el select fuerza «${attr}»`).toBe(false);
    }
    expect([...select!.querySelectorAll('ion-select-option')].map((o) => o.getAttribute('value'))).toEqual(['dni', 'nie']);
  });

  // Muchos NIE no llevan firma impresa, así que hace falta una muestra para poder compararla.
  it('la muestra de firma solo aparece con NIE', async () => {
    const el = await mount();
    expect(testid(el, 'grant-signature-sample')).toBeNull();

    (el as unknown as { documentType: string }).documentType = 'nie';
    await el.updateComplete;

    expect(testid(el, 'grant-signature-sample')).toBeTruthy();
  });
});

describe('los adjuntos van por ok-dropzone', () => {
  it('cada adjunto es una zona de OutfitKit que filtra el tipo en el propio control', async () => {
    const el = await mount(SOCIEDAD);

    const firmado = testid(el, 'grant-signed-document');
    expect(firmado?.tagName.toLowerCase()).toBe('ok-dropzone');
    expect(firmado?.getAttribute('accept')).toContain('pdf');
    expect(testid(el, 'grant-dni-copy')?.tagName.toLowerCase()).toBe('ok-dropzone');
    expect(testid(el, 'grant-representation-proof')?.tagName.toLowerCase()).toBe('ok-dropzone');
  });

  it('enviar a revisión exige el modelo firmado Y la copia del documento', async () => {
    const el = await mount();
    expect(testid(el, 'grant-submit')?.hasAttribute('disabled')).toBe(true);

    await drop(el, 'grant-signed-document', pdf());
    expect(
      testid(el, 'grant-submit')?.hasAttribute('disabled'),
      'dejó enviar sin la copia del documento de identidad',
    ).toBe(true);

    await drop(el, 'grant-dni-copy', jpg());
    expect(testid(el, 'grant-submit')?.hasAttribute('disabled')).toBe(false);
  });

  it('quitar el fichero de la zona lo quita de verdad: el botón vuelve a bloquearse', async () => {
    const el = await mount();
    await drop(el, 'grant-signed-document', pdf());
    await drop(el, 'grant-dni-copy', jpg());
    expect(testid(el, 'grant-submit')?.hasAttribute('disabled')).toBe(false);

    testid(el, 'grant-dni-copy')!.dispatchEvent(
      new CustomEvent('ok-change', { detail: { files: [] }, bubbles: true, composed: true }),
    );
    await el.updateComplete;

    expect(testid(el, 'grant-submit')?.hasAttribute('disabled')).toBe(true);
  });
});

describe('un rechazo dice POR QUÉ, por su código', () => {
  // El panel del hub traducía trece códigos. Perder cualquiera es volver a «no ha funcionado» donde
  // antes se decía qué hacer — `hub_not_enrolled` y `identity_not_shared` sobre todo, que son los
  // que mandan a la persona a otra pantalla.
  it.each([
    'obligado_nif_required',
    'signer_required',
    'signed_document_not_pdf',
    'signature_sample_required',
    'representation_proof_required',
    'document_too_large',
    'cloud_rejected',
    'hub_not_enrolled',
    'identity_not_shared',
  ])('«%s» llega a su frase, no a un mensaje genérico', async (code) => {
    grantDoor = { ok: true, status: 200, body: { status: 'absent', at: '' } };
    const el = await mount();
    grantDoor = { ok: false, status: 409, body: { ok: false, error: code } };

    await (el as unknown as { downloadModel: () => Promise<void> }).downloadModel();
    await el.updateComplete;

    expect(testid(el, 'grant-error')?.textContent).toContain(`grant.errors.${code}`);
  });

  it('un código que no conocemos no se calla: dice que no ha funcionado', async () => {
    const el = await mount();
    grantDoor = { ok: false, status: 409, body: { ok: false, error: 'vaporware' } };

    await (el as unknown as { downloadModel: () => Promise<void> }).downloadModel();
    await el.updateComplete;

    expect(testid(el, 'grant-error')?.textContent).toContain('grant.errors.unknown');
  });
});

describe('lo que la ley obliga a enseñar antes de pedir un documento de identidad', () => {
  it('la información básica del art. 13 RGPD va ANTES de la subida, no en un enlace al final', async () => {
    const el = await mount();
    const privacy = testid(el, 'grant-privacy');
    const tipo = testid(el, 'grant-document-type');

    expect(privacy?.textContent).toContain('grant.privacyController');
    expect(
      privacy!.compareDocumentPosition(tipo!) & Node.DOCUMENT_POSITION_FOLLOWING,
      'el aviso de privacidad aparece DESPUÉS de pedir el documento',
    ).toBeTruthy();
  });
});
