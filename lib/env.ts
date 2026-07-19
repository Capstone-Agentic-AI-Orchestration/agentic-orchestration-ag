declare const process: {
  env: Record<string, string | undefined>;
};

const DEFAULT_MODEL = 'openai/gpt-5.4-mini';

export type EveModelTarget =
  | 'architecture'
  | 'backend'
  | 'contract'
  | 'critique'
  | 'database'
  | 'frontend'
  | 'mobile'
  | 'requirements';

const TARGET_MODEL_ENV: Record<EveModelTarget, string> = {
  architecture: 'EVE_ARCHITECTURE_MODEL',
  backend: 'EVE_BACKEND_MODEL',
  contract: 'EVE_CONTRACT_MODEL',
  critique: 'EVE_CRITIQUE_MODEL',
  database: 'EVE_DATABASE_MODEL',
  frontend: 'EVE_FRONTEND_MODEL',
  mobile: 'EVE_MOBILE_MODEL',
  requirements: 'EVE_REQUIREMENTS_MODEL',
};

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export function getEveModel(target?: EveModelTarget): string {
  if (target) {
    const targetModel = readEnv(TARGET_MODEL_ENV[target]);
    if (targetModel) return targetModel;
  }

  return readEnv('EVE_MODEL') ?? DEFAULT_MODEL;
}

export function getEveServiceToken(): string {
  return process.env.EVE_SERVICE_TOKEN?.trim() ?? '';
}

export function allowLocalDevAuth(): boolean {
  return process.env.EVE_ALLOW_LOCAL_DEV_AUTH === 'true';
}
