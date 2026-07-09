import { SefAuthError } from './exceptions.js';

/**
 * Gestión de autenticación OAuth2 (Laravel Passport).
 *
 * Soporta:
 *  - Token estático (`accessToken` en la configuración).
 *  - Grant `password` contra `POST {tokenUrl}`, con refresco automático usando
 *    `refresh_token` si el servidor lo entrega, o reintentando con
 *    usuario/contraseña.
 *
 * Es seguro llamar a {@link TokenProvider#getToken} de forma concurrente: las
 * peticiones simultáneas comparten una sola solicitud de token en vuelo.
 */
export class TokenProvider {
  /** Margen (ms) antes de la expiración para renovar proactivamente. */
  static LEEWAY_MS = 30_000;

  /**
   * @param {import('./config.js').SefConfig} config
   * @param {typeof fetch} fetchImpl
   */
  constructor(config, fetchImpl) {
    this._config = config;
    this._fetch = fetchImpl;

    this._accessToken = config.accessToken ?? null;
    this._refreshToken = null;
    /** Marca temporal (ms, Date.now) de expiración; null = sin expiración conocida. */
    this._expiresAt = null;
    /** @type {Promise<string>|null} Solicitud de token en curso, para deduplicar. */
    this._pending = null;
  }

  /**
   * Devuelve un token válido, renovándolo si es necesario.
   * @param {boolean} [forceRefresh=false]
   * @returns {Promise<string>}
   */
  async getToken(forceRefresh = false) {
    if (!forceRefresh && this._tokenIsValid()) {
      return this._accessToken;
    }

    if (this._config.hasPasswordCredentials) {
      if (!this._pending) {
        this._pending = this._requestToken().finally(() => {
          this._pending = null;
        });
      }
      return this._pending;
    }

    if (this._accessToken && !forceRefresh) {
      // Token estático sin credenciales para refrescar: se usa tal cual.
      return this._accessToken;
    }

    throw new SefAuthError(
      'No hay un token válido y no se dispone de credenciales de Passport para solicitar uno nuevo.'
    );
  }

  /** Marca el token actual como inválido (fuerza renovación en el próximo uso). */
  invalidate() {
    this._expiresAt = 0;
  }

  // -- internos --------------------------------------------------------------

  _tokenIsValid() {
    if (!this._accessToken) return false;
    if (this._expiresAt == null) return true; // token estático
    return Date.now() < this._expiresAt - TokenProvider.LEEWAY_MS;
  }

  /**
   * @param {boolean} [allowRefresh=true]
   * @returns {Promise<string>}
   */
  async _requestToken(allowRefresh = true) {
    const cfg = this._config;
    const useRefresh = allowRefresh && Boolean(this._refreshToken);

    const data = useRefresh
      ? {
          grant_type: 'refresh_token',
          refresh_token: this._refreshToken,
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          scope: cfg.scope,
        }
      : {
          grant_type: cfg.grantType,
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          username: cfg.username,
          password: cfg.password,
          scope: cfg.scope,
        };

    const url = `${cfg.baseUrl}${cfg.tokenUrl}`;
    let resp;
    try {
      resp = await this._fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': cfg.userAgent,
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(cfg.timeout),
      });
    } catch (exc) {
      if (useRefresh) {
        // El refresh falló por red: intentar login completo.
        this._refreshToken = null;
        return this._requestToken(false);
      }
      throw new SefAuthError(`No se pudo conectar al endpoint de token: ${exc.message}`, {
        cause: exc,
      });
    }

    if (resp.status >= 400) {
      if (useRefresh) {
        // refresh_token inválido/expirado -> reintentar con password grant.
        this._refreshToken = null;
        return this._requestToken(false);
      }
      const text = await safeText(resp);
      throw new SefAuthError(`Fallo de autenticación OAuth2 (HTTP ${resp.status}): ${text}`);
    }

    let body;
    try {
      body = await resp.json();
    } catch (exc) {
      throw new SefAuthError('La respuesta del endpoint de token no es JSON válido.', {
        cause: exc,
      });
    }

    const token = body.access_token;
    if (!token) {
      throw new SefAuthError(
        `El endpoint de token no devolvió 'access_token': ${JSON.stringify(body)}`
      );
    }

    this._accessToken = token;
    this._refreshToken = body.refresh_token || this._refreshToken;
    this._expiresAt = body.expires_in ? Date.now() + Number(body.expires_in) * 1000 : null;
    return token;
  }
}

async function safeText(resp) {
  try {
    return await resp.text();
  } catch {
    return '';
  }
}
