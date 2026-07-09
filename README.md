# SDK JavaScript — Facturación electrónica SEF

Cliente JavaScript (Node.js y navegador) para consumir las APIs de los paquetes
de facturación electrónica DIAN de SEF. Es hermano de los SDKs de
[PHP](../php), [Python](../python) y [Java](../cmas) y expone la misma
superficie de recursos.

| Recurso | Paquete backend | Prefijo de rutas |
|---|---|---|
| `ebill` | `sef/ebill` | `/api/ebill` |
| `epayroll` | `sef/epayroll` | `/api/epayroll` |
| `dequivalent` | `sef/dequivalent` | `/api/document/equivalent` |
| `dsupport` | `sef/dsupport` | `/api/document/support` |
| `radian` | `sef/radian` | `/api/radian` |

> **Nota:** este es un SDK de **JavaScript** (Node/navegador). No se usa con
> Maven ni Spring Boot — para consumir estas APIs desde Java (Maven /
> Spring Boot starter) usa el SDK en [`SDKs/cmas`](../cmas).

## Requisitos

- **Node.js >= 18** (usa el `fetch` nativo; sin dependencias de runtime), o
- cualquier navegador / bundler moderno (Vite, webpack, etc.).

El paquete es **ESM** (`import`). Sin dependencias externas.

## Instalación

Al ser un paquete interno, agrégalo por ruta local:

```bash
npm install ../SDKs/javascript
# o en package.json:  "@sef/sdk": "file:../SDKs/javascript"
```

O úsalo directamente dentro de esta carpeta:

```bash
cd SDKs/javascript
npm test
```

En CommonJS (`require`), impórtalo dinámicamente:

```js
const { SefClient } = await import('@sef/sdk');
```

## Uso

```js
import { SefClient } from '@sef/sdk';

// Opción A — token estático (Laravel Passport / Sanctum):
const client = new SefClient({
  baseUrl: 'https://facturacion.midominio.com',
  accessToken: 'MI_TOKEN_PASSPORT',
});

// Opción B — credenciales de Passport (grant password + refresco automático):
const client = new SefClient({
  baseUrl: 'https://facturacion.midominio.com',
  clientId: '3',
  clientSecret: 'secret',
  username: 'usuario@empresa.com',
  password: '********',
});

// Factura electrónica
const res = await client.ebill.invoice(payload);
res.uuid;      // CUFE
res.qr;        // URL del QR DIAN
res.isValid;   // ¿validado por la DIAN?
res.xml;       // XML decodificado

// Nómina electrónica
await client.epayroll.invoice(payload);
await client.epayroll.adjustmentNote(payload);

// Documento equivalente
await client.dequivalent.invoice(payload);

// Documento soporte
await client.dsupport.invoice(payload);
await client.dsupport.adjustmentNote(payload);

// RADIAN
const eventos = await client.radian.catalog();
const evento  = await client.radian.emit(params, /* send */ false); // preview
const acuse   = await client.radian.acuse({ documentId: 123, eventCode: '030', id: 'AC-1', send: false });
const estado  = await client.radian.health();
```

También puedes construir el cliente desde variables de entorno
(`SEF_BASE_URL`, `SEF_ACCESS_TOKEN` o `SEF_CLIENT_ID`/`SEF_CLIENT_SECRET`/
`SEF_USERNAME`/`SEF_PASSWORD`, etc.):

```js
const client = SefClient.fromEnv(); // prefijo "SEF_" por defecto
```

### Modo simulación

Los recursos de documentos aceptan un segundo argumento `simulated`, que usa los
endpoints `/simulated` del backend (requiere `SIMULATION_ENABLED=true`):

```js
await client.ebill.invoice(payload, true);
```

## Respuestas

Los métodos de documentos devuelven un `EmissionResponse` con accesores sobre la
estructura estándar del backend (`ResponseClient::getStructuredData`):

`idTransaction`, `number`, `message`, `statusMessage`, `statusCode`, `isTest`,
`isSimulated`, `isValid`, `isAsync`, `trackId`, `uuid`, `typeUuid`, `qr`,
`xmlBase64`, `xml` (decodificado), `errors`, `hasErrors`, `statuses`, `events`,
`properties`, además de `get(key, def)` y `raw()` para el objeto completo.

Los métodos de RADIAN `emit()` / `acuse()` devuelven un `RadianEvent`
(`id`, `eventCode`, `uuid` (CUDE), `trackId`, `xmlBase64`, `get()`, `raw()`);
`catalog()` y `health()` devuelven objetos/arrays sin envolver.

## Manejo de errores

Todos los errores extienden `SefError`:

- `ValidationError` — HTTP 422; `err.errors` trae el mapa campo→mensajes de Laravel.
- `AuthenticationError` — HTTP 401 / 403.
- `NotFoundError` — HTTP 404.
- `ApiError` — cualquier otro error HTTP; `err.statusCode`, `err.body`, `err.requestId`.
- `SefAuthError` — fallo obteniendo/renovando el token OAuth2.
- `ConnectionError` / `TimeoutError` — fallos de red / timeout.
- `SefConfigError` — configuración inválida.

```js
import { ValidationError, ApiError } from '@sef/sdk';

try {
  await client.ebill.invoice(payload);
} catch (err) {
  if (err instanceof ValidationError) {
    console.error(err.errors);
  } else if (err instanceof ApiError) {
    console.error(err.statusCode, err.message);
  }
}
```

## Autenticación

- Los endpoints de RADIAN requieren `auth:api` (Passport). Envía siempre el token.
- Los endpoints de documentos van tras el middleware de sincronización a FE
  Warehouse; configura el token igualmente si tu despliegue exige autenticación.
- El SDK renueva el token automáticamente (usando `refresh_token` o repitiendo el
  grant password) y reintenta una vez ante un `401`.

## Opciones de configuración

| Opción | Por defecto | Descripción |
|---|---|---|
| `baseUrl` | — | **Obligatorio.** URL base sin `/api`. |
| `accessToken` | — | Token Bearer estático. |
| `clientId`, `clientSecret`, `username`, `password` | — | Grant password de Passport. |
| `grantType` | `password` | Tipo de grant OAuth2. |
| `scope` | `''` | Scope OAuth2. |
| `tokenUrl` | `/oauth/token` | Endpoint de token. |
| `timeout` | `60000` | Timeout por petición (ms). |
| `maxRetries` | `2` | Reintentos ante 5xx/429/red (GET/HEAD/OPTIONS). |
| `verifySsl` | `true` | Verificación TLS (solo Node; requiere `undici` para desactivar). |
| `defaultHeaders` | `{}` | Cabeceras extra en cada petición. |
| `fetch` | global | Implementación de `fetch` a inyectar (tests, polyfills). |
| `dispatcher` | — | Dispatcher de `undici` (proxy, TLS a medida). |

## Desarrollo

```bash
npm test   # node --test, con fetch simulado (sin red)
```

Ver ejemplos ejecutables en [`examples/`](examples/).
