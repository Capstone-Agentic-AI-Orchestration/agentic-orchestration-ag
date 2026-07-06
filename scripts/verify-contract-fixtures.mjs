import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';

const root = process.cwd();
const fixturesDir = resolve(root, 'tests/fixtures/subagent-contracts');

const codeAgents = new Set(['architecture', 'backend', 'database', 'frontend']);
const objectAgents = new Set(['contract-negotiator', 'requirements-parser', 'self-critique']);
const languageSchema = z.enum(['typescript', 'javascript', 'json', 'sql', 'prisma', 'markdown', 'css', 'html']);
const safePathSchema = z.string().min(1).refine((filePath) => {
  const segments = filePath.split(/[\\/]+/);
  return !filePath.startsWith('/') &&
    !/^[A-Za-z]:/.test(filePath) &&
    !segments.some((segment) => segment === '' || segment === '.' || segment === '..');
}, 'must be a safe relative path');
const codeArtifactSchema = z.object({
  filePath: safePathSchema,
  content: z.string().min(1),
  language: languageSchema,
}).strict();
const schemas = {
  architecture: z.array(codeArtifactSchema.extend({ language: z.literal('markdown') })).nonempty(),
  backend: z.array(codeArtifactSchema).nonempty(),
  database: z.array(codeArtifactSchema).nonempty(),
  frontend: z.array(codeArtifactSchema).nonempty(),
  'requirements-parser': z.object({
    projectType: z.string().min(1),
    features: z.array(z.string().min(1)).nonempty(),
    techStack: z.object({
      frontend: z.string().min(1),
      backend: z.string().min(1),
      database: z.string().min(1),
      styling: z.string().min(1),
    }).strict(),
    complexity: z.enum(['simple', 'medium', 'complex']),
    estimatedFiles: z.number().int().positive(),
  }).strict(),
  'contract-negotiator': z.object({
    projectName: z.string().min(1),
    description: z.string().min(1),
    fileManifest: z.array(safePathSchema).nonempty(),
    acceptanceCriteria: z.array(z.string().min(1)).nonempty(),
  }).strict(),
  'self-critique': z.object({
    passed: z.boolean(),
    feedback: z.string(),
    perAgent: z.object({
      frontend: z.string().optional(),
      backend: z.string().optional(),
      database: z.string().optional(),
      architecture: z.string().optional(),
    }).strict(),
  }).strict(),
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assertNoDuplicatePaths(agent, artifacts) {
  const seen = new Set();
  for (const artifact of artifacts) {
    if (seen.has(artifact.filePath)) {
      fail(`${agent} has duplicate filePath: ${artifact.filePath}`);
    }
    seen.add(artifact.filePath);
  }
}

for (const fileName of readdirSync(fixturesDir).filter((file) => file.endsWith('.json'))) {
  const agent = fileName.replace(/\.json$/, '');
  const value = readJson(join(fixturesDir, fileName));

  const schema = schemas[agent];
  if (schema) {
    const result = schema.safeParse(value);
    if (!result.success) {
      fail(`${agent} fixture contract failed: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
      continue;
    }
    if (codeAgents.has(agent)) assertNoDuplicatePaths(agent, result.data);
    continue;
  }

  fail(`Unexpected fixture ${fileName}.`);
}

const typecheckTool = readFileSync(resolve(root, 'lib/typecheck-tool.ts'), 'utf8');
for (const required of ['ok:', 'errorCount:', 'diagnostics:', 'EXIT_CODE_MARKER', 'MAX_TYPECHECK_FILES', 'MAX_TYPECHECK_BYTES']) {
  if (!typecheckTool.includes(required)) {
    fail(`typecheck tool result is missing ${required}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('Eve subagent contract fixtures verified.');
