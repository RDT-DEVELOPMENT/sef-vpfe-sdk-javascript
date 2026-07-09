import { BaseResource } from './BaseResource.js';
import { EmissionResponse } from '../responses/EmissionResponse.js';

/**
 * Documento equivalente electrónico (paquete `sef/dequivalent`).
 *
 * Prefijo de rutas: `/api/document/equivalent`.
 */
export class Dequivalent extends BaseResource {
  /**
   * Emite un documento equivalente.
   *
   * @param {Object}  payload
   * @param {boolean} [simulated=false]
   * @returns {Promise<EmissionResponse>}
   */
  async invoice(payload, simulated = false) {
    const path = simulated
      ? 'api/document/equivalent/invoice/simulated'
      : 'api/document/equivalent/invoice';
    return EmissionResponse.fromObject(await this._http.request('POST', path, { body: payload }));
  }

  /**
   * Emite una nota de ajuste de documento equivalente.
   * Nota: el backend usa la ortografía "adjusment-note".
   *
   * @param {Object}  payload
   * @param {boolean} [simulated=false]
   * @returns {Promise<EmissionResponse>}
   */
  async adjustmentNote(payload, simulated = false) {
    const path = simulated
      ? 'api/document/equivalent/adjusment-note/simulated'
      : 'api/document/equivalent/adjusment-note';
    return EmissionResponse.fromObject(await this._http.request('POST', path, { body: payload }));
  }
}
