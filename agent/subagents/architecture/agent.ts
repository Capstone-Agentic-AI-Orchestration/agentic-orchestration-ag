import { defineAgent } from 'eve';

/** Architecture subagent — mirrors ARCHITECTURE_AGENT_SYSTEM in agent-prompts.ts. */
export default defineAgent({
  description: 'Generates comprehensive architecture/system documentation from a DevFlow contract.',
  model: process.env.EVE_MODEL ?? 'openai/gpt-5.4-mini',
});
