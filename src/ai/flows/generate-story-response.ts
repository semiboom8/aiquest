// src/ai/flows/generate-story-response.ts
'use server';

/**
 * @fileOverview This file defines the Genkit flow for generating story responses based on player input.
 *
 * - generateStoryResponse - A function that takes player input and game state as input and returns a generated story response.
 * - GenerateStoryResponseInput - The input type for the generateStoryResponse function.
 * - GenerateStoryResponseOutput - The return type for the generateStoryResponse function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateStoryResponseInputSchema = z.object({
  playerInput: z.string().describe('The player input in natural language.'),
  gameState: z
    .string()
    .describe(
      'The current game state, including player stats, inventory, and location.'
    ),
});
export type GenerateStoryResponseInput = z.infer<typeof GenerateStoryResponseInputSchema>;

const GenerateStoryResponseOutputSchema = z.object({
  storyResponse: z.string().describe('The generated story response from the AI.'),
  updatedGameState: z.string().describe('The updated game state after the AI response.'),
  choices: z
    .array(z.string())
    .describe('An array of choices for the player to select from.'),
});
export type GenerateStoryResponseOutput = z.infer<typeof GenerateStoryResponseOutputSchema>;

export async function generateStoryResponse(
  input: GenerateStoryResponseInput
): Promise<GenerateStoryResponseOutput> {
  return generateStoryResponseFlow(input);
}

const generateStoryResponsePrompt = ai.definePrompt({
  name: 'generateStoryResponsePrompt',
  input: {
    schema: z.object({
      playerInput: z.string().describe('The player input in natural language.'),
      gameState: z
        .string()
        .describe(
          'The current game state, including player stats, inventory, and location.'
        ),
    }),
  },
  output: {
    schema: z.object({
      storyResponse: z.string().describe('The generated story response from the AI.'),
      updatedGameState: z
        .string()
        .describe('The updated game state after the AI response.'),
      choices: z
        .array(z.string())
        .describe('An array of choices for the player to select from.'),
    }),
  },
  prompt: `You are the game master for a text-based fantasy RPG. A player has taken an action, respond with a descriptive and engaging story. The story should be no more than three sentences.

      Player Input: {{{playerInput}}}

      Current Game State: {{{gameState}}}

      After the story, provide 3-5 numbered choices for the player. Do not include any other text other than the choices.

      Make sure to update the game state according to the players actions, and the story elements.

      Return the new story response, updated game state, and the choices.`,
});

const generateStoryResponseFlow = ai.defineFlow<
  typeof GenerateStoryResponseInputSchema,
  typeof GenerateStoryResponseOutputSchema
>(
  {
    name: 'generateStoryResponseFlow',
    inputSchema: GenerateStoryResponseInputSchema,
    outputSchema: GenerateStoryResponseOutputSchema,
  },
  async input => {
    const {output} = await generateStoryResponsePrompt(input);
    return output!;
  }
);
