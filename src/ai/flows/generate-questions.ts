// src/ai/flows/generate-questions.ts
'use server';
/**
 * @fileOverview A question generator AI agent for the Hot Seat game.
 *
 * - generateQuestions - A function that generates game questions based on player names.
 * - GenerateQuestionsInput - The input type for the generateQuestions function.
 * - GenerateQuestionsOutput - The return type for the generateQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuestionsInputSchema = z.object({
  playerNames: z.array(z.string()).describe('An array of player names.'),
  numQuestions: z.number().default(5).describe('The number of questions to generate (defaults to 5).'),
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

const GenerateQuestionsOutputSchema = z.object({
  questions: z.array(
    z.string().describe('A question that can be answered using player names.')
  ).describe('An array of generated questions.'),
});
export type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;

export async function generateQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
  return generateQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuestionsPrompt',
  input: {schema: GenerateQuestionsInputSchema},
  output: {schema: GenerateQuestionsOutputSchema},
  prompt: `You are a creative game designer specializing in creating engaging "who is most likely to" questions. The game involves the following players:

{{#each playerNames}}
- {{{this}}}
{{/each}}

Generate a total of {{numQuestions}} questions that are relevant and fun for these players. The questions should be phrased in a way that prompts players to choose one of the other players as the answer. Ensure variety and creativity in the questions.

Output the questions as a JSON array of strings.`,
});

const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
