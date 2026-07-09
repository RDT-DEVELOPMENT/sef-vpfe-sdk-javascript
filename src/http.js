import { TokenProvider } from './auth.js';
import {
  ApiError,
  ConnectionError,
  TimeoutError,
  exceptionForStatus,
} from './exceptions.js';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Resuelve la implementación de `fetch` a usar: la de la configuración, la
 * global (Node 18+/navegador), o lanza si no hay ninguna.
 * @param {import('./config.js').SefConfig} config
 * @returns {typeof fetch}
 */
function resolveFetch(config) {
  const impl = config.fetch ?? (typeof fetch !== 'undefined' ? fetch : null);
  if (!impl) {
    throw new ApiError(
      'No hay implementación de fetch disponible. Usa Node >= 18 o pasa `fetch` en la configuración.',
      { statusCode: 0 }
    );
  }
  // Preserva el `this` correcto (p.ej. window.fetch).
  return impl.bind(config.fetch ? null : globalThis);
}

/**
 * Transporte HTTP de bajo nivel: inyecta el Bearer token, reintenta errores
 * transitorios con backoff exponencial y traduce respuestas no 2xx a errores
 * del SDK. Uso interno de los recursos.
 */
export class HttpClient {
  /**
   * @param {import('./config.js').SefConfig} config
   * @param {TokenProvider} [tokenProvider]
   */
  constructor(config, tokenProvider) {
    this._config = config;
    this._fetch = resolveFetch(config);
    this._tokens = tokenProvider ?? new TokenProvider(config, this._fetch);
    /** Dispatcher de undici (Node) para desactivar TLS; se resuelve perezosamente. */
    this._dispatcher = config.dispatcher ?? null;
    this._dispatcherReady = false;
  }

  get config() {
    return this._config;
  }

  get tokens() {
    return this._tokens;
  }

  /**
   * Ejecuta una petición y devuelve el cuerpo JSON deserializado.
   *
   * @param {string} method  Verbo HTTP.
   * @param {string} path    Ruta relativa a baseUrl (empieza con "/").
   * @param {Object} [opts]
   * @param {*}       [opts.body]          Cuerpo JSON.
   * @param {Object}  [opts.query]         Parámetros de query string.
   * @param {boolean} [opts.authenticated=true]
   * @param {number[]}[opts.expectedStatus] Códigos considerados exitosos (por defecto cualquier 2xx).
   * @returns {Promise<*>}
   */
  async request(method, path, { body, query, authenticated = true, expectedStatus } = {}) {
    method = method.toUpperCase();
    const url = this._buildUrl(path, query);
    const attempts = this._config.maxRetries + 1;
    let lastError = null;

    await this._ensureDispatcher();

    for (let attempt = 0; attempt < attempts; attempt++) {
      const headers = await this._buildHeaders(authenticated);
      let resp;
      try {
        resp = await this._fetch(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(this._config.timeout),
          ...(this._dispatcher ? { dispatcher: this._dispatcher } : {}),
        });
      } catch (exc) {
        const isTimeout = exc?.name === 'TimeoutError' || exc?.name === 'AbortError';
        lastError = isTimeout
          ? new TimeoutError(`Timeout tras ${this._config.timeout}ms en ${method} ${url}`, {
              cause: exc,
            })
          : new ConnectionError(`Error de conexión en ${method} ${url}: ${exc.message}`, {
              cause: exc,
            });
        if (this._shouldRetryNetwork(method, attempt, attempts)) {
          await this._backoff(attempt);
          continue;
        }
        throw lastError;
      }

      // 401: token posiblemente expirado -> refrescar una vez y reintentar,
      // siempre que queden intentos disponibles.
      if (resp.status === 401 && authenticated && attempt === 0 && attempt < attempts - 1) {
        this._tokens.invalidate();
        continue;
      }

      if (RETRYABLE_STATUS.has(resp.status) && attempt < attempts - 1) {
        await this._backoff(attempt, resp);
        continue;
      }

      return this._handleResponse(resp, expectedStatus);
    }

    throw lastError ?? new ApiError('Fallo desconocido en la petición HTTP.', { statusCode: 0 });
  }

  // -- helpers ---------------------------------------------------------------

  _buildUrl(path, query) {
    const url = `${this._config.baseUrl}/${String(path).replace(/^\/+/, '')}`;
    if (!query) return url;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) params.append(key, String(value));
    }
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  }

  async _buildHeaders(authenticated) {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': this._config.userAgent,
      ...this._config.defaultHeaders,
    };
    if (authenticated) {
      headers.Authorization = `Bearer ${await this._tokens.getToken()}`;
    }
    return headers;
  }

  _shouldRetryNetwork(method, attempt, attempts) {
    return IDEMPOTENT_METHODS.has(method) && attempt < attempts - 1;
  }

  /**
   * Si `verifySsl` es false en Node y no se pasó un dispatcher explícito, carga
   * undici de forma perezosa para desactivar la verificación TLS. En el
   * navegador no aplica.
   */
  async _ensureDispatcher() {
    if (this._dispatcherReady) return;
    this._dispatcherReady = true;
    if (this._dispatcher || this._config.verifySsl !== false) return;
    if (typeof process === 'undefined' || !process.versions?.node) return;
    try {
      const { Agent } = await import('undici');
      this._dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
    } catch {
      // undici no disponible: se seguirá con verificación TLS por defecto.
    }
  }

  async _backoff(attempt, resp) {
    let delay = Math.min(500 * 2 ** attempt, 8000);
    const retryAfter = resp?.headers?.get?.('Retry-After');
    if (retryAfter) {
      const parsed = Number(retryAfter);
      if (!Number.isNaN(parsed)) delay = Math.min(parsed * 1000, 30000);
    }
    await new Promise((r) => setTimeout(r, delay));
  }

  async _handleResponse(resp, expectedStatus) {
    const body = await parseBody(resp);
    const ok = expectedStatus
      ? expectedStatus.includes(resp.status)
      : resp.status >= 200 && resp.status < 300;

    if (ok) return body;

    const { message, errors } = extractError(body, resp);
    const ErrorClass = exceptionForStatus(resp.status);
    throw new ErrorClass(message, {
      statusCode: resp.status,
      body,
      errors,
      requestId: resp.headers?.get?.('X-Request-Id') ?? null,
    });
  }
}

async function parseBody(resp) {
  const text = await safeText(resp);
  if (!text) return null;
  const ctype = resp.headers?.get?.('Content-Type') ?? '';
  if (ctype.includes('application/json') || /^\s*[[{]/.test(text)) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function extractError(body, resp) {
  let message = `La API respondió con estado ${resp.status}.`;
  let errors = null;
  if (body && typeof body === 'object') {
    message = body.message || body.error || message;
    errors = body.errors ?? null;
  } else if (typeof body === 'string' && body.trim()) {
    message = body.trim().slice(0, 500);
  }
  return { message, errors };
}

async function safeText(resp) {
  try {
    return await resp.text();
  } catch {
    return '';
  }
}
