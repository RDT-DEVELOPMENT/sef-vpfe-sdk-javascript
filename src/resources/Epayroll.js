import { BaseResource } from './BaseResource.js';
import { EmissionResponse } from '../responses/EmissionResponse.js';

/**
 * Nómina electrónica (paquete `sef/epayroll`).
 *
 * Prefijo de rutas: `/api/epayroll`.
 */
export class Epayroll extends BaseResource {
  /**
   * Emite una nómina individual.
   *
   * @param {Object}  payload
   * @param {boolean} [simulated=false]
   * @returns {Promise<EmissionResponse>}
   */
  async invoice(payload, simulated = false) {
    const path = simulated ? 'api/epayroll/invoice/simulated' : 'api/epayroll/invoice';
    return EmissionResponse.fromObject(await this._http.request('POST', path, { body: payload }));
  }

  /**
   * Emite una nómina individual de ajuste.
   *
   * @param {Object}  payload
   * @param {boolean} [simulated=false]
   * @returns {Promise<EmissionResponse>}
   */
  async adjustmentNote(payload, simulated = false) {
    const path = simulated
      ? 'api/epayroll/adjustment-note/simulated'
      : 'api/epayroll/adjustment-note';
    return EmissionResponse.fromObject(await this._http.request('POST', path, { body: payload }));
  }
}
