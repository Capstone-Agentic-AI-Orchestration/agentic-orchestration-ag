import { defineAgent } from 'eve';
import { getEveModel } from '../../../lib/env.js';

/**
 * Mobile code subagent. The directory name (`mobile`) becomes the tool the backend
 * caller invokes. Only dispatched for projects provisioned with a MOBILE repository.
 */
export default defineAgent({
  description: 'Generates production-quality React Native/Expo files from an orchestration contract.',
  model: getEveModel('mobile'),
});
