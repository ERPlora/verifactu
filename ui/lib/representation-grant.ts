/**
 * **El otorgamiento de representación** — Anexo I del acuerdo de colaboración social 017.
 *
 * ERPlora remite los registros VERI*FACTU **en nombre del obligado**, y eso exige su consentimiento
 * firmado. El modelo oficial lo genera el plano de control, el cliente lo firma FUERA de la
 * pantalla —a mano sobre el papel o con AutoFirma— y lo sube aquí.
 *
 * Vivía en el shell del hub (`RepresentationGrantPanel.vue` + la mitad de `runtime.ts`) y se muda a
 * este módulo: un «acuerdo de colaboración social» con la Agencia Tributaria no existe fuera de
 * España, así que no es del hub, que es país-agnóstico.
 *
 * 🔴 **Las tres llamadas van al RUNTIME, nunca al SaaS.** El token de máquina del hub es secreto
 * suyo y no cruza a este navegador (ADR-0003): el runtime pone la cabecera y reenvía. Este lado no
 * guarda ni el documento firmado ni la copia del documento de identidad.
 */
import { coreFetch, coreFetchBlob } from './core-fetch';

/** Estado del otorgamiento (`GET`) y subida del firmado (`POST`, multipart). */
export const GRANT_PATH = '/api/fiscal/representation-grant';

/** El modelo oficial pre-relleno, que vuelve como PDF (`POST`). */
export const GRANT_MODEL_PATH = '/api/fiscal/representation-grant/model';

/** Los estados del otorgamiento, con las palabras del plano de control. `''` = no contestó. */
export type GrantStatusValue = '' | 'absent' | 'pendiente' | 'vigente' | 'rechazado' | 'revocado';

/** Lo que contestan siempre las rutas de escritura. */
export interface GrantStatus {
  status: GrantStatusValue;
  /** Fecha DEL ESTADO: firmado si vigente/pendiente, revisado si rechazado, revocado si revocado. */
  at: string;
}

/** Lo que contesta el `GET`: el estado y lo poco que se puede decir sin enseñar el documento. */
export interface GrantState extends GrantStatus {
  /**
   * Lo ÚNICO accionable de un «rechazado»: sin esto la pantalla manda a volver a subirlo sin decir
   * qué cambiar.
   */
  rejected_reason: string;
  /** `handwritten` | `electronic` | `''` — lo que detectó el plano de control, informativo. */
  signature_kind: string;
  /** `dni` | `nie` | `''`. */
  document_type: string;
}

/** Los diez huecos del modelo oficial. Los de dirección pueden ir vacíos (se rellenan a mano). */
export interface GrantModelFields {
  obligado_nif: string;
  obligado_name: string;
  obligado_municipio: string;
  obligado_via: string;
  obligado_numero: string;
  signer_nif: string;
  signer_name: string;
  signer_municipio: string;
  signer_via: string;
  signer_numero: string;
}

/** Lo que la pantalla sube: el modelo YA firmado, más lo que ERPlora tiene que custodiar con él. */
export interface GrantCapture {
  obligado_nif: string;
  obligado_name: string;
  signer_nif: string;
  signer_name: string;
  document_type: 'dni' | 'nie';
  /** El modelo oficial firmado (a mano y escaneado, o con AutoFirma). PDF. */
  signed_document: File;
  /** Copia del documento de identidad del firmante. */
  dni_copy: File;
  /** Muestra de firma — obligatoria con NIE, porque muchos documentos extranjeros no la llevan. */
  signature_sample?: File;
  /** Justificante de representación — obligatorio si el obligado es una sociedad. */
  representation_proof?: File;
}

/**
 * Un rechazo del otorgamiento, **con su código**, que es lo que la pantalla traduce (ADR-0055).
 *
 * `statusCode` viaja solo cuando quien rechazó fue el plano de control (`cloud_rejected`): el orden
 * de despliegue es SaaS antes que Hub, así que mientras eso está en vuelo la ruta del modelo
 * contesta **404** — y un «404» es algo que una persona entiende, mientras que un botón que no hace
 * nada no lo es.
 */
export class RepresentationGrantError extends Error {
  readonly code?: string;
  readonly statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = 'RepresentationGrantError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/** Lee el `{ok:false, error, status_code}` del runtime sin inventarse un motivo si no lo hay. */
function failure(
  where: string,
  status: number,
  body: Record<string, unknown>,
): RepresentationGrantError {
  const code = typeof body.error === 'string' ? body.error : undefined;
  const statusCode = typeof body.status_code === 'number' ? body.status_code : undefined;
  return new RepresentationGrantError(`${where} → ${status}`, code, statusCode);
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Lee el estado del otorgamiento. Cualquier sesión.
 *
 * **Lanza** si el runtime no contesta, en vez de degradar a «ausente»: «no lo sé» y «no has
 * firmado» no son lo mismo, y enseñar el segundo cuando pasa el primero manda a alguien a firmar
 * un otorgamiento que ya tiene.
 */
export async function getGrant(): Promise<GrantState> {
  const reply = await coreFetch(GRANT_PATH);
  if (!reply.ok) throw failure('get-representation-grant', reply.status, reply.body);
  return {
    status: str(reply.body.status) as GrantStatusValue,
    at: str(reply.body.at),
    rejected_reason: str(reply.body.rejected_reason),
    signature_kind: str(reply.body.signature_kind),
    document_type: str(reply.body.document_type),
  };
}

/**
 * Trae el **modelo oficial pre-relleno** como PDF.
 *
 * Devuelve el `Blob` y no lo guarda: quien lo llama decide cómo entregarlo, que dentro de la app
 * instalada no es un `<a download>` (en Android no hace literalmente nada). Solo admin — el runtime
 * revalida.
 */
export async function downloadGrantModel(fields: GrantModelFields): Promise<Blob> {
  const reply = await coreFetchBlob(GRANT_MODEL_PATH, fields);
  if (!reply.ok || !reply.blob) {
    throw failure('representation-grant-model', reply.status, reply.body);
  }
  return reply.blob;
}

/**
 * Sube el otorgamiento firmado (multipart). Solo admin (el runtime revalida). Lanza
 * {@link RepresentationGrantError} con el código del rechazo.
 *
 * Lo que vuelve es `pendiente`: lo revisa una persona de ERPlora (24-72 h).
 */
export async function postGrant(capture: GrantCapture): Promise<GrantStatus> {
  const form = new FormData();
  form.append('obligado_nif', capture.obligado_nif);
  form.append('obligado_name', capture.obligado_name);
  form.append('signer_nif', capture.signer_nif);
  form.append('signer_name', capture.signer_name);
  form.append('document_type', capture.document_type);
  form.append('signed_document', capture.signed_document, capture.signed_document.name);
  form.append('dni_copy', capture.dni_copy, capture.dni_copy.name);
  // Lo que no se adjuntó NO viaja como parte vacía: un adjunto en blanco es lo que hace que el
  // revisor no sepa si falta o si falló al subirse.
  if (capture.signature_sample) {
    form.append('signature_sample', capture.signature_sample, capture.signature_sample.name);
  }
  if (capture.representation_proof) {
    form.append(
      'representation_proof',
      capture.representation_proof,
      capture.representation_proof.name,
    );
  }
  const reply = await coreFetch(GRANT_PATH, { method: 'POST', form });
  if (!reply.ok) throw failure('post-representation-grant', reply.status, reply.body);
  return { status: str(reply.body.status) as GrantStatusValue, at: str(reply.body.at) };
}
