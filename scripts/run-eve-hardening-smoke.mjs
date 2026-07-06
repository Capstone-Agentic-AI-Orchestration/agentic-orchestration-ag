import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join('.tmp', 'eve-hardening-smoke');
const tscBin = join('node_modules', 'typescript', 'bin', 'tsc');

rmSync(outDir, { force: true, recursive: true });

execFileSync(
  process.execPath,
  [
    tscBin,
    '--target',
    'ES2022',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--strict',
    '--skipLibCheck',
    '--ignoreConfig',
    '--outDir',
    outDir,
    '--noEmit',
    'false',
    'agent/channels/eve.ts',
    'lib/env.ts',
  ],
  { stdio: 'inherit' },
);

execFileSync(process.execPath, [join('scripts', 'smoke-eve-hardening.mjs')], {
  stdio: 'inherit',
});
