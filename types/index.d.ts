/**
 * Definiciones de tipos para @sef/sdk — SDK de facturación electrónica DIAN de SEF.
 */

export interface SefConfigOptions {
  /** URL base del servidor SEF (sin `/api`). Ej: https://fe.midominio.com */
  baseUrl: string;
  /** Token Bearer ya emitido (Passport/Sanctum). Si se entrega, no se pide por OAuth2. */
  accessToken?: string;
  /** client_id del grant password de Passport. */
  clientId?: string;
  /** client_secret de Passport. */
  clientSecret?: string;
  /** Usuario para el grant password. */
  username?: string;
  /** Contraseña para el grant password. */
  password?: string;
  /** Tipo de grant OAuth2 (por defecto "password"). */
  grantType?: string;
  /** Scope OAuth2 (por defecto ""). */
  scope?: string;
  /** Ruta del endpoint de token (por defecto "/oauth/token"). */
  tokenUrl?: string;
  /** Timeout por petición en milisegundos (por defecto 60000). */
  timeout?: number;
  /** Reintentos ante errores transitorios (por defecto 2). */
  maxRetries?: number;
  /** Verificar TLS (solo Node). Ponlo en false únicamente en pruebas. */
  verifySsl?: boolean;
  /** Cabecera User-Agent. */
  userAgent?: string;
  /** Cabeceras adicionales en cada petición. */
  defaultHeaders?: Record<string, string>;
  /** Implementación de fetch a usar (por defecto la global). */
  fetch?: typeof fetch;
  /** Dispatcher de undici (Node) para control fino de la conexión. */
  dispatcher?: unknown;
}

export class SefConfig {
  constructor(options: SefConfigOptions);
  baseUrl: string;
  accessToken: string | null;
  clientId: string | null;
  clientSecret: string | null;
  username: string | null;
  password: string | null;
  grantType: string;
  scope: string;
  tokenUrl: string;
  timeout: number;
  maxRetries: number;
  verifySsl: boolean;
  userAgent: string;
  defaultHeaders: Record<string, string>;
  fetch: typeof fetch | null;
  dispatcher: unknown;
  readonly hasStaticToken: boolean;
  readonly hasPasswordCredentials: boolean;
  static fromEnv(prefix?: string, env?: Record<string, string | undefined>): SefConfig;
}

export class TokenProvider {
  constructor(config: SefConfig, fetchImpl: typeof fetch);
  static LEEWAY_MS: number;
  getToken(forceRefresh?: boolean): Promise<string>;
  invalidate(): void;
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, unknown>;
  authenticated?: boolean;
  expectedStatus?: number[];
}

export class HttpClient {
  constructor(config: SefConfig, tokenProvider?: TokenProvider);
  readonly config: SefConfig;
  readonly tokens: TokenProvider;
  request(method: string, path: string, opts?: RequestOptions): Promise<any>;
}

/** Respuesta estandarizada de emisión de documento electrónico. */
export class EmissionResponse {
  constructor(data: Record<string, any>);
  static fromObject(data: Record<string, any>): EmissionResponse;
  readonly idTransaction: number | string | null;
  readonly number: number | string | null;
  readonly message: string | null;
  readonly statusMessage: string | null;
  readonly statusCode: number | string | null;
  readonly isTest: boolean | null;
  readonly isSimulated: boolean | null;
  readonly isValid: boolean | null;
  readonly isAsync: boolean | null;
  readonly trackId: string | null;
  readonly uuid: string | null;
  readonly typeUuid: string | null;
  readonly qr: string | null;
  readonly xmlBase64: string | null;
  readonly xml: string | null;
  readonly errors: any[];
  readonly hasErrors: boolean;
  readonly statuses: Record<string, any>;
  readonly events: any[];
  readonly properties: any[];
  get<T = any>(key: string, fallback?: T): T;
  raw(): Record<string, any>;
  toJSON(): Record<string, any>;
}

/** Evento RADIAN devuelto por emisión/acuse. */
export class RadianEvent {
  constructor(data: Record<string, any>);
  static fromObject(data: Record<string, any>): RadianEvent;
  readonly id: number | string | null;
  readonly eventCode: string | null;
  readonly uuid: string | null;
  readonly trackId: string | null;
  readonly xmlBase64: string | null;
  get<T = any>(key: string, fallback?: T): T;
  raw(): Record<string, any>;
  toJSON(): Record<string, any>;
}

export type Payload = Record<string, any>;

export class Ebill {
  invoice(payload: Payload, simulated?: boolean): Promise<EmissionResponse>;
  adjustmentNote(payload: Payload, simulated?: boolean): Promise<EmissionResponse>;
}

export class Epayroll {
  invoice(payload: Payload, simulated?: boolean): Promise<EmissionResponse>;
  adjustmentNote(payload: Payload, simulated?: boolean): Promise<EmissionResponse>;
}

export class Dequivalent {
  invoice(payload: Payload, simulated?: boolean): Promise<EmissionResponse>;
  adjustmentNote(payload: Payload, simulated?: boolean): Promise<EmissionResponse>;
}

export class Dsupport {
  invoice(payload: Payload, simulated?: boolean): Promise<EmissionResponse>;
  adjustmentNote(payload: Payload, simulated?: boolean): Promise<EmissionResponse>;
}

export interface RadianCatalogEntry {
  code: string;
  key?: string;
  name: string;
  version?: string;
  [k: string]: any;
}

export interface RadianAcuseOptions {
  documentId: number;
  eventCode: string;
  id: string;
  notes?: string[];
  send?: boolean;
}

export class Radian {
  catalog(): Promise<RadianCatalogEntry[]>;
  emit(params: Payload, send?: boolean): Promise<RadianEvent>;
  acuse(opts: RadianAcuseOptions): Promise<RadianEvent>;
  health(): Promise<Record<string, any>>;
}

export class SefClient {
  constructor(options?: SefConfigOptions | SefConfig);
  static fromEnv(prefix?: string): SefClient;
  readonly config: SefConfig;
  ebill: Ebill;
  epayroll: Epayroll;
  dequivalent: Dequivalent;
  dsupport: Dsupport;
  radian: Radian;
  token(): Promise<string>;
}

export class SefError extends Error {
  cause?: unknown;
}
export class SefConfigError extends SefError {}
export class SefAuthError extends SefError {}
export class ConnectionError extends SefError {}
export class TimeoutError extends SefError {}
export class ApiError extends SefError {
  statusCode: number;
  body: any;
  errors: Record<string, string[]> | null;
  requestId: string | null;
}
export class AuthenticationError extends ApiError {}
export class ValidationError extends ApiError {}
export class NotFoundError extends ApiError {}
export function exceptionForStatus(status: number): typeof ApiError;

export default SefClient;
