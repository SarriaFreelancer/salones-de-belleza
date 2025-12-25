import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import next from '@genkit-ai/next';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY }), next()],
  model: 'googleai/gemini-2.5-flash',
});
