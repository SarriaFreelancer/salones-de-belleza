'use server';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import next from '@genkit-ai/next';

export const ai = genkit({
  plugins: [googleAI({ apiKey: "AIzaSyCCmDESAfC_ZOi9oZzBgpgawX69AV7KD80" }), next()],
  model: 'googleai/gemini-2.5-flash',
});