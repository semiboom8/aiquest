'use server';

/**
 * @fileOverview This file defines the interpretInputFlow, which takes player input and the current game state,
 * and returns an updated game state and the AI's response. It includes the InterpretInputInput,
 * InterpretInputOutput types and the interpretInput function to call the flow.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const InterpretInputInputSchema = z.object({
  playerInput: z.string().describe('The player input in natural language.'),
  gameState: z.string().describe('The current game state as a JSON string.'),
});
export type InterpretInputInput = z.infer<typeof InterpretInputInputSchema>;

const InterpretInputOutputSchema = z.object({
  aiResponse: z.string().describe('The AI response to the player input.'),
  updatedGameState: z.string().describe('The updated game state as a JSON string.'),
});
export type InterpretInputOutput = z.infer<typeof InterpretInputOutputSchema>;

export async function interpretInput(input: InterpretInputInput): Promise<InterpretInputOutput> {
  return interpretInputFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interpretInputPrompt',
  input: {
    schema: z.object({
      playerInput: z.string().describe('The player input in natural language.'),
      gameState: z.string().describe('The current game state as a JSON string.'),
    }),
  },
  output: {
    schema: z.object({
      aiResponse: z.string().describe('The AI response to the player input.'),
      updatedGameState: z.string().describe('The updated game state as a JSON string.'),
    }),
  },
  prompt: `You are the narrator and game master of a text-based fantasy RPG. The player provides input, and you respond by updating the game state and providing a narrative response.

Here is the current game state, as a JSON string: {{{gameState}}}

Here is the player's input: {{{playerInput}}}

Based on the player's input and the current game state, generate a narrative response and update the game state. The updated game state should also be returned as a JSON string.

Your response should include:
- A narrative response to the player's input.
- Updates to the game state, including changes to player health, stats, inventory, and location.  Use the [HP -10], [STAT +X], [ADD: item], and [REMOVE: item] tags to signify those changes.  Do not actually apply the changes yourself.
- 3-5 numbered choices for the player to select from at the end of each interaction.

Return the updated game state and narrative response in the following JSON format:
{
  "aiResponse": "narrative response",
  "updatedGameState": "updated game state"
}
`,
});

const interpretInputFlow = ai.defineFlow<InterpretInputInputSchema, InterpretInputOutputSchema>(
  {
    name: 'interpretInputFlow',
    inputSchema: InterpretInputInputSchema,
    outputSchema: InterpretInputOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
