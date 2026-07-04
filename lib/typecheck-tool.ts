import { defineTool } from 'eve/tools';

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
  async execute({ files }: { files: Array<{ filePath: string; content: string }> }, ctx) {
    const sandbox = await ctx.getSandbox();
    for (const file of files) {
      await sandbox.writeFile(file.filePath, file.content);
    }
    const result = await sandbox.bash(
      'npx --yes typescript@5 tsc --noEmit --skipLibCheck --pretty false 2>&1 || true',
    );
    const output = (result.stdout ?? '') + (result.stderr ?? '');
    const errorLines = output.split('\n').filter((line) => /error TS\d+/.test(line));
    return {
      ok: errorLines.length === 0,
      errorCount: errorLines.length,
      diagnostics: errorLines.slice(0, 50),
    };
  },
});
