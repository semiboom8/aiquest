// src/app/page.tsx
'use client';

import {useState, useEffect, useRef, useCallback} from 'react';
import {z} from 'zod';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ScrollArea} from '@/components/ui/scroll-area';
import {
  generateStoryResponse,
  GenerateStoryResponseInput,
  GenerateStoryResponseOutput,
} from '@/ai/flows/generate-story-response';
import {Loader2} from 'lucide-react';

// Define the game state schema
const GameStateSchema = z.object({
  chapter: z.number().default(1),
  hp: z.number().default(100),
  stats: z.object({
    strength: z.number(),
    dexterity: z.number(),
    intelligence: z.number(),
    charisma: z.number(),
    luck: z.number(),
  }),
  inventory: z.array(z.string()).default([]),
  location: z.string().default('dark forest edge'),
  coins: z.number().default(0),
});

type GameState = z.infer<typeof GameStateSchema>;

interface StoryEntry {
  type: 'story' | 'playerInput';
  text: string;
  key: number;
}

export default function Home() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [storyHistory, setStoryHistory] = useState<StoryEntry[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [playerInput, setPlayerInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStoryKey, setCurrentStoryKey] = useState(0);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize game state on client mount
  useEffect(() => {
    if (!gameState) {
      const initialStats = {
        strength: Math.floor(Math.random() * 10) + 5,
        dexterity: Math.floor(Math.random() * 10) + 5,
        intelligence: Math.floor(Math.random() * 10) + 5,
        charisma: Math.floor(Math.random() * 10) + 5,
        luck: Math.floor(Math.random() * 10) + 5,
      };
      const initialGameState: GameState = {
        chapter: 1,
        hp: 100,
        stats: initialStats,
        inventory: ['Basic Sword', 'Health Potion'],
        location: 'dark forest edge',
        coins: 10,
      };
      setGameState(initialGameState);
      addStoryEntry('Welcome to TextQuest Adventures! You stand at the edge of a dark forest. What do you do?');
    }
  }, [gameState]); // Depend on gameState to avoid re-initialization

  // Scroll to bottom when story history updates
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if(scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [storyHistory]);

  const addStoryEntry = useCallback((text: string, type: 'story' | 'playerInput' = 'story') => {
    setStoryHistory(prev => [...prev, {type, text, key: currentStoryKey}]);
    setCurrentStoryKey(prev => prev + 1); // Ensure unique keys for animation
  }, [currentStoryKey]);

  const handlePlayerAction = useCallback(async (input: string) => {
    if (!input.trim() || isLoading || !gameState) return;

    setIsLoading(true);
    setError(null);
    addStoryEntry(input, 'playerInput'); // Add player input to history immediately
    setPlayerInput(''); // Clear input field
    setChoices([]); // Clear choices while waiting for AI

    try {
      const aiInput: GenerateStoryResponseInput = {
        playerInput: input,
        gameState: JSON.stringify(gameState),
      };

      const result: GenerateStoryResponseOutput = await generateStoryResponse(aiInput);

      addStoryEntry(result.storyResponse);
      setChoices(result.choices);

      // Attempt to parse and validate the updated game state
      try {
        const updatedGameState = GameStateSchema.parse(JSON.parse(result.updatedGameState));
        setGameState(updatedGameState);
      } catch (parseError) {
        console.error('Failed to parse updated game state:', parseError);
        setError('Error updating game state. Continuing with previous state.');
        // Optionally revert to previous state or handle error differently
      }

    } catch (aiError) {
      console.error('Error fetching story response:', aiError);
      setError('Failed to get response from the storyteller. Please try again.');
      addStoryEntry('The storyteller seems lost in thought... Try again.', 'story');
    } finally {
      setIsLoading(false);
    }
  }, [gameState, isLoading, addStoryEntry]);

  const handleChoiceClick = (choice: string) => {
    // Remove the number prefix if present (e.g., "1. Explore the cave")
    const choiceText = choice.replace(/^\d+\.\s*/, '');
    handlePlayerAction(choiceText);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerInput(event.target.value);
  };

  const handleInputSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handlePlayerAction(playerInput);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center p-4 bg-background text-foreground">
      <Card className="w-full max-w-4xl h-full flex flex-col shadow-lg border-primary">
        <CardHeader className="border-b border-primary">
          <CardTitle className="text-center text-2xl font-bold text-primary">TextQuest Adventures</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow p-0 overflow-hidden flex">
          {/* Main Game Area */}
          <div className="flex-grow flex flex-col p-4">
            <ScrollArea className="flex-grow mb-4 pr-4" ref={scrollAreaRef}>
              {storyHistory.map((entry) => (
                <p
                  key={entry.key}
                  className={`mb-2 ${entry.type === 'playerInput' ? 'text-accent italic pl-4 border-l-2 border-accent' : ''} fade-in`}
                  style={{animationDelay: `${entry.key * 0.05}s`}} // Stagger animation
                >
                  {entry.type === 'playerInput' ? `> ${entry.text}` : entry.text}
                </p>
              ))}
              {isLoading && (
                <div className="flex items-center justify-center p-4 fade-in">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">The storyteller ponders...</p>
                </div>
              )}
              {error && <p className="text-destructive mt-2 fade-in">{error}</p>}
              {!isLoading && choices.length > 0 && (
                <div className="mt-4 space-y-2 fade-in">
                  <p className="font-semibold text-foreground">Your choices:</p>
                  {choices.map((choice, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start text-left hover:bg-accent/10 border-accent text-accent"
                      onClick={() => handleChoiceClick(choice)}
                      disabled={isLoading}
                    >
                      {choice}
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
            <form onSubmit={handleInputSubmit} className="flex gap-2 mt-auto">
              <Input
                type="text"
                placeholder="What do you do?"
                value={playerInput}
                onChange={handleInputChange}
                className="flex-grow focus:ring-accent focus:border-accent"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !playerInput.trim()} className="bg-primary hover:bg-primary/90">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
              </Button>
            </form>
          </div>

          {/* Stats Panel */}
          {gameState && (
            <div className="w-1/4 min-w-[200px] border-l border-primary p-4 flex flex-col bg-card overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 text-primary border-b border-primary pb-2">Character</h3>
              <p>HP: <span className="font-bold text-accent">{gameState.hp}/100</span></p>
              <p>Location: <span className="font-bold text-accent">{gameState.location}</span></p>
              <p>Coins: <span className="font-bold text-accent">{gameState.coins}</span></p>
              <p>Chapter: <span className="font-bold text-accent">{gameState.chapter}</span></p>

              <h4 className="text-md font-semibold mt-4 mb-2 text-primary border-b border-primary pb-1">Stats</h4>
              <ul className="list-disc list-inside pl-2 space-y-1 text-sm">
                <li>Strength: {gameState.stats.strength}</li>
                <li>Dexterity: {gameState.stats.dexterity}</li>
                <li>Intelligence: {gameState.stats.intelligence}</li>
                <li>Charisma: {gameState.stats.charisma}</li>
                <li>Luck: {gameState.stats.luck}</li>
              </ul>

              <h4 className="text-md font-semibold mt-4 mb-2 text-primary border-b border-primary pb-1">Inventory</h4>
              {gameState.inventory.length > 0 ? (
                <ul className="list-disc list-inside pl-2 space-y-1 text-sm">
                  {gameState.inventory.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">Inventory is empty.</p>
              )}

              {/* Placeholder for Save/Load buttons - Functionality not implemented */}
              <div className="mt-auto space-y-2 pt-4">
                <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent/10" disabled>Save Game (F5)</Button>
                <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent/10" disabled>Load Game (F9)</Button>
                <Button variant="destructive" className="w-full" disabled>Exit Game (ESC)</Button>
              </div>
            </div>
          )}
        </CardContent>
         <CardFooter className="text-xs text-muted-foreground pt-2 justify-center border-t border-primary">
           Powered by Google Generative AI
         </CardFooter>
      </Card>
    </div>
  );
}
