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
      'The current game state, including player stats, inventory, and location, as a JSON string.' // Clarify it's already a string
    ),
});
export type GenerateStoryResponseInput = z.infer<typeof GenerateStoryResponseInputSchema>;

// Output schema expects updatedGameState as a STRING containing JSON
const GenerateStoryResponseOutputSchema = z.object({
  storyResponse: z.string().describe('The generated story response from the AI.'),
  updatedGameState: z
    .string()
    .describe(
      'The updated game state as a JSON *string* after the AI response. This string must contain valid, escaped JSON.' // Emphasize STRING and escaped JSON requirement
    ),
  choices: z
    .array(z.string())
    .describe('An array of choices for the player to select from.'),
});
export type GenerateStoryResponseOutput = z.infer<typeof GenerateStoryResponseOutputSchema>;

export async function generateStoryResponse(
  input: GenerateStoryResponseInput
): Promise<GenerateStoryResponseOutput> {
  // No rate limiting, proceed directly
  return generateStoryResponseFlow(input);
}

const generateStoryResponsePrompt = ai.definePrompt({
  name: 'generateStoryResponsePrompt',
  input: {
    // Input schema is the same: playerInput (string), gameState (JSON string)
    schema: GenerateStoryResponseInputSchema,
  },
  output: {
    // Output schema expects updatedGameState as a STRING containing JSON
    schema: GenerateStoryResponseOutputSchema,
  },
  // Switch model for potentially better story generation and JSON handling
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are the game master for a text-based fantasy RPG. A player has taken an action, respond with a descriptive and engaging story. The story should be no more than three sentences.

      Player Input: {{{playerInput}}}

      Current Game State (JSON String): {{{gameState}}}

      Your tasks:
      1.  Narrate the outcome of the player's action in the 'storyResponse' field (max 3 sentences). Be creative and immersive.
      2.  Update the game state based on the player's action and the narrative outcome. The 'updatedGameState' field **MUST** be a valid JSON **STRING** representing the *entire* game state object, reflecting any changes (HP, location, inventory, stats, coins, chapter etc.). Use the existing state as a base and return the *entire* new state as a single JSON string. **DO NOT** return a nested JSON object for 'updatedGameState'; it **MUST** be a string.
          **Example of CORRECT format for updatedGameState:**
          \`"{\\"chapter\\":1,\\"hp\\":95,\\"stats\\":{\\"strength\\":10,...},\\"inventory\\":[\\"Sword\\",\\"New Item\\"],\\"location\\":\\"cave entrance\\",\\"coins\\":15}"\`
          **Example of INCORRECT format:**
          \`{"chapter":1, "hp": 95, ...}\` (This is an object, not a string containing JSON)
      3.  Provide 3-5 plausible next actions or choices for the player in the 'choices' array. These should be concise strings. Ensure choices are relevant to the current situation described in the story response.

      Return ONLY a valid JSON object matching the output schema. Do not include any text before or after the JSON object. Ensure the 'updatedGameState' value is a properly escaped JSON string within the main JSON object.`,
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
       // The AI should return output matching GenerateStoryResponseOutputSchema,
       // including updatedGameState as a string.
       // Genkit's prompt() call will perform schema validation based on the defined output schema.
       const {output} = await generateStoryResponsePrompt(input);

       if (!output) {
          throw new Error('AI did not return a valid response.');
       }

       // Optional: Additional validation if needed, though schema validation is the primary check.
       // Attempt to parse the updatedGameState string to ensure it's valid JSON *before* returning
       // This helps catch errors earlier if the AI failed to format the string correctly despite passing schema validation.
       try {
         JSON.parse(output.updatedGameState);
       } catch(e) {
          console.error("AI returned an invalid JSON string for updatedGameState (even after schema validation):", output.updatedGameState, e);
          // Consider how to handle this - maybe return a default state or throw a specific error.
          // For now, we'll throw to indicate the AI didn't fully comply.
          throw new Error("AI failed to provide a valid updated game state JSON string.");
       }

       return output;
    } catch (error: any) {
        console.error("Error in generateStoryResponseFlow:", error);
        // Handle specific Genkit errors (like schema validation failure)
        if (error instanceof Error && error.name === 'GenkitError' && error.message?.includes('Schema validation failed')) {
             console.error("Detailed Genkit Schema Validation Error:", error);
             // Provide a more user-friendly error message
             throw new Error('The storyteller had trouble formulating the response. Please try again.');
        }
        // Handle API errors (like overload or unavailability)
        if (error instanceof Error && (error.message?.includes('503') || error.message?.toLowerCase().includes('overloaded') || error.message?.toLowerCase().includes('unavailable'))) {
             throw new Error('The storyteller is currently unavailable (API Error). Please try again later.');
        }
        // Throw a generic error for other issues
        throw new Error(`Failed to generate story response: ${error.message || 'Unknown internal error'}`);
    }
  }
);
