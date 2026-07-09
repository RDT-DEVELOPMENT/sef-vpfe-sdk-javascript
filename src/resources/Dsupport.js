import { BaseResource } from './BaseResource.js';
import { EmissionResponse } from '../responses/EmissionResponse.js';

/**
 * Documento soporte en adquisiciones a no obligados a facturar
 * (paquete `sef/dsupport`).
 *
 * Prefijo de rutas: `/api/document/support`.
 */
export class Dsupport extends BaseResource {
  /**
   * Emite un documento soporte.
   *
   * @param {Object}  payload
   * @param {boolean} [simulated=false]
   * @returns {Promise<EmissionResponse>}
   */
  async invoice(payload, simulated = false) {
    const path = simulated
      ? 'api/document/support/invoice/simulated'
      : 'api/document/support/invoice';
    return EmissionResponse.fromObject(await this._http.request('POST', path, { body: payload }));
  }

  /**
   * Emite una nota de ajuste (nota crédito) del documento soporte.
   *
   * @param {Object}  payload
   * @param {boolean} [simulated=false]
   * @returns {Promise<EmissionResponse>}
   */
  async adjustmentNote(payload, simulated = false) {
    const path = simulated
      ? 'api/document/support/adjustment-note/simulated'
      : 'api/document/support/adjustment-note';
    return EmissionResponse.fromObject(await this._http.request('POST', path, { body: payload }));
  }
}
