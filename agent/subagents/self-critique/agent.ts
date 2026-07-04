import { defineAgent } from 'eve';

/** Self-critique subagent — reviews generated artifacts against the contract. Returns a JSON object. */
export default defineAgent({
  description: 'Reviews generated artifacts against the contract and returns quality feedback.',
  model: process.env.EVE_MODEL ?? 'openai/gpt-5.4-mini',
});
