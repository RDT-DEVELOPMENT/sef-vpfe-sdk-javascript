import { BaseResource } from './BaseResource.js';
import { EmissionResponse } from '../responses/EmissionResponse.js';

/**
 * Factura electrónica de venta (paquete `sef/ebill`).
 *
 * Prefijo de rutas: `/api/ebill`.
 */
export class Ebill extends BaseResource {
  /**
   * Emite una factura electrónica.
   *
   * @param {Object}  payload           Documento UBL21 (ver docs Swagger de ebill).
   * @param {boolean} [simulated=false] Usa el endpoint de simulación (requiere SIMULATION_ENABLED).
   * @returns {Promise<EmissionResponse>}
   */
  async invoice(payload, simulated = false) {
    const path = simulated ? 'api/ebill/invoice/simulated' : 'api/ebill/invoice';
    return EmissionResponse.fromObject(await this._http.request('POST', path, { body: payload }));
  }

  /**
   * Emite una nota de ajuste (crédito/débito) sobre una factura.
   * Nota: el backend usa la ortografía "adjusment-note".
   *
   * @param {Object}  payload
   * @param {boolean} [simulated=false]
   * @returns {Promise<EmissionResponse>}
   */
  async adjustmentNote(payload, simulated = false) {
    const path = simulated ? 'api/ebill/adjusment-note/simulated' : 'api/ebill/adjusment-note';
    return EmissionResponse.fromObject(await this._http.request('POST', path, { body: payload }));
  }
}
