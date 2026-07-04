declare const process: {
  env: Record<string, string | undefined>;
};

const DEFAULT_MODEL = 'openai/gpt-5.4-mini';

export function getEveModel(): string {
  return process.env.EVE_MODEL ?? DEFAULT_MODEL;
}
