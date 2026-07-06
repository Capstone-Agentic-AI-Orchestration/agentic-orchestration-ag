import { defineTool } from 'eve/tools';

interface TypecheckInput {
  files: Array<{ filePath: string; content: string }>;
}

const MAX_TYPECHECK_FILES = 40;
const MAX_TYPECHECK_BYTES = 500_000;
const TYPECHECK_TIMEOUT_SECONDS = 30;
const EXIT_CODE_MARKER = '__DEVFLOW_TYPECHECK_EXIT_CODE__:';

function assertSafeWorkspacePath(filePath: string): void {
  const segments = filePath.split(/[\\/]+/);
  if (
    filePath.length === 0 ||
    filePath.startsWith('/') ||
    /^[A-Za-z]:/.test(filePath) ||
    segments.some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new Error(`Unsafe generated file path: ${filePath}`);
  }
}

function assertTypecheckPayload(files: TypecheckInput['files']): void {
  if (files.length === 0 || files.length > MAX_TYPECHECK_FILES) {
    throw new Error(`Typecheck accepts between 1 and ${MAX_TYPECHECK_FILES} files.`);
  }

  const seen = new Set<string>();
  let totalBytes = 0;
  for (const file of files) {
    assertSafeWorkspacePath(file.filePath);
    if (seen.has(file.filePath)) {
      throw new Error(`Duplicate generated file path: ${file.filePath}`);
    }
    seen.add(file.filePath);
    totalBytes += new TextEncoder().encode(file.content).length;
  }

  if (totalBytes > MAX_TYPECHECK_BYTES) {
    throw new Error(`Typecheck payload is too large: ${totalBytes}/${MAX_TYPECHECK_BYTES} bytes.`);
  }
}

/**
 * Shared `typecheck` tool implementation. Eve subagents inherit nothing from the root or each
 * other, so each code subagent re-exports this from its own `tools/typecheck.ts`. Keeping the
 * logic in one module here (outside `agent/`, so it is not itself auto-discovered) avoids drift.
 *
 * Writes generated TypeScript to the sandbox and runs `tsc --noEmit`, returning diagnostics —
 * the real upgrade over the backend's static TypeScript program checker.
 */
export default defineTool({
  description: 'Writes generated TypeScript files to the sandbox and runs `tsc --noEmit`, returning diagnostics.',
  inputSchema: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filePath: { type: 'string' },
            content: { type: 'string' }
          },
          required: ['filePath', 'content'],
          additionalProperties: false
        },
        description: 'The generated files to type-check.'
      }
    },
    required: ['files'],
    additionalProperties: false
  },
  async execute({ files }: TypecheckInput, ctx) {
    assertTypecheckPayload(files);
    const sandbox = await ctx.getSandbox();
    for (const file of files) {
      await sandbox.writeTextFile({ path: file.filePath, content: file.content });
    }
    let result;
    try {
      result = await sandbox.run({
        command: `sh -lc 'timeout ${TYPECHECK_TIMEOUT_SECONDS}s npx --yes --package typescript@6 tsc --noEmit --skipLibCheck --pretty false 2>&1; code=$?; echo ${EXIT_CODE_MARKER}$code'`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        errorCount: 1,
        diagnostics: [`Typecheck command failed before diagnostics were available: ${message}`],
      };
    }
    const output = (result.stdout ?? '') + (result.stderr ?? '');
    const exitCodeMatch = output.match(new RegExp(`${EXIT_CODE_MARKER}(\\d+)`));
    const exitCode = exitCodeMatch ? Number.parseInt(exitCodeMatch[1], 10) : 1;
    const errorLines = output.split('\n').filter((line: string) => /error TS\d+/.test(line));
    return {
      ok: exitCode === 0 && errorLines.length === 0,
      errorCount: errorLines.length || (exitCode === 0 ? 0 : 1),
      diagnostics: (errorLines.length > 0
        ? errorLines
        : exitCode === 124
          ? [`Typecheck timed out after ${TYPECHECK_TIMEOUT_SECONDS}s.`]
          : exitCode === 0
            ? []
            : [`Typecheck command exited with code ${exitCode}.`]
      ).slice(0, 50),
    };
  },
});
