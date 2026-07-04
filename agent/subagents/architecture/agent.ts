import { defineAgent } from 'eve';
import { getEveModel } from '../../../lib/env.js';

/** Architecture subagent — mirrors ARCHITECTURE_AGENT_SYSTEM in agent-prompts.ts. */
export default defineAgent({
  description: 'Generates comprehensive architecture/system documentation from a DevFlow contract.',
  model: getEveModel(),
});
