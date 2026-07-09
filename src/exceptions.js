/**
 * Jerarquía de errores del SDK SEF.
 *
 * Todos los errores extienden {@link SefError}, de modo que un solo `catch`
 * puede capturar cualquier fallo originado por el SDK.
 */

/** Error base de todo el SDK. */
export class SefError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'SefError';
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

/** Configuración inválida (falta base_url, credenciales, etc.). */
export class SefConfigError extends SefError {
  constructor(message, options) {
    super(message, options);
    this.name = 'SefConfigError';
  }
}

/** Fallo al obtener/renovar el token OAuth2 (Laravel Passport). */
export class SefAuthError extends SefError {
  constructor(message, options) {
    super(message, options);
    this.name = 'SefAuthError';
  }
}

/** Fallo de red/conexión con el servidor. */
export class ConnectionError extends SefError {
  constructor(message, options) {
    super(message, options);
    this.name = 'ConnectionError';
  }
}

/** La petición superó el timeout configurado. */
export class TimeoutError extends SefError {
  constructor(message, options) {
    super(message, options);
    this.name = 'TimeoutError';
  }
}

/**
 * Error devuelto por la API (respuesta HTTP no 2xx).
 *
 * @property {number} statusCode Código HTTP.
 * @property {*}      body       Cuerpo de la respuesta (objeto JSON o texto).
 * @property {object|null} errors Mapa campo→mensajes (validación Laravel), si aplica.
 * @property {string|null} requestId Cabecera X-Request-Id, si el servidor la envía.
 */
export class ApiError extends SefError {
  constructor(message, { statusCode, body = null, errors = null, requestId = null, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.body = body;
    this.errors = errors;
    this.requestId = requestId;
  }
}

/** Error de autenticación/autorización (HTTP 401 / 403). */
export class AuthenticationError extends ApiError {
  constructor(message, opts) {
    super(message, opts);
    this.name = 'AuthenticationError';
  }
}

/** Error de validación (HTTP 422). `errors` trae el mapa campo→mensajes. */
export class ValidationError extends ApiError {
  constructor(message, opts) {
    super(message, opts);
    this.name = 'ValidationError';
  }
}

/** Recurso no encontrado (HTTP 404). */
export class NotFoundError extends ApiError {
  constructor(message, opts) {
    super(message, opts);
    this.name = 'NotFoundError';
  }
}

/**
 * Selecciona la clase de error adecuada según el código HTTP.
 *
 * @param {number} status
 * @returns {typeof ApiError}
 */
export function exceptionForStatus(status) {
  if (status === 401 || status === 403) return AuthenticationError;
  if (status === 404) return NotFoundError;
  if (status === 422) return ValidationError;
  return ApiError;
}
