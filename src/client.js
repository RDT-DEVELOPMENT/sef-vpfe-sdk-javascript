import { SefConfig } from './config.js';
import { HttpClient } from './http.js';
import { Ebill } from './resources/Ebill.js';
import { Epayroll } from './resources/Epayroll.js';
import { Dequivalent } from './resources/Dequivalent.js';
import { Dsupport } from './resources/Dsupport.js';
import { Radian } from './resources/Radian.js';

/**
 * Punto de entrada del SDK de facturación electrónica SEF.
 *
 * Expone un recurso por cada paquete backend:
 *  - {@link Ebill}       — Factura electrónica de venta (`sef/ebill`).
 *  - {@link Epayroll}    — Nómina electrónica (`sef/epayroll`).
 *  - {@link Dequivalent} — Documento equivalente (`sef/dequivalent`).
 *  - {@link Dsupport}    — Documento soporte (`sef/dsupport`).
 *  - {@link Radian}      — Eventos RADIAN y acuses (`sef/radian`).
 *
 * @example
 * import { SefClient } from '@sef/sdk';
 *
 * // Con token estático (Passport/Sanctum):
 * const client = new SefClient({ baseUrl: 'https://fe.midominio.com', accessToken: 'MI_TOKEN' });
 *
 * // O con credenciales de Passport (grant password, refresco automático):
 * const client = new SefClient({
 *   baseUrl: 'https://fe.midominio.com',
 *   clientId: '3', clientSecret: 'secret',
 *   username: 'usuario@empresa.com', password: '********',
 * });
 *
 * const res = await client.ebill.invoice(payload);
 * console.log(res.uuid, res.isValid);
 */
export class SefClient {
  /**
   * @param {import('./config.js').SefConfigOptions | SefConfig} [options]
   */
  constructor(options = {}) {
    this._config = options instanceof SefConfig ? options : new SefConfig(options);
    this._http = new HttpClient(this._config);
    this._tokens = this._http.tokens;

    /** @type {Ebill} */
    this.ebill = new Ebill(this._http);
    /** @type {Epayroll} */
    this.epayroll = new Epayroll(this._http);
    /** @type {Dequivalent} */
    this.dequivalent = new Dequivalent(this._http);
    /** @type {Dsupport} */
    this.dsupport = new Dsupport(this._http);
    /** @type {Radian} */
    this.radian = new Radian(this._http);
  }

  /**
   * Crea un cliente leyendo la configuración de variables de entorno.
   * @param {string} [prefix="SEF_"]
   * @returns {SefClient}
   */
  static fromEnv(prefix = 'SEF_') {
    return new SefClient(SefConfig.fromEnv(prefix));
  }

  /** @returns {SefConfig} */
  get config() {
    return this._config;
  }

  /**
   * Fuerza la obtención del token y lo devuelve (útil para depurar auth).
   * @returns {Promise<string>}
   */
  token() {
    return this._tokens.getToken();
  }
}
