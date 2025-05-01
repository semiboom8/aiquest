'use server';

/**
 * @fileOverview This file defines the interpretInputFlow, which takes player input and the current game state,
 * and returns an updated game state and the AI's response. It includes the InterpretInputInput,
 * InterpretInputOutput types and the interpretInput function to call the flow.
 * NOTE: This flow appears deprecated/unused in favor of generate-story-response.ts based on current page.tsx usage.
 * Consider removing if confirmed unused.
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
  // Proceed directly with the flow, rate limiting removed
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
   // Switch model for potentially better JSON handling
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are the narrator and game master of a text-based fantasy RPG. The player provides input, and you respond by updating the game state and providing a narrative response.

Here is the current game state, as a JSON string: {{{gameState}}}

Here is the player's input: {{{playerInput}}}

Based on the player's input and the current game state, generate a narrative response and update the game state. The updated game state MUST be returned as a valid JSON string representing the *entire* game state object.

Your response should include:
- A narrative response to the player's input (in the 'aiResponse' field).
- Updates to the game state reflected in the 'updatedGameState' field (e.g., changes to player health, stats, inventory, location, coins).
- 3-5 numbered choices for the player to select from at the end of the narrative response.

Return ONLY a valid JSON object matching the output schema. Do not include any text before or after the JSON object.
`,
  // Request JSON output
  output: { format: 'json' },
});

const interpretInputFlow = ai.defineFlow<InterpretInputInputSchema, InterpretInputOutputSchema>(
  {
    name: 'interpretInputFlow',
    inputSchema: InterpretInputInputSchema,
    outputSchema: InterpretInputOutputSchema,
  },
  async input => {
     try {
        const {output} = await prompt(input);
        if (!output) {
           throw new Error('AI did not return a valid response.');
        }
         // Basic validation
       if (!output.aiResponse || !output.updatedGameState) {
         console.error("Invalid AI response structure:", output);
         throw new Error("Received invalid structure from AI.");
       }
        return output;
     } catch (error: any) {
         console.error("Error in interpretInputFlow:", error);
          // Check for specific API errors (e.g., overload)
         if (error.message && (error.message.includes('503') || error.message.toLowerCase().includes('overloaded'))) {
              throw new Error('The storyteller is currently unavailable (503). Please try again later.');
         }
         // Throw a generic error for other issues
         throw new Error('Failed to interpret input due to an internal error.');
     }
  }
);
