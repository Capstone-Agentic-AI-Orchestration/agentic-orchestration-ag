import assert from 'node:assert/strict';

import {
  attachDevFlowCorrelationMetadata,
  extractDevFlowCorrelationMetadata,
  serviceTokenAuth,
  withDevFlowCorrelationMetadata,
} from '../.tmp/eve-hardening-smoke/agent/channels/eve.js';
import { getEveModel } from '../.tmp/eve-hardening-smoke/lib/env.js';

function setEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

async function readServiceTokenAuth(request) {
  return withDevFlowCorrelationMetadata(serviceTokenAuth, request);
}

async function testServiceTokenCorrelationMetadata() {
  setEnv('EVE_SERVICE_TOKEN', 'dev-secret');

  const request = new Request('http://127.0.0.1:3000/eve/v1/session', {
    body: JSON.stringify({
      message: 'Generate the backend files.',
      metadata: {
        agent: 'BACKEND',
        attempt: 2,
        projectId: 'project-from-body',
        run_id: 'run-from-body',
        workOrderId: 'wo-from-body',
      },
    }),
    headers: {
      authorization: 'Bearer dev-secret',
      'content-type': 'application/json',
      'x-devflow-project-id': 'project-from-header',
      'x-devflow-request-id': 'req-123',
    },
    method: 'POST',
  });

  const sessionAuth = await readServiceTokenAuth(request);

  assert.ok(sessionAuth);
  assert.equal(sessionAuth.principalId, 'devflow-backend');
  assert.equal(sessionAuth.attributes.service, 'devflow-backend');
  assert.equal(sessionAuth.attributes['devflow.requestId'], 'req-123');
  assert.equal(sessionAuth.attributes['devflow.projectId'], 'project-from-header');
  assert.equal(sessionAuth.attributes['devflow.runId'], 'run-from-body');
  assert.equal(sessionAuth.attributes['devflow.workOrderId'], 'wo-from-body');
  assert.equal(sessionAuth.attributes['devflow.agent'], 'BACKEND');
  assert.equal(sessionAuth.attributes['devflow.attempt'], '2');
}

async function testRejectedServiceToken() {
  setEnv('EVE_SERVICE_TOKEN', 'dev-secret');

  const request = new Request('http://127.0.0.1:3000/eve/v1/session', {
    headers: { authorization: 'Bearer wrong-secret' },
    method: 'POST',
  });

  assert.equal(await readServiceTokenAuth(request), null);
}

async function testSanitizesMetadata() {
  const request = new Request('http://127.0.0.1:3000/eve/v1/session', {
    body: JSON.stringify({
      message: 'Generate.',
      metadata: {
        agent: 'BACKEND<script>',
        attempt: 'not-a-number',
        requestId: '  req 123  ',
      },
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  const metadata = await extractDevFlowCorrelationMetadata(request);

  assert.equal(metadata.requestId, 'req_123');
  assert.equal(metadata.agent, 'BACKEND_script_');
  assert.equal(metadata.attempt, undefined);
}

function testAttachNoopsWhenEmpty() {
  const sessionAuth = {
    attributes: { service: 'devflow-backend' },
    authenticator: 'eve-service-token',
    principalId: 'devflow-backend',
    principalType: 'service',
  };

  assert.equal(attachDevFlowCorrelationMetadata(sessionAuth, {}), sessionAuth);
}

function testModelOverrides() {
  for (const key of [
    'EVE_MODEL',
    'EVE_BACKEND_MODEL',
    'EVE_FRONTEND_MODEL',
    'EVE_DATABASE_MODEL',
    'EVE_ARCHITECTURE_MODEL',
    'EVE_REQUIREMENTS_MODEL',
    'EVE_CONTRACT_MODEL',
    'EVE_CRITIQUE_MODEL',
  ]) {
    setEnv(key, undefined);
  }

  assert.equal(getEveModel(), 'openai/gpt-5.4-mini');
  assert.equal(getEveModel('backend'), 'openai/gpt-5.4-mini');

  setEnv('EVE_MODEL', 'openai/general-model');
  assert.equal(getEveModel(), 'openai/general-model');
  assert.equal(getEveModel('frontend'), 'openai/general-model');

  setEnv('EVE_BACKEND_MODEL', 'openai/backend-model');
  assert.equal(getEveModel('backend'), 'openai/backend-model');
  assert.equal(getEveModel('database'), 'openai/general-model');
}

await testServiceTokenCorrelationMetadata();
await testRejectedServiceToken();
await testSanitizesMetadata();
testAttachNoopsWhenEmpty();
testModelOverrides();

console.log('Eve hardening smoke checks passed.');
