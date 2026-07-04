import { defineAgent } from 'eve';

/**
 * Backend code subagent. The directory name (`backend`) becomes the tool the parent/NestFlow
 * caller invokes. Mirrors BACKEND_AGENT_SYSTEM in
 * devflow-backend/src/orchestration/prompts/agent-prompts.ts.
 */
export default defineAgent({
  description: 'Generates production-quality NestJS/TypeScript backend files from a DevFlow contract.',
  model: process.env.EVE_MODEL ?? 'openai/gpt-5.4-mini',
});
