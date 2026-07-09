import { BaseResource } from './BaseResource.js';
import { RadianEvent } from '../responses/RadianEvent.js';

/**
 * Eventos RADIAN — registro de eventos de título valor y acuses/aceptación
 * sobre documentos (paquete `sef/radian`).
 *
 * Prefijo de rutas: `/api/radian` (requiere autenticación `auth:api`).
 */
export class Radian extends BaseResource {
  /**
   * Catálogo de tipos de evento RADIAN disponibles.
   * @returns {Promise<Array<Object>>} Lista de {code, key, name, version}.
   */
  async catalog() {
    return this._http.request('GET', 'api/radian/events/catalog');
  }

  /**
   * Emite un evento RADIAN (ApplicationResponse) sobre un documento de referencia.
   *
   * Por defecto opera en modo PREVIEW (`send=false`): construye y firma el
   * evento y lo persiste sin enviarlo a la DIAN. Para enviarlo use `send=true`.
   *
   * @param {Object}  params            Campos del evento (type_event_code, response_code,
   *                                     description, id, sender, receiver, reference, ...).
   * @param {boolean} [send=false]      true para enviar a la DIAN; false = preview.
   * @returns {Promise<RadianEvent>}
   */
  async emit(params, send = false) {
    const body = { ...params, send };
    return RadianEvent.fromObject(await this._http.request('POST', 'api/radian/events', { body }));
  }

  /**
   * Emite un evento de acuse/aceptación (030–034) sobre un documento RECIBIDO.
   *
   * @param {Object}   opts
   * @param {number}   opts.documentId  Id del documento recibido.
   * @param {string}   opts.eventCode   Código del evento de acuse (030–034).
   * @param {string}   opts.id          Identificador (consecutivo) del evento.
   * @param {string[]} [opts.notes=[]]  Notas opcionales.
   * @param {boolean}  [opts.send=false] true para enviar a la DIAN; false = preview.
   * @returns {Promise<RadianEvent>}
   */
  async acuse({ documentId, eventCode, id, notes = [], send = false }) {
    const body = { event_code: eventCode, id, notes, send };
    return RadianEvent.fromObject(
      await this._http.request('POST', `api/radian/receipt/${documentId}/acuse`, { body })
    );
  }

  /**
   * Estado de salud del módulo RADIAN (tablas y catálogo sembrado).
   * @returns {Promise<Object>}
   */
  async health() {
    return this._http.request('GET', 'api/radian/dian/health');
  }
}
