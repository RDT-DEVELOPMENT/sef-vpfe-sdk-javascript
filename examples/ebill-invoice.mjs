// Ejemplo: emitir una factura electrónica.
//
//   SEF_BASE_URL=https://fe.midominio.com SEF_ACCESS_TOKEN=xxx node examples/ebill-invoice.mjs
//
import { SefClient, ValidationError, ApiError } from '../src/index.js';

const client = new SefClient({
  baseUrl: process.env.SEF_BASE_URL ?? 'https://fe.midominio.com',
  accessToken: process.env.SEF_ACCESS_TOKEN ?? 'MI_TOKEN_PASSPORT',
});

// Payload UBL21 (recortado; ver docs Swagger de ebill para el esquema completo).
const payload = {
  number: 990000001,
  type_document_id: 1,
  customer: { identification_number: '901111111', name: 'CLIENTE S.A.S' },
  // ... resto del documento ...
};

try {
  const res = await client.ebill.invoice(payload);
  console.log('CUFE:', res.uuid);
  console.log('QR:  ', res.qr);
  console.log('Válido en DIAN:', res.isValid);
  if (res.hasErrors) console.warn('Errores:', res.errors);
} catch (err) {
  if (err instanceof ValidationError) {
    console.error('Validación (422):', err.errors);
  } else if (err instanceof ApiError) {
    console.error(`API ${err.statusCode}:`, err.message);
  } else {
    console.error('Error:', err.message);
  }
  process.exitCode = 1;
}
