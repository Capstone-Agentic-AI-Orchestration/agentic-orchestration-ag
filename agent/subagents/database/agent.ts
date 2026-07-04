import { defineAgent } from 'eve';

/** Database subagent — mirrors DATABASE_AGENT_SYSTEM in agent-prompts.ts. */
export default defineAgent({
  description: 'Generates production-quality Prisma schemas and SQL migrations from a DevFlow contract.',
  model: process.env.EVE_MODEL ?? 'openai/gpt-5.4-mini',
});
