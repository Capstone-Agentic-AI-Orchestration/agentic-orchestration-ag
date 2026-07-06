import { defineAgent } from 'eve';
import { getEveModel } from '../../../lib/env.js';

/** Requirements parser subagent — mirrors REQUIREMENTS_PARSER_SYSTEM. Returns a JSON object. */
export default defineAgent({
  description: 'Analyzes a project brief and produces a structured RequirementsDocument.',
  model: getEveModel('requirements'),
});
