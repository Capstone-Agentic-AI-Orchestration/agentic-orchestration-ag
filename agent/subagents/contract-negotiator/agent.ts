import { defineAgent } from 'eve';
import { getEveModel } from '../../../lib/env.js';

/** Contract negotiator subagent — mirrors CONTRACT_NEGOTIATOR_SYSTEM. Returns a JSON object. */
export default defineAgent({
  description: 'Produces a detailed, locked ProjectContract from a RequirementsDocument.',
  model: getEveModel(),
});
