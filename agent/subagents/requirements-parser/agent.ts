import { defineAgent } from 'eve';

/** Requirements parser subagent — mirrors REQUIREMENTS_PARSER_SYSTEM. Returns a JSON object. */
export default defineAgent({
  description: 'Analyzes a project brief and produces a structured RequirementsDocument.',
  model: process.env.EVE_MODEL ?? 'openai/gpt-5.4-mini',
});
