'use server';

/**
 * @fileOverview An AI-powered marketing assistant for generating social media posts.
 *
 * - generatePost - A function that creates social media post content.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MarketingAssistantInputSchema = z.object({
  serviceName: z.string().describe('The name of the beauty service to promote.'),
  offer: z.string().describe('A special offer or discount for the service. Can be an empty string if there is no offer.'),
  tone: z.enum(['professional', 'friendly', 'elegant', 'energetic']).describe('The desired tone for the social media post.'),
});
export type MarketingAssistantInput = z.infer<typeof MarketingAssistantInputSchema>;

const MarketingAssistantOutputSchema = z.object({
  postContent: z
    .string()
    .describe('The generated social media post content, including relevant emojis and hashtags. The post should be engaging and encourage customers to book an appointment.'),
});
export type MarketingAssistantOutput = z.infer<typeof MarketingAssistantOutputSchema>;

export async function generatePost(input: MarketingAssistantInput): Promise<MarketingAssistantOutput> {
  return generatePostFlow(input);
}

const prompt = ai.definePrompt({
  name: 'marketingAssistantPrompt',
  input: { schema: MarketingAssistantInputSchema },
  output: { schema: MarketingAssistantOutputSchema },
  prompt: `You are a social media marketing expert for a beauty salon called "Divas AyA".
Your task is to write a short, engaging post for platforms like Instagram or Facebook.

The post must promote the following service: **{{{serviceName}}}**

Incorporate the following special offer: **{{#if offer}}{{offer}}{{else}}No special offer{{/if}}**

The tone of the post should be: **{{{tone}}}**

The final post should be concise (2-3 paragraphs max), use relevant emojis to be visually appealing, and include a clear call to action to book an appointment. End with a few relevant hashtags like #DivasAyA, #Belleza, #[serviceName], #PromocionSalon.
`,
});

const generatePostFlow = ai.defineFlow(
  {
    name: 'generatePostFlow',
    inputSchema: MarketingAssistantInputSchema,
    outputSchema: MarketingAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
