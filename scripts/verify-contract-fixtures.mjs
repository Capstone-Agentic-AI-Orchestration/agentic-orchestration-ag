import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const fixturesDir = resolve(root, 'tests/fixtures/subagent-contracts');

const codeAgents = new Set(['architecture', 'backend', 'database', 'frontend']);
const objectAgents = new Set(['contract-negotiator', 'requirements-parser', 'self-critique']);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assertCodeArtifact(agent, artifact, index) {
  const prefix = `${agent}[${index}]`;
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
    fail(`${prefix} must be an object.`);
    return;
  }
  for (const key of ['filePath', 'content', 'language']) {
    if (typeof artifact[key] !== 'string' || artifact[key].trim().length === 0) {
      fail(`${prefix}.${key} must be a non-empty string.`);
    }
  }
}

function assertObject(agent, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${agent} must return one JSON object.`);
  }
}

for (const fileName of readdirSync(fixturesDir).filter((file) => file.endsWith('.json'))) {
  const agent = fileName.replace(/\.json$/, '');
  const value = readJson(join(fixturesDir, fileName));

  if (codeAgents.has(agent)) {
    if (!Array.isArray(value) || value.length === 0) {
      fail(`${agent} must return a non-empty array of generated artifacts.`);
      continue;
    }
    value.forEach((artifact, index) => assertCodeArtifact(agent, artifact, index));
    continue;
  }

  if (objectAgents.has(agent)) {
    assertObject(agent, value);
    continue;
  }

  fail(`Unexpected fixture ${fileName}.`);
}

const typecheckTool = readFileSync(resolve(root, 'lib/typecheck-tool.ts'), 'utf8');
for (const required of ['ok:', 'errorCount:', 'diagnostics:']) {
  if (!typecheckTool.includes(required)) {
    fail(`typecheck tool result is missing ${required}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('Eve subagent contract fixtures verified.');
