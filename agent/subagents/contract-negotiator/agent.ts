import { defineAgent } from 'eve';

/** Contract negotiator subagent — mirrors CONTRACT_NEGOTIATOR_SYSTEM. Returns a JSON object. */
export default defineAgent({
  description: 'Produces a detailed, locked ProjectContract from a RequirementsDocument.',
  model: process.env.EVE_MODEL ?? 'openai/gpt-5.4-mini',
});
