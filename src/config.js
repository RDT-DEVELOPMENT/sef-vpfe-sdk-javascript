import { SefConfigError } from './exceptions.js';

/**
 * @typedef {Object} SefConfigOptions
 * @property {string}  baseUrl        URL base del servidor SEF (sin `/api`). Ej: https://fe.midominio.com
 * @property {string} [accessToken]   Token Bearer ya emitido (Passport/Sanctum). Si se entrega, no se solicita por OAuth2.
 * @property {string} [clientId]      client_id del grant password de Passport.
 * @property {string} [clientSecret]  client_secret de Passport.
 * @property {string} [username]      Usuario para el grant password.
 * @property {string} [password]      Contraseña para el grant password.
 * @property {string} [grantType]     Tipo de grant OAuth2 (por defecto "password").
 * @property {string} [scope]         Scope OAuth2 (por defecto "").
 * @property {string} [tokenUrl]      Ruta del endpoint de token (por defecto "/oauth/token").
 * @property {number} [timeout]       Timeout por petición en milisegundos (por defecto 60000).
 * @property {number} [maxRetries]    Reintentos ante errores transitorios (5xx, 429, red). Por defecto 2.
 * @property {boolean}[verifySsl]     Verificar TLS. Solo aplica en Node; ponlo en false únicamente en pruebas.
 * @property {string} [userAgent]     Cabecera User-Agent.
 * @property {Object.<string,string>} [defaultHeaders] Cabeceras adicionales en cada petición.
 * @property {typeof fetch} [fetch]   Implementación de fetch a usar (por defecto la global).
 * @property {*}       [dispatcher]   Dispatcher de undici (Node) para control fino de la conexión (proxy, TLS).
 */

/**
 * Configuración del cliente del SDK.
 *
 * Puede construirse manualmente o desde variables de entorno con
 * {@link SefConfig.fromEnv}.
 */
export class SefConfig {
  /** @param {SefConfigOptions} options */
  constructor(options = {}) {
    if (!options.baseUrl) {
      throw new SefConfigError("'baseUrl' es obligatorio.");
    }

    this.baseUrl = String(options.baseUrl).replace(/\/+$/, '');
    this.accessToken = options.accessToken ?? null;

    this.clientId = options.clientId ?? null;
    this.clientSecret = options.clientSecret ?? null;
    this.username = options.username ?? null;
    this.password = options.password ?? null;
    this.grantType = options.grantType ?? 'password';
    this.scope = options.scope ?? '';

    this.tokenUrl = options.tokenUrl ?? '/oauth/token';
    this.timeout = options.timeout ?? 60000;
    this.maxRetries = options.maxRetries ?? 2;
    this.verifySsl = options.verifySsl ?? true;
    this.userAgent = options.userAgent ?? 'sef-sdk-js/1.0.0';
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.fetch = options.fetch ?? null;
    this.dispatcher = options.dispatcher ?? null;

    if (!this.hasStaticToken && !this.hasPasswordCredentials) {
      throw new SefConfigError(
        'Debe proporcionar un accessToken o las credenciales de Passport ' +
          '(clientId, clientSecret, username, password).'
      );
    }
  }

  /** @returns {boolean} */
  get hasStaticToken() {
    return Boolean(this.accessToken);
  }

  /** @returns {boolean} */
  get hasPasswordCredentials() {
    return Boolean(this.clientId && this.clientSecret && this.username && this.password);
  }

  /**
   * Construye la configuración desde variables de entorno (Node).
   *
   * Reconoce (con el prefijo indicado, `SEF_` por defecto): `BASE_URL`,
   * `ACCESS_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`, `USERNAME`, `PASSWORD`,
   * `GRANT_TYPE`, `SCOPE`, `TOKEN_URL`, `TIMEOUT`, `MAX_RETRIES`, `VERIFY_SSL`.
   *
   * @param {string} [prefix="SEF_"]
   * @param {Object.<string,string>} [env=process.env]
   * @returns {SefConfig}
   */
  static fromEnv(prefix = 'SEF_', env = (typeof process !== 'undefined' ? process.env : {})) {
    const get = (name) => env[`${prefix}${name}`];

    const baseUrl = get('BASE_URL');
    if (!baseUrl) {
      throw new SefConfigError(`Falta la variable de entorno ${prefix}BASE_URL.`);
    }

    const verifyRaw = get('VERIFY_SSL');
    const verifySsl =
      verifyRaw == null ? true : !['0', 'false', 'no'].includes(verifyRaw.toLowerCase());

    return new SefConfig({
      baseUrl,
      accessToken: get('ACCESS_TOKEN'),
      clientId: get('CLIENT_ID'),
      clientSecret: get('CLIENT_SECRET'),
      username: get('USERNAME'),
      password: get('PASSWORD'),
      grantType: get('GRANT_TYPE') || 'password',
      scope: get('SCOPE') || '',
      tokenUrl: get('TOKEN_URL') || '/oauth/token',
      timeout: get('TIMEOUT') ? Number(get('TIMEOUT')) : 60000,
      maxRetries: get('MAX_RETRIES') ? Number(get('MAX_RETRIES')) : 2,
      verifySsl,
    });
  }
}
