// **Ajustes son AJUSTES**: lo que se enciende y se apaga, y nada más.
//
// La pantalla había llegado a ONCE bloques, y cuatro de ellos eran ESPEJOS de solo lectura de
// cosas que se configuran en otro sitio: el NIF del emisor, el nombre del emisor, el certificado y
// el permiso del módulo. Un espejo no se puede tocar, así que no es un ajuste: es ruido delante de
// los tres controles que sí lo son, y encima se contradice solo («no hace falta en esta vía»
// ocupando el mismo espacio que un control de verdad).
//
// El mercado es unánime en esto y por eso se copia: Odoo no repite el NIF de la compañía dentro de
// su sección Veri*Factu —lo configura en Ajustes → Compañías y ahí se queda—, y su pantalla fiscal
// es «activar» + un botón que lleva a los certificados. Holded igual: Conformidad → subir
// certificado, y si no subes el tuyo usa el suyo.
//
// Lo que sustituye a los espejos NO es esconder el problema: si algo falta, el shell ya lo dice
// arriba del todo con su botón («Todavía no puedes facturar»), y eso lo alimenta el bloque `setup`
// del propio `module.json`. Un aviso que solo aparece cuando hace falta le gana a cuatro filas que
// están siempre.
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-verifactu-settings';

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
    // El stub devuelve la CLAVE, así que las aserciones son sobre claves del catálogo: si alguien
    // cambia el rótulo, el test sigue diciendo la verdad; si alguien devuelve el bloque, se rompe.
    t: (_catalog: unknown, key: string) => key,
  };
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

const text = async () => (await mount()).shadowRoot.textContent ?? '';

describe('Ajustes del módulo · corto a propósito', () => {
  it('lleva lo que se enciende y se apaga, y la prueba que corre con ello', async () => {
    const body = await text();

    expect(body, 'el interruptor de VeriFactu').toContain('ui.enableVerifactu');
    // Las OPCIONES del entorno, que sí son texto; el rótulo del `ion-select` viaja en un
    // atributo y no aparece en `textContent`.
    expect(body, 'el entorno (pruebas / producción)').toContain('ui.envTesting');
    expect(body).toContain('ui.envProduction');
    expect(body, 'guardar').toContain('ui.save');
    // La prueba se queda aquí: corre con la configuración que se acaba de guardar, que es lo que
    // la hace útil. Lightspeed hace lo mismo — se prueba desde el modo en el que estás.
    expect(body, 'la prueba en vivo').toContain('ui.testTitle');
    // Y el interruptor de la vía, que es un ajuste como los otros dos: se enciende y se apaga aquí,
    // y lo que cuesta —subir el `.p12`— se hace en Configuración.
    expect(body, 'el interruptor del certificado propio').toContain('ui.cfgOwnTitle');
  });

  // La vía la dicta el slot de certificado que hay, no una preferencia guardada, así que el
  // interruptor REFLEJA lo que dice el core (`route_of`) y nunca lo deduce de `has_certificate`,
  // que desde hub#1489 vale 1 en las dos vías.
  it('el interruptor del certificado propio refleja la VÍA que dice el core', async () => {
    const el = await mount();
    const toggle = el.shadowRoot.querySelector('[data-testid="settings-own-certificate"]');

    expect(toggle, 'no hay interruptor de vía en Ajustes').toBeTruthy();
    // El fixture no publica `hub.fiscal.transmission` (un runtime anterior a hub#1416) y sí dice
    // `has_certificate: 1`, así que degrada a la lectura vieja: ahí ese 0/1 todavía significaba
    // «firma con el suyo». Es la degradación documentada, no un descuido.
    expect(toggle?.hasAttribute('checked')).toBe(true);
  });

  it('con la vía DELEGADA que publica el core, el interruptor está apagado', async () => {
    const antes = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    (globalThis as Record<string, unknown>).erplora = {
      ...antes,
      query: async (name: string) => {
        if (name === 'hub.fiscal.transmission') return [{ transmission_route: 'delegated' }];
        if (name === 'verifactu.config.get') return [{ has_certificate: 1 }];
        return [];
      },
    };
    const el = await mount();

    expect(
      el.shadowRoot
        .querySelector('[data-testid="settings-own-certificate"]')
        ?.hasAttribute('checked'),
      'la VÍA manda sobre has_certificate, que vale 1 en las dos',
    ).toBe(false);
  });

  it('NO repite nada que se configure en otra pantalla', async () => {
    const body = await text();
    const espejos: Array<[string, string]> = [
      ['ui.obligadoNif', 'el NIF del emisor se pone en Ajustes → Negocio'],
      ['ui.obligadoName', 'el nombre del emisor se pone en Ajustes → Negocio'],
      ['ui.certPkcs12', 'el certificado se sube en Configuración → Certificado'],
      ['ui.capabilityTitle', 'el permiso se concede en Ajustes → Permisos'],
      ['ui.producerTitle', 'la identificación del software ya está en la declaración responsable'],
    ];
    for (const [clave, donde] of espejos) {
      expect(body, `Ajustes vuelve a enseñar «${clave}»: ${donde}`).not.toContain(clave);
    }
  });

  it('NO lleva la vía, el otorgamiento ni el enrolamiento: eso es Configuración', async () => {
    const body = await text();

    expect(body, 'la vía de transmisión vive en Configuración → Certificado').not.toContain('ui.routeTitle');
    expect(body, 'el otorgamiento vive en Configuración → Documentación').not.toContain('ui.grantTitle');
    expect(body, 'la conexión con ERPlora vive en Configuración → Certificado').not.toContain('ui.gatewayTitle');
  });

  it('conserva la declaración responsable: no es un ajuste, es lo que exige el art. 13.2', async () => {
    expect(await text()).toContain('ui.declTitle');
  });
});
