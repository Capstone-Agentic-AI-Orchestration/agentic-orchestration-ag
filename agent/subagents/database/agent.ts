import { defineAgent } from 'eve';
import { getEveModel } from '../../../lib/env.js';

/** Database subagent — mirrors DATABASE_AGENT_SYSTEM in agent-prompts.ts. */
export default defineAgent({
  description: 'Generates production-quality Prisma schemas and SQL migrations from a DevFlow contract.',
  model: getEveModel(),
});
