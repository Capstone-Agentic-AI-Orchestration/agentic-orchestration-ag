import { defineAgent } from 'eve';
import { getEveModel } from '../../../lib/env.js';

/**
 * Backend code subagent. The directory name (`backend`) becomes the tool the parent/NestFlow
 * caller invokes. Mirrors BACKEND_AGENT_SYSTEM in
 * devflow-backend/src/orchestration/prompts/agent-prompts.ts.
 */
export default defineAgent({
  description: 'Generates production-quality NestJS/TypeScript backend files from a DevFlow contract.',
  model: getEveModel(),
});
