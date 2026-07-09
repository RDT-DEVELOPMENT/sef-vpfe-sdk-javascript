// Ejemplo: catálogo, emisión de evento y acuse RADIAN.
//
//   SEF_BASE_URL=... SEF_ACCESS_TOKEN=... node examples/radian-emit.mjs
//
import { SefClient } from '../src/index.js';

const client = new SefClient({
  baseUrl: process.env.SEF_BASE_URL ?? 'https://fe.midominio.com',
  accessToken: process.env.SEF_ACCESS_TOKEN ?? 'MI_TOKEN_PASSPORT',
});

// 1) Catálogo de eventos RADIAN disponibles.
for (const event of await client.radian.catalog()) {
  console.log(`${event.code}  ${event.name}`);
}

// 2) Emitir un evento en modo preview (send=false por defecto).
const event = await client.radian.emit(
  {
    type_event_code: '036', // Endoso en propiedad, por ejemplo
    response_code: '1',
    description: 'Endoso',
    id: 'EV-0001',
    sender: { nit: '901000000', dv: '1', name: 'EMISOR S.A.S' },
    receiver: { nit: '901111111', dv: '2', name: 'RECEPTOR S.A.S' },
    reference: { number: 'SETP990000001', cufe: 'abc...' },
  },
  false
);
console.log('CUDE evento:', event.uuid);

// 3) Acuse sobre un documento recibido.
const acuse = await client.radian.acuse({
  documentId: 123,
  eventCode: '030', // Acuse de recibo
  id: 'AC-0001',
  send: false,
});
console.log('Acuse:', acuse.eventCode);
