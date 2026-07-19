import { defineTool } from 'eve/tools';

/**
 * Repository tools: how a subagent reads and edits the real code of the project it was
 * assigned.
 *
 * This service holds **no GitHub credentials**. Every call goes back to the DevFlow backend
 * (agentic-orchestration-be), which resolves the turn token to a project and performs the
 * GitHub operation on our behalf. Consequences worth knowing while reading this file:
 *
 *  - We address repositories by KIND (`backend` | `frontend` | `mobile`), never by name. The
 *    backend maps kind → the repository belonging to this turn's project, so there is no input
 *    here that could reach another project's code.
 *  - Writes always land on the run's branch. Nothing this file does can touch the default
 *    branch; delivery is reviewed through a pull request.
 *  - The turn token is supplied by the backend in the prompt and passed straight through. It
 *    expires with the turn.
 */

declare const process: {
  env: Record<string, string | undefined>;
};

declare const fetch: (input: string, init?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

const REPOSITORY_KINDS = ['backend', 'frontend', 'mobile'] as const;

/** Mirrors the backend's own write ceiling so we fail fast with a clear message. */
const MAX_WRITE_FILES = 60;

function backendBaseUrl(): string {
  const url = process.env.DEVFLOW_API_URL?.trim();
  if (!url) {
    throw new Error(
      'DEVFLOW_API_URL is not configured; the agent service cannot reach the DevFlow backend.',
    );
  }
  return url.replace(/\/$/, '');
}

function serviceToken(): string {
  const token = process.env.AGENT_REPO_SERVICE_TOKEN?.trim();
  if (!token) {
    throw new Error(
      'AGENT_REPO_SERVICE_TOKEN is not configured; the agent service cannot authenticate to the DevFlow backend.',
    );
  }
  return token;
}

function assertToken(token: unknown): string {
  const value = typeof token === 'string' ? token.trim() : '';
  if (!value) {
    throw new Error(
      'Missing repoToken. Use the exact repoToken value given in your instructions for this turn.',
    );
  }
  return value;
}

function assertRepository(repository: unknown): string {
  const value = String(repository ?? '').trim().toLowerCase();
  if (!REPOSITORY_KINDS.includes(value as (typeof REPOSITORY_KINDS)[number])) {
    throw new Error(
      `Unknown repository "${repository}". Use one of: ${REPOSITORY_KINDS.join(', ')}.`,
    );
  }
  return value.toUpperCase();
}

async function callBackend<T>(route: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${backendBaseUrl()}/internal/agent-repo/${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    // Surface the backend's message verbatim: it explains *why* a scope was refused, which the
    // model can often act on (e.g. "this project has no active MOBILE repository").
    throw new Error(`Repository ${route} failed (${response.status}): ${detail.slice(0, 400)}`);
  }

  return (await response.json()) as T;
}

const repositoryProperty = {
  type: 'string' as const,
  enum: [...REPOSITORY_KINDS],
  description: 'Which repository of this project to act on.',
};

const tokenProperty = {
  type: 'string' as const,
  description: 'The repoToken value provided in your instructions for this turn.',
};

export const listRepoFilesTool = defineTool({
  description:
    'Lists the existing file paths in one of this project\'s repositories. Call this before writing code so you extend the real project instead of guessing its layout.',
  inputSchema: {
    type: 'object',
    properties: {
      repoToken: tokenProperty,
      repository: repositoryProperty,
    },
    required: ['repoToken', 'repository'],
    additionalProperties: false,
  },
  async execute(input: { repoToken: string; repository: string }) {
    const result = await callBackend<{
      repository: string;
      files: Array<{ path: string; size: number | null }>;
      truncated: boolean;
    }>('list', {
      token: assertToken(input.repoToken),
      repository: assertRepository(input.repository),
    });

    return {
      repository: result.repository,
      fileCount: result.files.length,
      truncated: result.truncated,
      files: result.files.map((file) => file.path),
    };
  },
});

export const readRepoFileTool = defineTool({
  description:
    'Reads one existing file from a repository. Always read a file before modifying it — your write replaces the whole file, so unread content will be lost.',
  inputSchema: {
    type: 'object',
    properties: {
      repoToken: tokenProperty,
      repository: repositoryProperty,
      filePath: {
        type: 'string',
        description: 'Repository-relative path, e.g. "src/app/page.tsx".',
      },
    },
    required: ['repoToken', 'repository', 'filePath'],
    additionalProperties: false,
  },
  async execute(input: { repoToken: string; repository: string; filePath: string }) {
    const result = await callBackend<{ repository: string; path: string; content: string | null }>(
      'read',
      {
        token: assertToken(input.repoToken),
        repository: assertRepository(input.repository),
        filePath: input.filePath,
      },
    );

    if (result.content === null) {
      return {
        repository: result.repository,
        path: result.path,
        exists: false,
        content: '',
        note: 'This file does not exist yet. Writing it will create it.',
      };
    }

    return {
      repository: result.repository,
      path: result.path,
      exists: true,
      content: result.content,
    };
  },
});

export const writeRepoFilesTool = defineTool({
  description:
    'Writes files to this project\'s repository on the run branch, then opens them for review in a pull request. Each file is replaced in full, so include the complete intended contents.',
  inputSchema: {
    type: 'object',
    properties: {
      repoToken: tokenProperty,
      repository: repositoryProperty,
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filePath: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['filePath', 'content'],
          additionalProperties: false,
        },
        description: 'Complete file contents to commit.',
      },
      message: {
        type: 'string',
        description: 'Optional commit message summarizing the change.',
      },
    },
    required: ['repoToken', 'repository', 'files'],
    additionalProperties: false,
  },
  async execute(input: {
    repoToken: string;
    repository: string;
    files: Array<{ filePath: string; content: string }>;
    message?: string;
  }) {
    const files = Array.isArray(input.files) ? input.files : [];
    if (files.length === 0) {
      throw new Error('Provide at least one file to write.');
    }
    if (files.length > MAX_WRITE_FILES) {
      throw new Error(`A single write may contain at most ${MAX_WRITE_FILES} files.`);
    }

    const result = await callBackend<{
      repository: string;
      branch: string;
      commitSha: string;
      written: string[];
    }>('write', {
      token: assertToken(input.repoToken),
      repository: assertRepository(input.repository),
      files,
      message: input.message,
    });

    return {
      repository: result.repository,
      branch: result.branch,
      commitSha: result.commitSha.slice(0, 7),
      written: result.written,
    };
  },
});
