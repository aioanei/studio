
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { GameSession, Player, Question, PlayerAnswer, GameStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateQuestions } from '@/ai/flows/generate-questions';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';
import { Users, Play, ArrowRight, Loader2, MessageSquare, Crown, Info } from 'lucide-react';

const MIN_PLAYERS = 2; // Minimum players to start the game

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  // Ensure sessionId is treated as uppercase consistently
  const sessionId = (params.sessionId as string)?.toUpperCase();

  const [session, setSession] = useState<GameSession | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null); // ID of the user using this browser
  const [isLoading, setIsLoading] = useState(false); // For AI call or other async ops
  const [isSubmitting, setIsSubmitting] = useState(false);

  const storageKey = `hotseat-session-${sessionId}`;
  const playerStorageKey = `hotseat-player-${sessionId}`;

  // Load session and current player from localStorage
  useEffect(() => {
    if (!sessionId) return;

    const storedSession = localStorage.getItem(storageKey);
    if (storedSession) {
      setSession(JSON.parse(storedSession));
    } else {
      // Initialize new session if not found (e.g., first visit)
      setSession({
        id: sessionId,
        players: [],
        questions: [],
        allAnswers: {},
        currentQuestionIndex: 0,
        status: 'lobby',
      });
    }

    const storedPlayerId = localStorage.getItem(playerStorageKey);
    if (storedPlayerId) {
      setCurrentPlayerId(storedPlayerId);
    }
  }, [sessionId, storageKey, playerStorageKey]);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (session) {
      localStorage.setItem(storageKey, JSON.stringify(session));
    }
  }, [session, storageKey]);

  const updateSession = useCallback((newSessionData: Partial<GameSession> | ((prev: GameSession) => GameSession)) => {
    setSession(prev => {
      if (!prev) return null; // Should not happen if initialized
      const updated = typeof newSessionData === 'function' ? newSessionData(prev) : { ...prev, ...newSessionData };
      return updated;
    });
  }, []);

  const handleAddPlayer = () => {
    if (!playerName.trim() || !session) return;
    if (session.players.find(p => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
      toast({ title: "Name already taken", description: "Please choose a different name.", variant: "destructive" });
      return;
    }

    const newPlayer: Player = { id: nanoid(8), name: playerName.trim(), score: 0 };
    updateSession(prev => ({ ...prev, players: [...prev.players, newPlayer] }));
    
    if (!currentPlayerId) {
      setCurrentPlayerId(newPlayer.id);
      localStorage.setItem(playerStorageKey, newPlayer.id);
    }
    setPlayerName('');
    toast({ title: "Player Added!", description: `${newPlayer.name} has joined the game.` });
  };

  const handleStartGame = async () => {
    if (!session || session.players.length < MIN_PLAYERS) {
      toast({ title: "Not enough players", description: `You need at least ${MIN_PLAYERS} players to start.`, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const playerNames = session.players.map(p => p.name);
      const numQuestions = playerNames.length * 2; // Generate 2 questions per player
      const aiResult = await generateQuestions({ playerNames, numQuestions });
      
      const questions: Question[] = aiResult.questions.map(qText => ({ id: nanoid(8), text: qText }));
      
      updateSession(prev => ({
        ...prev,
        questions,
        status: 'playing',
        currentQuestionIndex: 0,
        allAnswers: {}, // Reset answers
      }));
      toast({ title: "Game Started!", description: "Let the fun begin!" });
    } catch (error) {
      console.error("Failed to generate questions:", error);
      toast({ title: "Error starting game", description: "Could not generate questions. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = (chosenPlayerId: string) => {
    if (!session || !currentPlayerId || session.status !== 'playing') return;
    setIsSubmitting(true);

    const currentQuestion = session.questions[session.currentQuestionIndex];
    if (!currentQuestion) {
      setIsSubmitting(false);
      return;
    }

    const newAnswer: PlayerAnswer = { playerId: currentPlayerId, chosenPlayerId };

    updateSession(prev => {
      if (!prev) return prev;
      const existingAnswers = prev.allAnswers[currentQuestion.id] || [];
      const updatedAnswersForQuestion = [...existingAnswers.filter(a => a.playerId !== currentPlayerId), newAnswer];
      
      const allPlayersAnswered = prev.players.every(p => 
        updatedAnswersForQuestion.some(ans => ans.playerId === p.id)
      );

      if (allPlayersAnswered) {
        if (prev.currentQuestionIndex < prev.questions.length - 1) {
           toast({ title: "Round Complete!", description: "Moving to the next question..." });
          return {
            ...prev,
            allAnswers: { ...prev.allAnswers, [currentQuestion.id]: updatedAnswersForQuestion },
            currentQuestionIndex: prev.currentQuestionIndex + 1,
          };
        } else {
          router.push(`/session/${sessionId}/results`);
          return { 
            ...prev,
            allAnswers: { ...prev.allAnswers, [currentQuestion.id]: updatedAnswersForQuestion }, 
            status: 'results' 
          }; 
        }
      } else {
        toast({ title: "Answer Submitted!", description: "Waiting for other players..." });
        return {
          ...prev,
          allAnswers: { ...prev.allAnswers, [currentQuestion.id]: updatedAnswersForQuestion },
        };
      }
    });
    setIsSubmitting(false);
  };
  
  const currentQuestion = session?.status === 'playing' ? session.questions[session.currentQuestionIndex] : null;
  const currentPlayerHasAnswered = session && currentQuestion && currentPlayerId &&
    (session.allAnswers[currentQuestion.id] || []).some(ans => ans.playerId === currentPlayerId);


  if (!session) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 text-xl">Loading session...</p>
      </div>
    );
  }

  const isHost = currentPlayerId && session.players.length > 0 && session.players[0].id === currentPlayerId;

  if (session.status === 'lobby') {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline">Game Lobby</CardTitle>
            <CardDescription>Session ID: <span className="font-bold text-primary">{sessionId}</span></CardDescription>
            <p className="text-sm text-muted-foreground">Share this ID with your friends to join!</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Local Session Note</AlertTitle>
              <AlertDescription>
                Currently, game sessions are stored locally in your browser using localStorage. This means data isn't shared with friends on other devices. For true multi-device play, a real-time database (like Firebase) is needed.
              </AlertDescription>
            </Alert>

            {!currentPlayerId || !session.players.find(p => p.id === currentPlayerId) ? (
              <div className="space-y-2">
                <Input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                />
                <Button onClick={handleAddPlayer} className="w-full bg-accent hover:bg-accent/90" disabled={!playerName.trim()}>
                  Join Game
                </Button>
              </div>
            ) : (
              <p className="text-center text-lg font-medium text-green-600">
                You've joined as {session.players.find(p=>p.id === currentPlayerId)?.name}! Waiting for others...
              </p>
            )}

            <div>
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" /> Players ({session.players.length})
              </h3>
              {session.players.length > 0 ? (
                <ScrollArea className="h-40 rounded-md border p-3 bg-secondary/30">
                  <ul className="space-y-2">
                    {session.players.map((p, index) => (
                      <li key={p.id} className="flex items-center justify-between p-2 bg-background rounded-md shadow-sm">
                        <div className="flex items-center gap-2">
                           <Avatar className="w-8 h-8">
                            <AvatarImage src={`https://placehold.co/40x40/E3F2FD/4285F4?text=${p.name.charAt(0).toUpperCase()}`} alt={p.name} data-ai-hint="letter avatar" />
                            <AvatarFallback>{p.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{p.name}</span>
                          {p.id === currentPlayerId && <span className="text-xs text-accent">(You)</span>}
                        </div>
                        {index === 0 && <Crown className="w-5 h-5 text-yellow-500" title="Host" />}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-center py-4">No players yet. Be the first to join!</p>
              )}
            </div>

            {isHost && (
              <Button
                onClick={handleStartGame}
                disabled={isLoading || session.players.length < MIN_PLAYERS}
                className="w-full text-lg py-3 bg-primary hover:bg-primary/90"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Play className="w-6 h-6 mr-2" />}
                Start Game ({session.players.length < MIN_PLAYERS ? `${MIN_PLAYERS - session.players.length} more needed` : 'Ready!'})
              </Button>
            )}
            {!isHost && currentPlayerId && session.players.length > 0 && (
                 <p className="text-center text-muted-foreground">Waiting for the host ({session.players[0]?.name}) to start the game.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.status === 'playing' && currentQuestion) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <Card className="shadow-lg animate-in fade-in duration-500">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-headline text-center text-primary">
              Question {session.currentQuestionIndex + 1} / {session.questions.length}
            </CardTitle>
             <CardDescription className="text-center text-muted-foreground">
              {session.players.find(p=>p.id === currentPlayerId)?.name}, who is most likely to...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="text-center p-6 bg-secondary/50 rounded-lg min-h-[100px] flex items-center justify-center">
              <p className="text-xl md:text-2xl font-medium text-foreground">
                <MessageSquare className="inline-block w-7 h-7 mr-2 mb-1 text-primary" />
                {currentQuestion.text}
              </p>
            </div>
            
            {currentPlayerHasAnswered ? (
              <div className="text-center p-4 bg-green-100 text-green-700 rounded-md">
                <p className="font-semibold">Your answer is submitted! Waiting for others or next question.</p>
                 {isSubmitting && <Loader2 className="w-6 h-6 animate-spin mx-auto mt-2" />}
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-semibold mb-4 text-center text-accent">Choose a Player:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {session.players
                    .filter(p => p.id !== currentPlayerId) // Can't choose self
                    .map(player => (
                    <Button
                      key={player.id}
                      variant="outline"
                      size="lg"
                      className="text-lg justify-start p-4 h-auto hover:bg-primary/10 hover:border-primary transition-all duration-200"
                      onClick={() => handleSubmitAnswer(player.id)}
                      disabled={isSubmitting}
                    >
                      <Avatar className="w-10 h-10 mr-3">
                         <AvatarImage src={`https://placehold.co/40x40/E3F2FD/9C27B0?text=${player.name.charAt(0).toUpperCase()}`} alt={player.name} data-ai-hint="letter avatar" />
                         <AvatarFallback>{player.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {player.name}
                      {isSubmitting && <Loader2 className="w-5 h-5 animate-spin ml-auto" />}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.status === 'results') {
     router.push(`/session/${sessionId}/results`); 
     return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="ml-4 text-xl">Loading results...</p>
        </div>
     );
  }

  return (
    <div className="text-center py-10">
      <h1 className="text-2xl font-bold">Something went wrong.</h1>
      <p className="text-muted-foreground">Could not determine game state.</p>
      <Button onClick={() => router.push('/')} className="mt-4">Go Home</Button>
    </div>
  );
}
