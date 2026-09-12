/**
 * **La declaración responsable del SIF, para la pantalla del dueño** (art. 13.2 RRSIF).
 *
 * El RD 1007/2023 exige que la declaración responsable del productor aparezca «por escrito y de
 * modo visible en el propio sistema informático **en cada una de sus versiones**». El archivo
 * público de erplora.com cubre la otra mitad del artículo —el cliente y el distribuidor en el
 * momento de la adquisición—, pero a un negocio inspeccionado se le pide enseñarla desde SU PROPIA
 * caja.
 *
 * Vivía en el shell del hub y se muda aquí porque el hub es país-agnóstico: una «declaración
 * responsable» solo existe donde existe el RD 1007/2023, así que es de este módulo. Lo que **no**
 * se mueve es el dato: `GET /api/system/declaration` lo sirve el core y proyecta el MISMO bloque
 * `SistemaInformatico` que viaja dentro de cada registro — los siete campos del fabricante tal y
 * como los sirve el plano de control, más los dos que solo este hub puede declarar (`Version` = el
 * binario que corre, `NumeroInstalacion` = su `hub_id`).
 *
 * 🔴 **Aquí no se rellena nada por defecto.** Un valor inventado en el navegador haría que la caja
 * certifique una identidad que las facturas no llevan, que es precisamente lo que el art. 13
 * sanciona.
 */
import { coreFetch } from './core-fetch';

/** La puerta del core que proyecta el bloque. Solo lectura, cualquier sesión de usuario. */
export const DECLARATION_PATH = '/api/system/declaration';

/**
 * Los nueve elementos de `SistemaInformatico`, en el orden en que los declara el XSD — que es el
 * orden en que los pinta la ficha, para poder leerla al lado de un registro.
 *
 * Las claves conservan la grafía española literal de la AEAT porque es lo que lleva el XML; una
 * transliteración a camelCase inventaría un segundo nombre para un elemento legal.
 */
export const DECLARATION_FIELDS = [
  'NombreRazon',
  'NIF',
  'NombreSistemaInformatico',
  'IdSistemaInformatico',
  'Version',
  'NumeroInstalacion',
  'TipoUsoPosibleSoloVerifactu',
  'TipoUsoPosibleMultiOT',
  'IndicadorMultiplesOT',
] as const;

export type DeclarationField = (typeof DECLARATION_FIELDS)[number];

/** Lo que contesta `GET /api/system/declaration`. */
export interface SystemDeclaration {
  /** La versión del binario que corre este hub (`1.2.3`). */
  version: string;
  /** Esta instalación ante la AEAT: el `hub_id`. */
  numeroInstalacion: string;
  /** Dónde vive el texto FIRMADO, en el plano de control al que pertenece este hub. */
  declarationUrl: string;
  /**
   * CUÁL de las declaraciones apunta esa URL (`v1`, `v2`…), como la nombró el plano de control.
   * El art. 13.3 RRSIF permite que convivan varias —una por rango de versiones—, así que esto es
   * lo que permite comprobar que el texto cubre esta release sin seguir el enlace y comparar
   * nombres de carpeta. No es el mismo dato que `version`, que es el binario.
   *
   * **Ausente, nunca cadena vacía**: sin referencia el enlace cae a la raíz del archivo, que no
   * tiene versión que nombrar, y un rótulo en blanco al lado se leería como «esta declaración no
   * tiene versión», que es otra afirmación.
   */
  declarationVersion?: string;
  /**
   * El bloque tal y como viaja en cada registro, o `null` cuando la mitad del fabricante todavía
   * no ha llegado a este hub. `null` **no** es «usa los valores por defecto»: para una declaración
   * legal no los hay, y en ese estado el motor fiscal tampoco construye ningún sobre.
   */
  sistemaInformatico: Record<DeclarationField, string> | null;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Lee el bloque, o lanza. **Un rechazo nunca se resuelve en una declaración vacía**: una ficha que
 * se quedase muda se vería igual que un hub que no tiene nada que declarar, y la pantalla cuyo
 * único trabajo es enseñarse a una inspección es el último sitio para eso. Quien llama pinta su
 * propio estado de «no se pudo cargar».
 */
export async function fetchResponsibleDeclaration(): Promise<SystemDeclaration> {
  const reply = await coreFetch(DECLARATION_PATH);
  const payload = reply.body as Partial<SystemDeclaration>;
  if (!reply.ok || typeof payload.declarationUrl !== 'string') {
    throw new Error(`GET ${DECLARATION_PATH} → HTTP ${reply.status}`);
  }
  const block = payload.sistemaInformatico as Record<string, unknown> | null | undefined;
  // Los nueve o ninguno, la misma regla que el runtime aplica a los datos del fabricante. Un
  // bloque a medias no es media declaración: es una declaración equivocada.
  const complete =
    !!block &&
    typeof block === 'object' &&
    DECLARATION_FIELDS.every((field) => str(block[field]).length > 0);
  // Un espacio en blanco no es una versión: una referencia recortada a nada es una que el plano de
  // control no nombró, y la ficha tiene que callarse en vez de pintar un rótulo vacío.
  const declarationVersion = str(payload.declarationVersion).trim();
  return {
    version: str(payload.version),
    numeroInstalacion: str(payload.numeroInstalacion),
    declarationUrl: payload.declarationUrl,
    ...(declarationVersion ? { declarationVersion } : {}),
    sistemaInformatico: complete
      ? (Object.fromEntries(
          DECLARATION_FIELDS.map((field) => [field, str(block[field])]),
        ) as Record<DeclarationField, string>)
      : null,
  };
}
