/**
 * Respuesta estandarizada de una emisión de documento electrónico
 * (ebill, epayroll, dequivalent, dsupport).
 *
 * Refleja la estructura devuelta por `ResponseClient::getStructuredData` del
 * backend. Los accesores cubren los campos habituales; el resto queda accesible
 * con {@link EmissionResponse#get} y {@link EmissionResponse#raw}.
 */
export class EmissionResponse {
  /** @param {Object} data */
  constructor(data) {
    this._data = data && typeof data === 'object' ? data : {};
  }

  /** @param {Object} data */
  static fromObject(data) {
    return new EmissionResponse(data);
  }

  /** Identificador interno de la transacción/emisión. */
  get idTransaction() {
    return this._data.id_transaction ?? null;
  }

  /** Consecutivo (número) del documento. */
  get number() {
    return this._data.number ?? null;
  }

  /** Mensaje devuelto por el proceso de emisión. */
  get message() {
    return this._data.message ?? null;
  }

  /** Mensaje del estado actual de la emisión. */
  get statusMessage() {
    return this._data.status_message ?? null;
  }

  get statusCode() {
    return this._data.status_code ?? null;
  }

  /** ¿La emisión se hizo contra el ambiente de pruebas (habilitación)? */
  get isTest() {
    return this._boolOrNull('is_test');
  }

  get isSimulated() {
    return this._boolOrNull('simulated');
  }

  /** ¿La DIAN validó el documento correctamente? */
  get isValid() {
    return this._boolOrNull('is_valid');
  }

  get isAsync() {
    return this._boolOrNull('is_async');
  }

  /** TrackId de la DIAN. */
  get trackId() {
    return this._data.trackid ?? null;
  }

  /** CUFE / CUDE / CUNE del documento. */
  get uuid() {
    return this._data.uuid ?? null;
  }

  get typeUuid() {
    return this._data.type_uuid ?? null;
  }

  /** URL del QR de consulta en el catálogo DIAN. */
  get qr() {
    return this._data.qr ?? null;
  }

  /** XML del documento en base64 (tal cual lo entrega el backend). */
  get xmlBase64() {
    return this._data.xml ?? null;
  }

  /** XML del documento ya decodificado, o null si no viene. */
  get xml() {
    const xml = this._data.xml ?? null;
    if (xml == null) return null;
    try {
      if (typeof Buffer !== 'undefined') return Buffer.from(xml, 'base64').toString('utf-8');
      if (typeof atob !== 'undefined') return decodeURIComponent(escape(atob(xml)));
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Errores devueltos. Array cuando los hubo; array vacío si no hay.
   * @returns {Array}
   */
  get errors() {
    const errors = this._data.errors ?? [];
    if (Array.isArray(errors)) return errors;
    if (errors && typeof errors === 'object') return Object.values(errors);
    return [];
  }

  get hasErrors() {
    return this.errors.length > 0;
  }

  /** @returns {Object} */
  get statuses() {
    const s = this._data.statuses;
    return s && typeof s === 'object' ? s : {};
  }

  /** @returns {Array} */
  get events() {
    return Array.isArray(this._data.events) ? this._data.events : [];
  }

  /** @returns {Array} */
  get properties() {
    return Array.isArray(this._data.properties) ? this._data.properties : [];
  }

  /** Acceso genérico por clave con valor por defecto. */
  get(key, fallback = null) {
    return this._data[key] ?? fallback;
  }

  /** Respuesta completa sin procesar. @returns {Object} */
  raw() {
    return this._data;
  }

  toJSON() {
    return this._data;
  }

  _boolOrNull(key) {
    const value = this._data[key];
    return value == null ? null : Boolean(value);
  }
}
