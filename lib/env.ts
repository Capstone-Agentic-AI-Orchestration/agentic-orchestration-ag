declare const process: {
  env: Record<string, string | undefined>;
};

const DEFAULT_MODEL = 'openai/gpt-5.4-mini';

export function getEveModel(): string {
  return process.env.EVE_MODEL ?? DEFAULT_MODEL;
}

export function getEveServiceToken(): string {
  return process.env.EVE_SERVICE_TOKEN?.trim() ?? '';
}

export function allowLocalDevAuth(): boolean {
  return process.env.EVE_ALLOW_LOCAL_DEV_AUTH === 'true';
}
