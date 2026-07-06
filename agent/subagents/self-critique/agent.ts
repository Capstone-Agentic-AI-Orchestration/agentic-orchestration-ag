import { defineAgent } from 'eve';
import { getEveModel } from '../../../lib/env.js';

/** Self-critique subagent — reviews generated artifacts against the contract. Returns a JSON object. */
export default defineAgent({
  description: 'Reviews generated artifacts against the contract and returns quality feedback.',
  model: getEveModel('critique'),
});
