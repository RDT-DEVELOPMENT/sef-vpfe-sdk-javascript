/**
 * SDK JavaScript para las APIs de facturación electrónica DIAN de SEF.
 *
 * @module @sef/sdk
 */
export { SefClient } from './client.js';
export { SefConfig } from './config.js';
export { TokenProvider } from './auth.js';
export { HttpClient } from './http.js';

export { Ebill } from './resources/Ebill.js';
export { Epayroll } from './resources/Epayroll.js';
export { Dequivalent } from './resources/Dequivalent.js';
export { Dsupport } from './resources/Dsupport.js';
export { Radian } from './resources/Radian.js';

export { EmissionResponse } from './responses/EmissionResponse.js';
export { RadianEvent } from './responses/RadianEvent.js';

export {
  SefError,
  SefConfigError,
  SefAuthError,
  ConnectionError,
  TimeoutError,
  ApiError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  exceptionForStatus,
} from './exceptions.js';

// Alias por conveniencia: `import Sef from '@sef/sdk'`
import { SefClient as _SefClient } from './client.js';
export default _SefClient;
