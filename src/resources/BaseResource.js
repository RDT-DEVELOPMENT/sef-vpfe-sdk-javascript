/**
 * Base de los recursos del SDK. Guarda el transporte HTTP compartido.
 * @internal
 */
export class BaseResource {
  /** @param {import('../http.js').HttpClient} http */
  constructor(http) {
    this._http = http;
  }
}
