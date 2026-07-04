import { defineAgent } from 'eve';

/**
 * DevFlow agent runtime config.
 *
 * The model string resolves through Vercel AI Gateway, so the deployed agent uses Vercel
 * OIDC instead of a raw provider key. Override per-environment with EVE_MODEL.
 *
 * NOTE: DevFlow's NestJS side drives the deterministic pipeline and calls a specific
 * subagent per turn (see ../subagents). This root agent exists so the project compiles and
 * to host the shared instructions + tools; it is not expected to self-orchestrate the full
 * pipeline in the Hybrid strategy.
 */
export default defineAgent({
  model: process.env.EVE_MODEL ?? 'openai/gpt-5.4-mini',
});
