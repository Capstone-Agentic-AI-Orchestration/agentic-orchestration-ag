import { eveChannel } from 'eve/channels/eve';
import { extractBearerToken, localDev, placeholderAuth, type AuthFn } from 'eve/channels/auth';
import { allowLocalDevAuth, getEveServiceToken } from '../../lib/env.js';

const SERVICE_PRINCIPAL = 'devflow-backend';

const serviceTokenAuth: AuthFn<Request> = (request) => {
  const expectedToken = getEveServiceToken();
  if (!expectedToken) return null;

  const bearer = extractBearerToken(request.headers.get('authorization'));
  if (!bearer || !timingSafeEqual(bearer, expectedToken)) return null;

  return {
    attributes: {
      service: SERVICE_PRINCIPAL,
    },
    authenticator: 'eve-service-token',
    issuer: 'devflow',
    principalId: SERVICE_PRINCIPAL,
    principalType: 'service',
    subject: SERVICE_PRINCIPAL,
  };
};

function timingSafeEqual(actual: string, expected: string): boolean {
  let diff = actual.length ^ expected.length;
  const maxLength = Math.max(actual.length, expected.length);

  for (let i = 0; i < maxLength; i += 1) {
    diff |= (actual.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }

  return diff === 0;
}

function routeAuth(): readonly AuthFn<Request>[] {
  if (getEveServiceToken()) return [serviceTokenAuth];
  if (allowLocalDevAuth()) return [localDev(), placeholderAuth()];
  return [() => null];
}

export default eveChannel({
  auth: routeAuth(),
});
