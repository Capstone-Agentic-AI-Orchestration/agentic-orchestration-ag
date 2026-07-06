import { eveChannel } from 'eve/channels/eve';
import { extractBearerToken, localDev, placeholderAuth, type AuthFn } from 'eve/channels/auth';
import { allowLocalDevAuth, getEveServiceToken } from '../../lib/env.js';

const SERVICE_PRINCIPAL = 'devflow-backend';
const MAX_METADATA_VALUE_LENGTH = 128;

const DEVFLOW_METADATA_FIELDS = [
  'requestId',
  'projectId',
  'runId',
  'workOrderId',
  'agent',
  'attempt',
] as const;

type DevFlowMetadataField = (typeof DEVFLOW_METADATA_FIELDS)[number];

export type DevFlowCorrelationMetadata = Partial<Record<DevFlowMetadataField, string>>;

const DEVFLOW_METADATA_HEADERS: Record<DevFlowMetadataField, readonly string[]> = {
  agent: ['x-devflow-agent'],
  attempt: ['x-devflow-attempt'],
  projectId: ['x-devflow-project-id'],
  requestId: ['x-devflow-request-id', 'x-request-id', 'x-correlation-id'],
  runId: ['x-devflow-run-id'],
  workOrderId: ['x-devflow-work-order-id'],
};

export const serviceTokenAuth: AuthFn<Request> = (request) => {
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

export async function withDevFlowCorrelationMetadata(
  auth: AuthFn<Request>,
  request: Request,
) {
  const sessionAuth = await auth(request);
  if (!sessionAuth) return sessionAuth;

  const metadata = await extractDevFlowCorrelationMetadata(request);
  return attachDevFlowCorrelationMetadata(sessionAuth, metadata);
}

export async function extractDevFlowCorrelationMetadata(
  request: Request,
): Promise<DevFlowCorrelationMetadata> {
  const fromBody = await extractBodyMetadata(request);
  const metadata: DevFlowCorrelationMetadata = {};

  for (const field of DEVFLOW_METADATA_FIELDS) {
    const value = readHeaderMetadata(request.headers, field) ?? readObjectMetadata(fromBody, field);
    const sanitized = sanitizeMetadataValue(value, field);
    if (sanitized) metadata[field] = sanitized;
  }

  return metadata;
}

export function attachDevFlowCorrelationMetadata<T extends { attributes: Record<string, unknown> }>(
  sessionAuth: T,
  metadata: DevFlowCorrelationMetadata,
): T {
  const attributes = formatDevFlowMetadataAttributes(metadata);
  if (Object.keys(attributes).length === 0) return sessionAuth;

  return {
    ...sessionAuth,
    attributes: {
      ...sessionAuth.attributes,
      ...attributes,
    },
  };
}

export function formatDevFlowMetadataAttributes(
  metadata: DevFlowCorrelationMetadata,
): Record<string, string> {
  const attributes: Record<string, string> = {};

  for (const field of DEVFLOW_METADATA_FIELDS) {
    const value = metadata[field];
    if (value) attributes[`devflow.${field}`] = value;
  }

  return attributes;
}

function timingSafeEqual(actual: string, expected: string): boolean {
  let diff = actual.length ^ expected.length;
  const maxLength = Math.max(actual.length, expected.length);

  for (let i = 0; i < maxLength; i += 1) {
    diff |= (actual.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }

  return diff === 0;
}

async function extractBodyMetadata(request: Request): Promise<Record<string, unknown>> {
  if (!requestHasJsonBody(request)) return {};

  try {
    const body = await request.clone().json();
    return collectBodyMetadataObjects(body);
  } catch {
    return {};
  }
}

function collectBodyMetadataObjects(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) return {};

  return {
    ...readMetadataObject(body.metadata),
    ...readMetadataObject(body.devflowMetadata),
    ...readMetadataObject(body.devflow),
  };
}

function readMetadataObject(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};

  return {
    ...value,
    ...readMetadataObject(value.devflow),
    ...readMetadataObject(value.metadata),
  };
}

function readHeaderMetadata(headers: Headers, field: DevFlowMetadataField): string | null {
  for (const header of DEVFLOW_METADATA_HEADERS[field]) {
    const value = headers.get(header);
    if (value) return value;
  }

  return null;
}

function readObjectMetadata(metadata: Record<string, unknown>, field: DevFlowMetadataField): unknown {
  return metadata[field] ?? metadata[toSnakeCase(field)] ?? metadata[toKebabCase(field)];
}

function sanitizeMetadataValue(value: unknown, field: DevFlowMetadataField): string | undefined {
  if (value === undefined || value === null) return undefined;

  if (field === 'attempt') {
    const attempt = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
    return Number.isSafeInteger(attempt) && attempt >= 0 ? String(attempt) : undefined;
  }

  const sanitized = String(value)
    .trim()
    .slice(0, MAX_METADATA_VALUE_LENGTH)
    .replace(/[^A-Za-z0-9._:@/=-]/g, '_')
    .replace(/_+/g, '_');

  return /[A-Za-z0-9]/.test(sanitized) ? sanitized : undefined;
}

function requestHasJsonBody(request: Request): boolean {
  if (request.method === 'GET' || request.method === 'HEAD') return false;

  const contentType = request.headers.get('content-type') ?? '';
  return contentType.toLowerCase().includes('application/json');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}

function withDevFlowMetadataAuth(auth: AuthFn<Request>): AuthFn<Request> {
  return (request) => withDevFlowCorrelationMetadata(auth, request);
}

function routeAuth(): readonly AuthFn<Request>[] {
  if (getEveServiceToken()) return [withDevFlowMetadataAuth(serviceTokenAuth)];
  if (allowLocalDevAuth()) return [withDevFlowMetadataAuth(localDev()), withDevFlowMetadataAuth(placeholderAuth())];
  return [() => null];
}

export default eveChannel({
  auth: routeAuth(),
});
