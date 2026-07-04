import { defineAgent } from 'eve';

/** Frontend code subagent — mirrors FRONTEND_AGENT_SYSTEM in agent-prompts.ts. */
export default defineAgent({
  description: 'Generates production-quality React/Next.js + TypeScript frontend files from a DevFlow contract.',
  model: process.env.EVE_MODEL ?? 'openai/gpt-5.4-mini',
});
