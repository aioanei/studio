
// src/ai/flows/generate-questions.ts
'use server';
/**
 * @fileOverview A question generator AI agent for the Hot Seat game.
 *
 * - generateQuestions - A function that generates game questions based on player names and difficulty.
 * - GenerateQuestionsInput - The input type for the generateQuestions function.
 * - GenerateQuestionsOutput - The return type for the generateQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { QuestionDifficulty } from '@/types';


const GenerateQuestionsInputSchema = z.object({
  playerNames: z.array(z.string()).describe('An array of player names.'),
  numQuestions: z.number().default(5).describe('The number of questions to generate (defaults to 5).'),
  difficulty: z.enum(['family-friendly', 'getting-personal', 'hot-seat-exclusive'] as [QuestionDifficulty, ...QuestionDifficulty[]]).describe('The desired difficulty or theme of the questions.'),
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
  prompt: `You are a creative game designer specializing in creating engaging "who is most likely to" questions for the game "The Hot Seat".
The game involves the following players:
{{#each playerNames}}
- {{{this}}}
{{/each}}

Generate a total of {{numQuestions}} questions that are relevant and fun for these players.
The questions should be phrased in a way that prompts players to choose one of the other players as the answer.
Ensure variety and creativity in the questions.

The desired theme for the questions is: "{{difficulty}}".
- If 'family-friendly', questions should be light-hearted, safe for all ages, and focus on positive or funny general traits. Examples: "Who is most likely to adopt a dozen cats?", "Who tells the corniest jokes?", "Who is most likely to become a famous influencer?".
- If 'getting-personal', questions can be a bit more revealing or cheeky, suitable for close friends who are comfortable with personal topics. Examples: "Who is most likely to have a secret admirer?", "Who is the biggest drama queen/king?", "Who is most likely to cry during a sad movie?".
- If 'hot-seat-exclusive', questions should be daring, potentially embarrassing, risqué, or NSFW, suitable for adults who are very comfortable with each other. Examples: "Who is most likely to have lost their v-card first?", "Who is most likely to have the highest body count?", "Who is the poorest financially right now?", "Who is most likely to get arrested for something silly?".

Tailor the questions strictly to the selected theme: "{{difficulty}}". Do not mix themes.
The questions should be fun, engaging, and encourage banter among players.

Output the questions as a JSON object with a "questions" key, which is an array of strings.
Example for 'family-friendly':
{
  "questions": [
    "Who is most likely to trip over air?",
    "Who would win a hot dog eating contest?"
  ]
}
Example for 'hot-seat-exclusive':
{
  "questions": [
    "Who is most likely to have a one-night stand on vacation?",
    "Who has the weirdest internet search history?"
  ]
}
`,
});

const generateQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: GenerateQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // The AI might sometimes return an empty output if the prompt is too restrictive or unclear.
    // Adding a fallback or retry logic could be beneficial in a production scenario.
    if (!output || !output.questions || output.questions.length === 0) {
        // Fallback to very generic questions if AI fails for some reason
        // This is a basic fallback, could be improved.
        const fallbackQuestions = input.playerNames.map(name => `Who is most likely to be ${name}? (Fallback)`);
        return { questions: fallbackQuestions.slice(0, input.numQuestions) };
    }
    return output!;
  }
);
