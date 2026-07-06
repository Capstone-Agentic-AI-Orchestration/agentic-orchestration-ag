import { defineAgent } from 'eve';
import { getEveModel } from '../../../lib/env.js';

/** Frontend code subagent — mirrors FRONTEND_AGENT_SYSTEM in agent-prompts.ts. */
export default defineAgent({
  description: 'Generates production-quality React/Next.js + TypeScript frontend files from a DevFlow contract.',
  model: getEveModel('frontend'),
});
