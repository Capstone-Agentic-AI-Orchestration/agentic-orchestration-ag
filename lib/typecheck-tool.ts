import { defineTool } from 'eve/tools';

interface TypecheckInput {
  files: Array<{ filePath: string; content: string }>;
}

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

/**
 * Shared `typecheck` tool implementation. Eve subagents inherit nothing from the root or each
 * other, so each code subagent re-exports this from its own `tools/typecheck.ts`. Keeping the
 * logic in one module here (outside `agent/`, so it is not itself auto-discovered) avoids drift.
 *
 * Writes generated TypeScript to the sandbox and runs `tsc --noEmit`, returning diagnostics —
 * the real upgrade over devflow-backend's static typescript.program.checker.ts.
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
    const sandbox = await ctx.getSandbox();
    for (const file of files) {
      assertSafeWorkspacePath(file.filePath);
      await sandbox.writeTextFile({ path: file.filePath, content: file.content });
    }
    const result = await sandbox.run({
      command: 'npx --yes --package typescript@5 tsc --noEmit --skipLibCheck --pretty false 2>&1 || true',
    });
    const output = (result.stdout ?? '') + (result.stderr ?? '');
    const errorLines = output.split('\n').filter((line: string) => /error TS\d+/.test(line));
    return {
      ok: errorLines.length === 0,
      errorCount: errorLines.length,
      diagnostics: errorLines.slice(0, 50),
    };
  },
});
