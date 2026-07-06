import { defineAgent } from 'eve';
import { getEveModel } from '../../../lib/env.js';

/**
 * Backend code subagent. The directory name (`backend`) becomes the tool the backend
 * caller invokes.
 */
export default defineAgent({
  description: 'Generates production-quality NestJS/TypeScript backend files from an orchestration contract.',
  model: getEveModel('backend'),
});
