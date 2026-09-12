import { LitElement, html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-dropzone';
import {
  RepresentationGrantError,
  downloadGrantModel,
  getGrant,
  postGrant,
  type GrantStatusValue,
} from '../../lib/representation-grant';
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';

const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface ErploraClientLike {
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

/**
 * Primeras letras de un NIF de PERSONA JURÍDICA (sociedad), tal como las fija la AEAT.
 *
 * Se usa para decidir si hay que pedir el justificante de representación: una sociedad actúa por
 * medio de quien su escritura nombre, así que ese documento tiene que viajar — y pedírselo a un
 * autónomo sería pedirle algo que no existe.
 */
const ENTITY_LETTERS = 'ABCDEFGHJNPQRSUVW';

/**
 * Tope por adjunto, en bytes. Se filtra en la zona para decirlo ANTES de subir: descubrirlo
 * después, con un `document_too_large` del plano de control, es haber esperado la subida entera.
 */
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function isLegalPersonNif(nif: string): boolean {
  const normalised = nif.replace(/[\s.-]/g, '').toUpperCase();
  return normalised.length > 0 && ENTITY_LETTERS.includes(normalised[0]);
}

/**
 * Los rechazos que la puerta nombra, cada uno con su frase en `grant.errors.<código>` (ADR-0055).
 *
 * Son los mismos que traducía el panel del hub, y ninguno sobra: `hub_not_enrolled` e
 * `identity_not_shared` son los que mandan a la persona a otra pantalla, y sin su frase quedaría
 * delante de un «no ha funcionado» que no le dice adónde ir.
 */
const KNOWN_REFUSALS = new Set([
  'obligado_nif_required',
  'signer_required',
  'document_type_invalid',
  'signed_document_required',
  'signed_document_not_pdf',
  'dni_copy_required',
  'signature_sample_required',
  'representation_proof_required',
  'document_too_large',
  'invalid_via',
  'cloud_rejected',
  'hub_not_enrolled',
  'identity_not_shared',
  'open_external_failed',
]);

/**
 * **Donde el negocio consigue el modelo del otorgamiento y sube el que ya firmó.**
 *
 * ERPlora remite los registros VERI*FACTU **en nombre del** obligado, y eso exige su consentimiento
 * firmado: el Anexo I del acuerdo de colaboración social 017. Aquí no se firma nada — la FAQ de la
 * AEAT admite exactamente dos firmas, **manuscrita** sobre el modelo impreso (con el sello de la
 * entidad si el otorgante es una sociedad) o **electrónica con el certificado cualificado del
 * propio cliente** (AutoFirma). Un trazo en pantalla no es ninguna de las dos, y un sello no cabe
 * en un canvas.
 *
 * Dos pasos, y los dos ocurren FUERA de aquí en el medio: descargar el modelo oficial (lo genera el
 * plano de control, que es donde vive su texto — el acuerdo dice que «no podrá ser modificado», y
 * dos copias del mismo documento legal acaban diciendo cosas distintas) y subir lo firmado. Después
 * se **espera**: toda subida queda `pendiente` y la aprueba una persona en 24-72 h, porque ERPlora
 * responde ante la AEAT de la autenticidad de esa firma y eso no se automatiza.
 */
export class ErpVerifactuGrant extends LitElement {
  static styles = css`
    :host { display:block; }
    .panel { display:flex; flex-direction:column; gap:.6rem; }
    .state { display:flex; align-items:center; gap:.5rem; }
    .hint { font-size:.82rem; color: var(--ion-color-medium, #6b7280); margin:0; }
    h3 { margin:.6rem 0 0; font-size:.95rem; }
    h4 { margin:.5rem 0 0; font-size:.85rem; color: var(--ion-color-medium, #6b7280); }
    .row { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:.5rem; }
    @media (max-width: 560px) { .row { grid-template-columns: 1fr; } }
    .privacy { background: var(--ion-color-light, #f4f5f8); border-radius: var(--ok-radius-sm, 8px); padding:.6rem .75rem; display:flex; flex-direction:column; gap:.35rem; }
    .privacy p { margin:0; font-size:.78rem; }
    .privacy .title { font-weight:600; }
    .file { display:flex; flex-direction:column; gap:.25rem; }
    ion-button { min-height:44px; }
    ion-input, ion-select { min-height:44px; }
    ok-inline-feedback { display:block; }
    /* La zona de subida va al ancho del formulario, como el resto de campos: en el hub nada
       lleva tope de ancho (hub#1605), y ok-dropzone trae 480 px por defecto. */
    ok-dropzone { --ok-dropzone-max-width: 100%; }
  `;

  /** El obligado tributario: identidad fiscal del hub, fuente única (ADR-0061). Se LEE, no se pide. */
  @property({ type: String }) obligadoNif = '';

  @property({ type: String }) obligadoName = '';

  /**
   * El domicilio fiscal del negocio, **tal como está en Ajustes → Negocio**. Se lee, no se pide:
   * pedirlo aquí otra vez es como un modelo firmado acaba con un domicilio distinto del de las
   * facturas.
   */
  @property({ type: String }) businessCity = '';

  @property({ type: String }) businessStreet = '';

  @property({ type: String }) businessNumber = '';

  /** `''` = todavía no se sabe (cargando, o el runtime no contestó). Nunca se inventa. */
  @state() private status: GrantStatusValue = '';

  @state() private at = '';

  @state() private rejectedReason = '';

  @state() private loading = true;

  @state() signerNif = '';

  @state() signerName = '';

  @state() private signerMunicipio = '';

  @state() private signerVia = '';

  @state() private signerNumero = '';

  @state() documentType: 'dni' | 'nie' = 'dni';

  @state() signedDocument: File | null = null;

  @state() dniFile: File | null = null;

  @state() private signatureSample: File | null = null;

  @state() private representationProof: File | null = null;

  @state() private busy = false;

  @state() private downloading = false;

  @state() private downloaded = false;

  /** El fallo, como CLAVE de i18n: la pantalla traduce por código, nunca por la frase (ADR-0055). */
  @state() private errorKey = '';

  @state() private errorStatusCode: number | null = null;

  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    await this.load();
  }

  disconnectedCallback() {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      const state = await getGrant();
      this.status = state.status;
      this.at = state.at;
      this.rejectedReason = state.rejected_reason;
      if (state.document_type === 'dni' || state.document_type === 'nie') {
        this.documentType = state.document_type;
      }
    } catch {
      // Sin respuesta no se pinta un estado: «no lo sé» y «no has firmado» no son lo mismo, y
      // enseñar el segundo cuando pasa el primero manda a alguien a firmar dos veces.
      this.status = '';
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cuándo hay algo que hacer. Con el otorgamiento vigente no se pide nada; mientras se revisa
   * tampoco — ofrecer «vuelve a subirlo» a quien acaba de subirlo es lo que genera los duplicados
   * que otra persona tiene que desempatar a mano.
   */
  private get showForm(): boolean {
    return this.status !== 'vigente' && this.status !== 'pendiente';
  }

  /** Muchos NIE no llevan firma impresa: sin una muestra no hay con qué comparar la del modelo. */
  private get needsSignatureSample(): boolean {
    return this.documentType === 'nie';
  }

  /**
   * ¿El obligado es una SOCIEDAD? Decide qué redacción del modelo oficial se usa: una persona física
   * firma ella misma; una entidad firma «en su nombre D/Dña … como representante legal según
   * documento justificativo que se adjunta» (Anexo I del acuerdo 017).
   */
  private get isCompany(): boolean {
    return isLegalPersonNif(this.obligadoNif);
  }

  private get needsRepresentationProof(): boolean {
    return this.isCompany;
  }

  /**
   * Quién firma, de verdad. Un autónomo firma él mismo, así que su firmante ES el negocio; la API
   * del plano de control exige `signer_*` en los dos casos, y mandar el del negocio es decir lo
   * mismo que el modelo, no inventar un segundo firmante.
   */
  private get effectiveSigner(): { nif: string; name: string; city: string; street: string; number: string } {
    return this.isCompany
      ? {
          nif: this.signerNif,
          name: this.signerName,
          city: this.signerMunicipio,
          street: this.signerVia,
          number: this.signerNumero,
        }
      : {
          nif: this.obligadoNif,
          name: this.obligadoName,
          city: this.businessCity,
          street: this.businessStreet,
          number: this.businessNumber,
        };
  }

  /**
   * Lo que le falta a Ajustes → Negocio para que el modelo salga completo. El número puede faltar
   * de verdad (un «s/n»), pero sin municipio ni vía el domicilio fiscal no existe.
   */
  private get businessMissing(): boolean {
    return (
      !this.obligadoNif.trim() ||
      !this.obligadoName.trim() ||
      !this.businessCity.trim() ||
      !this.businessStreet.trim()
    );
  }

  private get canDownloadModel(): boolean {
    const signer = this.effectiveSigner;
    return !!this.obligadoNif.trim() && !!signer.nif.trim() && !!signer.name.trim();
  }

  private get canSubmit(): boolean {
    return (
      !!this.obligadoNif.trim() &&
      !!this.obligadoName.trim() &&
      !!this.signedDocument &&
      !!this.dniFile &&
      (!this.needsSignatureSample || !!this.signatureSample) &&
      (!this.needsRepresentationProof || !!this.representationProof)
    );
  }

  /** La fecha del estado en el idioma de quien mira, o la cruda si no se puede leer. */
  private get atLabel(): string {
    if (!this.at) return '';
    const d = new Date(this.at);
    return Number.isNaN(d.getTime()) ? this.at : d.toLocaleDateString(erplora().locale || undefined);
  }

  private stateKey(): string {
    if (this.status === 'vigente') return 'grant.stateVigente';
    if (this.status === 'pendiente') return 'grant.statePendiente';
    if (this.status === 'rechazado') return 'grant.stateRejected';
    if (this.status === 'revocado') return 'grant.stateRevoked';
    if (this.status === 'absent') return 'grant.stateAbsent';
    return this.loading ? 'grant.stateUnknown' : 'grant.stateUnreachable';
  }

  private stateTone(): string {
    if (this.status === 'vigente') return 'success';
    if (this.status === 'pendiente') return 'info';
    if (this.status === 'rechazado' || this.status === 'revocado') return 'danger';
    return 'warning';
  }

  private modelFields() {
    const signer = this.effectiveSigner;
    return {
      obligado_nif: this.obligadoNif,
      obligado_name: this.obligadoName,
      obligado_municipio: this.businessCity,
      obligado_via: this.businessStreet,
      obligado_numero: this.businessNumber,
      signer_nif: signer.nif,
      signer_name: signer.name,
      signer_municipio: signer.city,
      signer_via: signer.street,
      signer_numero: signer.number,
    };
  }

  /** Lleva a Ajustes → Negocio, que es donde se arregla. Mismo patrón módulo→shell que el resto. */
  private goToBusiness(): void {
    window.history.pushState({}, '', '/settings#business');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  /** Traduce el rechazo por su CÓDIGO. Uno que no conocemos conserva su status, que sí se entiende. */
  private noteFailure(e: unknown): void {
    const error = e instanceof RepresentationGrantError ? e : null;
    this.errorKey = error?.code && KNOWN_REFUSALS.has(error.code)
      ? `grant.errors.${error.code}`
      : 'grant.errors.unknown';
    this.errorStatusCode = error?.statusCode ?? null;
  }

  /**
   * Descarga el modelo oficial ya relleno. El navegador lo guarda donde el usuario tenga puesto;
   * dentro de la app instalada un `<a download>` no hace nada en Android, así que el hueco de
   * «guardado en …» se rellena cuando el host lo diga, no se inventa aquí.
   */
  private async downloadModel(): Promise<void> {
    this.downloading = true;
    this.errorKey = '';
    try {
      const blob = await downloadGrantModel(this.modelFields());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'otorgamiento-verifactu.pdf';
      a.click();
      URL.revokeObjectURL(url);
      this.downloaded = true;
    } catch (e) {
      this.noteFailure(e);
    } finally {
      this.downloading = false;
    }
  }

  private async submit(): Promise<void> {
    if (!this.signedDocument || !this.dniFile) return;
    this.busy = true;
    this.errorKey = '';
    try {
      const result = await postGrant({
        obligado_nif: this.obligadoNif,
        obligado_name: this.obligadoName,
        signer_nif: this.effectiveSigner.nif,
        signer_name: this.effectiveSigner.name,
        document_type: this.documentType,
        signed_document: this.signedDocument,
        dni_copy: this.dniFile,
        ...(this.signatureSample ? { signature_sample: this.signatureSample } : {}),
        ...(this.representationProof ? { representation_proof: this.representationProof } : {}),
      });
      this.status = result.status;
      this.at = result.at;
      this.rejectedReason = '';
      this.signedDocument = null;
      this.dniFile = null;
      this.signatureSample = null;
      this.representationProof = null;
    } catch (e) {
      this.noteFailure(e);
    } finally {
      this.busy = false;
    }
  }

  /**
   * Un adjunto, con `ok-dropzone`: arrastrar y soltar o pulsar, y el tipo se filtra en el propio
   * control. Un solo fichero por zona (sin `multiple`), así que soltar otro lo sustituye y quitarlo
   * vacía la zona — `ok-change` trae siempre la lista entera, también cuando queda vacía.
   */
  private dropzone(
    testid: string,
    accept: string,
    hint: string,
    onPick: (f: File | null) => void,
  ) {
    return html`<ok-dropzone
      data-testid=${testid}
      accept=${accept}
      max-size=${MAX_ATTACHMENT_BYTES}
      hint=${hint}
      .labels=${this.dropzoneLabels()}
      @ok-change=${(e: CustomEvent<{ files: File[] }>) => onPick(e.detail?.files?.[0] ?? null)}
    ></ok-dropzone>`;
  }

  /** Los textos de la zona en el idioma de quien mira (el componente trae inglés por defecto). */
  private dropzoneLabels() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return {
      title: t('ui.dropTitle'),
      browse: t('ui.dropBrowse'),
      errorType: t('ui.dropErrorType'),
      errorSize: t('ui.dropErrorSize'),
      removeLabel: t('ui.dropRemove'),
    };
  }

  private renderForm(t: (k: string, p?: Record<string, unknown>) => string) {
    return html`
      <p class="hint">${t('grant.intro')}</p>

      ${this.businessMissing
        ? html`<ok-inline-feedback
            data-testid="grant-business-missing"
            tone="warning"
            icon="business-outline"
            heading=${t('ui.grantBusinessMissingTitle')}
          >
            ${t('ui.grantBusinessMissingHint')}
            <ion-button
              size="small"
              fill="outline"
              data-testid="grant-business-fix"
              @click=${() => this.goToBusiness()}
            >${t('ui.grantBusinessFix')}</ion-button>
          </ok-inline-feedback>`
        : nothing}

      <h3>${t('grant.step1Title')}</h3>
      <p class="hint">${t('grant.step1Hint')}</p>

      ${this.isCompany
        ? html`
            <h4 data-testid="grant-party-signer">${t('grant.partyLegalRepresentative')}</h4>
            <p class="hint">${t('grant.partyLegalRepresentativeHint')}</p>
            ${this.textField('grant-signer-name', t('grant.signerName'), this.signerName, (v) => { this.signerName = v; })}
            ${this.textField('grant-signer-nif', t('grant.signerNif'), this.signerNif, (v) => { this.signerNif = v; })}
            <div class="row">
              ${this.textField('grant-signer-municipio', t('grant.municipio'), this.signerMunicipio, (v) => { this.signerMunicipio = v; })}
              ${this.textField('grant-signer-via', t('grant.via'), this.signerVia, (v) => { this.signerVia = v; })}
              ${this.textField('grant-signer-numero', t('grant.numero'), this.signerNumero, (v) => { this.signerNumero = v; })}
            </div>
          `
        : nothing}

      <ion-button
        expand="block"
        data-testid="grant-download-model"
        ?disabled=${!this.canDownloadModel || this.downloading}
        @click=${() => void this.downloadModel()}
      >
        ${t('grant.downloadModel')}
      </ion-button>
      ${this.downloaded
        ? html`<ok-inline-feedback tone="success" icon="checkmark-circle-outline" data-testid="grant-downloaded"
            >${t('ui.grantDownloaded')}</ok-inline-feedback
          >`
        : nothing}

      <p class="hint">${t('grant.howToByHand')}</p>
      <p class="hint">${t('grant.howToElectronic')}</p>

      <!-- La informacion basica del art. 13 RGPD va AQUI, antes de que nadie suba un documento de
           identidad, no en un enlace al final. -->
      <div class="privacy" data-testid="grant-privacy">
        <p class="title">${t('grant.privacyTitle')}</p>
        <p>${t('grant.privacyController')}</p>
        <p>${t('grant.privacyPurpose')}</p>
        <p>${t('grant.privacyRights')}</p>
      </div>

      <h3>${t('grant.step2Title')}</h3>
      <p class="hint">${t('grant.step2Hint')}</p>

      ${this.dropzone('grant-signed-document', '.pdf,application/pdf', t('grant.signedDocumentChoose'), (f) => { this.signedDocument = f; })}

      <!-- Dentro de un ion-item y con la interfaz por defecto, como en la documentacion de Ionic: un
           popover no se posiciona desde el shadow root y el selector no llegaba a abrirse. -->
      <ion-item>
        <ion-select
          label-placement="floating"
          data-testid="grant-document-type"
          label=${t('grant.documentType')}
          .value=${this.documentType}
          @ionChange=${(e: Event) => { this.documentType = String((e.target as HTMLInputElement).value) as 'dni' | 'nie'; }}
        >
          <ion-select-option value="dni">${t('grant.documentTypeDni')}</ion-select-option>
          <ion-select-option value="nie">${t('grant.documentTypeNie')}</ion-select-option>
        </ion-select>
      </ion-item>

      ${this.dropzone('grant-dni-copy', 'image/*,.pdf', t('grant.dniChoose'), (f) => { this.dniFile = f; })}

      ${this.needsSignatureSample
        ? html`<p class="hint">${t('grant.signatureSampleWhy')}</p>
            ${this.dropzone('grant-signature-sample', 'image/*,.pdf', t('grant.signatureSampleChoose'), (f) => { this.signatureSample = f; })}`
        : nothing}

      ${this.needsRepresentationProof
        ? html`<p class="hint">${t('grant.representationProofWhy')}</p>
            ${this.dropzone('grant-representation-proof', 'image/*,.pdf', t('grant.representationProofChoose'), (f) => { this.representationProof = f; })}`
        : nothing}

      <ion-button
        expand="block"
        data-testid="grant-submit"
        ?disabled=${!this.canSubmit || this.busy}
        @click=${() => void this.submit()}
      >
        ${t('grant.submit')}
      </ion-button>

      ${this.errorKey
        ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline" data-testid="grant-error"
            >${t(this.errorKey)}${this.errorStatusCode ? ` (${this.errorStatusCode})` : ''}</ok-inline-feedback
          >`
        : nothing}
    `;
  }

  private textField(testid: string, label: string, value: string, onInput: (v: string) => void) {
    return html`<ion-input
      mode="md"
      fill="outline"
      label-placement="floating"
      data-testid=${testid}
      label=${label}
      .value=${value}
      @ionInput=${(e: Event) => onInput(String((e.target as HTMLInputElement).value ?? ''))}
    ></ion-input>`;
  }

  render() {
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return html`
      <div class="panel">
        <ok-inline-feedback
          data-testid=${`grant-state-${this.status || 'unknown'}`}
          tone=${this.stateTone()}
          icon="shield-outline"
        >${t(this.stateKey(), { date: this.atLabel })}</ok-inline-feedback>

        ${this.status === 'rechazado' && this.rejectedReason
          ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline" data-testid="grant-rejected-reason"
              >${this.rejectedReason}</ok-inline-feedback
            >`
          : nothing}

        ${this.showForm ? this.renderForm(t) : nothing}
      </div>
    `;
  }
}

define('erp-verifactu-grant', ErpVerifactuGrant);
