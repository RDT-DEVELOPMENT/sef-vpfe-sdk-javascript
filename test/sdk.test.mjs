import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SefClient,
  SefConfig,
  SefConfigError,
  ValidationError,
  AuthenticationError,
  ApiError,
  EmissionResponse,
} from '../src/index.js';

/**
 * Crea un `fetch` simulado.
 * @param {(url:string, init:object) => {status?:number, json?:any, text?:string, headers?:object}} handler
 */
function mockFetch(handler) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url, init });
    const r = handler(url, init) ?? {};
    const status = r.status ?? 200;
    const headers = new Map(Object.entries(r.headers ?? { 'Content-Type': 'application/json' }));
    const bodyText = r.text ?? (r.json !== undefined ? JSON.stringify(r.json) : '');
    return {
      status,
      headers: { get: (k) => headers.get(k) ?? headers.get(k.toLowerCase()) ?? null },
      async text() {
        return bodyText;
      },
      async json() {
        return JSON.parse(bodyText);
      },
    };
  };
  fn.calls = calls;
  return fn;
}

const STRUCTURED = {
  id_transaction: 42,
  number: 990000001,
  uuid: 'CUFE-ABC',
  qr: 'https://catalogo.dian/qr',
  is_valid: true,
  is_test: true,
  trackid: 'trk-1',
  xml: Buffer.from('<Invoice/>').toString('base64'),
  errors: [],
  statuses: { validated: true },
};

test('SefConfig exige baseUrl y credenciales', () => {
  assert.throws(() => new SefConfig({}), SefConfigError);
  assert.throws(() => new SefConfig({ baseUrl: 'https://x' }), SefConfigError);
  const cfg = new SefConfig({ baseUrl: 'https://x/', accessToken: 't' });
  assert.equal(cfg.baseUrl, 'https://x'); // recorta la barra final
  assert.equal(cfg.hasStaticToken, true);
});

test('ebill.invoice pega al endpoint correcto y mapea la respuesta', async () => {
  const fetch = mockFetch(() => ({ json: STRUCTURED }));
  const client = new SefClient({ baseUrl: 'https://fe.test', accessToken: 'tok', fetch });

  const res = await client.ebill.invoice({ number: 1 });

  assert.ok(res instanceof EmissionResponse);
  assert.equal(fetch.calls[0].url, 'https://fe.test/api/ebill/invoice');
  assert.equal(fetch.calls[0].init.method, 'POST');
  assert.equal(fetch.calls[0].init.headers.Authorization, 'Bearer tok');
  assert.equal(res.uuid, 'CUFE-ABC');
  assert.equal(res.isValid, true);
  assert.equal(res.xml, '<Invoice/>');
});

test('rutas con ortografía real por paquete', async () => {
  const fetch = mockFetch(() => ({ json: STRUCTURED }));
  const client = new SefClient({ baseUrl: 'https://fe.test', accessToken: 't', fetch });

  await client.ebill.adjustmentNote({});
  await client.epayroll.adjustmentNote({});
  await client.dequivalent.invoice({});
  await client.dequivalent.adjustmentNote({});
  await client.dsupport.invoice({});
  await client.dsupport.adjustmentNote({});

  const urls = fetch.calls.map((c) => c.url);
  assert.deepEqual(urls, [
    'https://fe.test/api/ebill/adjusment-note', // typo real
    'https://fe.test/api/epayroll/adjustment-note',
    'https://fe.test/api/document/equivalent/invoice',
    'https://fe.test/api/document/equivalent/adjusment-note', // typo real
    'https://fe.test/api/document/support/invoice',
    'https://fe.test/api/document/support/adjustment-note',
  ]);
});

test('modo simulación usa /simulated', async () => {
  const fetch = mockFetch(() => ({ json: STRUCTURED }));
  const client = new SefClient({ baseUrl: 'https://fe.test', accessToken: 't', fetch });
  await client.ebill.invoice({}, true);
  assert.equal(fetch.calls[0].url, 'https://fe.test/api/ebill/invoice/simulated');
});

test('radian: catalog, emit (send) y acuse', async () => {
  const fetch = mockFetch((url) => {
    if (url.endsWith('/events/catalog')) return { json: [{ code: '030', name: 'Acuse' }] };
    return { status: 201, json: { id: 7, type_event_code: '036', uuid: 'CUDE-1' } };
  });
  const client = new SefClient({ baseUrl: 'https://fe.test', accessToken: 't', fetch });

  const catalog = await client.radian.catalog();
  assert.equal(catalog[0].code, '030');

  const ev = await client.radian.emit({ type_event_code: '036' }, true);
  assert.equal(ev.uuid, 'CUDE-1');
  assert.equal(ev.eventCode, '036');
  assert.equal(JSON.parse(fetch.calls[1].init.body).send, true);

  await client.radian.acuse({ documentId: 123, eventCode: '030', id: 'AC-1' });
  assert.equal(fetch.calls[2].url, 'https://fe.test/api/radian/receipt/123/acuse');
  const acuseBody = JSON.parse(fetch.calls[2].init.body);
  assert.equal(acuseBody.event_code, '030');
  assert.equal(acuseBody.send, false);
});

test('error 422 -> ValidationError con errors', async () => {
  const fetch = mockFetch(() => ({
    status: 422,
    json: { message: 'Datos inválidos', errors: { number: ['requerido'] } },
  }));
  const client = new SefClient({ baseUrl: 'https://fe.test', accessToken: 't', fetch });

  await assert.rejects(client.ebill.invoice({}), (err) => {
    assert.ok(err instanceof ValidationError);
    assert.equal(err.statusCode, 422);
    assert.deepEqual(err.errors, { number: ['requerido'] });
    return true;
  });
});

test('error 401 se reintenta una vez y luego lanza AuthenticationError', async () => {
  const fetch = mockFetch(() => ({ status: 401, json: { message: 'No autenticado' } }));
  const client = new SefClient({ baseUrl: 'https://fe.test', accessToken: 't', fetch, maxRetries: 1 });

  await assert.rejects(client.radian.health(), (err) => {
    assert.ok(err instanceof AuthenticationError);
    return true;
  });
  // 1er intento (attempt 0) invalida y reintenta -> 2 llamadas.
  assert.equal(fetch.calls.length, 2);
});

test('OAuth2 password grant obtiene y adjunta el token', async () => {
  const fetch = mockFetch((url) => {
    if (url.endsWith('/oauth/token')) {
      return { json: { access_token: 'NUEVO', expires_in: 3600, token_type: 'Bearer' } };
    }
    return { json: STRUCTURED };
  });
  const client = new SefClient({
    baseUrl: 'https://fe.test',
    clientId: '3',
    clientSecret: 'secret',
    username: 'u@e.com',
    password: 'pw',
    fetch,
  });

  await client.ebill.invoice({});

  assert.equal(fetch.calls[0].url, 'https://fe.test/oauth/token');
  assert.equal(fetch.calls[1].init.headers.Authorization, 'Bearer NUEVO');
});

test('5xx se reintenta según maxRetries en métodos idempotentes', async () => {
  let n = 0;
  const fetch = mockFetch(() => {
    n += 1;
    return n < 3 ? { status: 503, json: { message: 'busy' } } : { json: { ok: true } };
  });
  const client = new SefClient({ baseUrl: 'https://fe.test', accessToken: 't', fetch, maxRetries: 3 });

  const res = await client.radian.health();
  assert.deepEqual(res, { ok: true });
  assert.equal(fetch.calls.length, 3);
});
