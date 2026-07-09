/**
 * Evento RADIAN devuelto por los endpoints de emisión/acuse (HTTP 201).
 *
 * El backend serializa el modelo del evento; este DTO expone los campos más
 * comunes y deja el resto disponible con {@link RadianEvent#get} / {@link RadianEvent#raw}.
 */
export class RadianEvent {
  /** @param {Object} data */
  constructor(data) {
    this._data = data && typeof data === 'object' ? data : {};
  }

  /** @param {Object} data */
  static fromObject(data) {
    return new RadianEvent(data);
  }

  get id() {
    return this._data.id ?? null;
  }

  /** Código del tipo de evento (p. ej. 030, 032, 036...). */
  get eventCode() {
    return (
      this._data.type_event_code ??
      this._data.event_code ??
      this._data.type_event?.code ??
      null
    );
  }

  /** CUDE del evento (UUID). */
  get uuid() {
    return this._data.uuid ?? this._data.cude ?? null;
  }

  get trackId() {
    return this._data.trackid ?? null;
  }

  /** XML del ApplicationResponse en base64, si el backend lo incluye. */
  get xmlBase64() {
    return this._data.xml ?? null;
  }

  get(key, fallback = null) {
    return this._data[key] ?? fallback;
  }

  /** @returns {Object} */
  raw() {
    return this._data;
  }

  toJSON() {
    return this._data;
  }
}
