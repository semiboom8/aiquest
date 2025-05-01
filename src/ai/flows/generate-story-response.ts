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
import { checkRateLimit } from '@/lib/rate-limiter'; // Import the rate check function
import { RateLimitExceededError } from '@/lib/errors'; // Import the custom error class

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
   // Check rate limit before processing
  try {
    await checkRateLimit(); // Call the rate limiter with await
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      // Re-throw the specific error for the client to catch
      throw error;
    }
    // Handle other potential errors during check if necessary
    console.error("Unexpected error during rate limit check:", error);
    throw new Error("An internal error occurred while checking request rate.");
  }

  // If rate limit is not exceeded, proceed with the flow
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
  // Switch model for potentially better story generation and JSON handling
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are the game master for a text-based fantasy RPG. A player has taken an action, respond with a descriptive and engaging story. The story should be no more than three sentences.

      Player Input: {{{playerInput}}}

      Current Game State (JSON): {{{gameState}}}

      Your tasks:
      1.  Narrate the outcome of the player's action in the 'storyResponse' field (max 3 sentences). Be creative and immersive.
      2.  Update the game state based on the player's action and the narrative outcome. The 'updatedGameState' field MUST be a valid JSON string representing the *entire* game state object, reflecting any changes (HP, location, inventory, stats, coins, chapter etc.). Use the existing state as a base.
      3.  Provide 3-5 plausible next actions or choices for the player in the 'choices' array. These should be concise strings. Ensure choices are relevant to the current situation described in the story response.

      Return ONLY a valid JSON object matching the output schema. Do not include any text before or after the JSON object.`,
  // Request JSON output
  output: { format: 'json' },
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
    try {
       const {output} = await generateStoryResponsePrompt(input);
       if (!output) {
          throw new Error('AI did not return a valid response.');
       }
       // Basic validation (more robust parsing/validation happens client-side)
       if (!output.storyResponse || !output.updatedGameState || !Array.isArray(output.choices)) {
         console.error("Invalid AI response structure:", output);
         throw new Error("Received invalid structure from AI.");
       }
       return output;
    } catch (error: any) {
        console.error("Error in generateStoryResponseFlow:", error);
        // Check for specific API errors (e.g., overload)
        if (error.message && (error.message.includes('503') || error.message.toLowerCase().includes('overloaded'))) {
             throw new Error('The storyteller is currently unavailable (503). Please try again later.');
        }
         if (error instanceof RateLimitExceededError) {
           throw error; // Re-throw rate limit errors
         }
        // Throw a generic error for other issues
        throw new Error('Failed to generate story response due to an internal error.');
    }
  }
);
