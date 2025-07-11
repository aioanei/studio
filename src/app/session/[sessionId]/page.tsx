
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, FieldValue } from 'firebase/firestore';
import type { GameSession, Player, Question, PlayerAnswer, GameStatus, QuestionDifficulty } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { nanoid } from 'nanoid';
import { Users, Play, Loader2, MessageSquare, Crown, Frown, Sparkles, ChevronsRight, Info, Timer } from 'lucide-react';
import { PREDEFINED_QUESTIONS } from '@/lib/questions';

const MIN_PLAYERS = 2; 
const ROUND_TIMER_SECONDS = 15;

// Helper function to shuffle an array and pick a certain number of items
function shuffleAndPick<T>(array: T[], count: number): T[] {
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function RoundResult({ session, currentQuestion, isHost, onNextRound }: { session: GameSession, currentQuestion: Question, isHost: boolean, onNextRound: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 100); // Stagger for animation
    return () => clearTimeout(timer);
  }, []);

  if (!currentQuestion) return null;

  const answersForQuestion = session.allAnswers[currentQuestion.id] || [];
  const votes: Record<string, number> = {};
  
  answersForQuestion.forEach(ans => {
    votes[ans.chosenPlayerId] = (votes[ans.chosenPlayerId] || 0) + 1;
  });

  const maxVotes = Math.max(0, ...Object.values(votes));
  const winners = session.players.filter(p => votes[p.id] === maxVotes && maxVotes > 0);

  return (
    <div className={`max-w-3xl mx-auto py-8 transition-opacity duration-700 ease-in-out ${show ? 'opacity-100' : 'opacity-0'}`}>
        <Card className="shadow-2xl border-2 border-primary/50 overflow-hidden">
            <CardHeader className="text-center bg-secondary/30">
                <CardTitle className="text-3xl font-headline text-primary">
                    Round {session.currentQuestionIndex + 1} Results
                </CardTitle>
                <CardDescription className="text-lg mt-2">
                    For the question: <span className="font-semibold text-foreground">"{currentQuestion.text}"</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="py-8 text-center">
                <div className="relative">
                    <Sparkles className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 text-yellow-400 animate-pulse" />
                    <h3 className="text-2xl font-semibold text-accent mb-4">The Hot Seat goes to...</h3>
                    
                    {winners.length > 0 ? (
                        <div className="flex flex-col items-center gap-4">
                            {winners.map(winner => (
                                <div key={winner.id} className="flex flex-col items-center animate-in fade-in zoom-in-105 duration-1000">
                                    <Avatar className="w-24 h-24 mb-3 border-4 border-yellow-400">
                                        <AvatarImage src={`https://placehold.co/96x96/FFD700/000000?text=${winner.name.charAt(0).toUpperCase()}`} alt={winner.name} data-ai-hint="letter avatar" />
                                        <AvatarFallback>{winner.name.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <p className="text-3xl font-bold text-primary">{winner.name}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xl text-muted-foreground">No one got any votes!</p>
                    )}
                </div>
            </CardContent>
            {isHost && (
                <CardContent className="text-center border-t pt-6">
                    <Button size="lg" onClick={onNextRound} className="animate-bounce">
                        {session.currentQuestionIndex < session.questions.length - 1 ? 'Next Question' : 'View Final Results'}
                        <ChevronsRight className="w-5 h-5 ml-2" />
                    </Button>
                </CardContent>
            )}
            {!isHost && (
                <p className="text-center text-muted-foreground pb-6">Waiting for the host to continue...</p>
            )}
        </Card>
    </div>
  );
}


export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const sessionId = (params.sessionId as string)?.toUpperCase();

  const [session, setSession] = useState<GameSession | null | undefined>(undefined); // undefined: loading, null: not found
  const [playerName, setPlayerName] = useState('');
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For starting game
  const [isSubmitting, setIsSubmitting] = useState(false); // For answer submission
  const [timeLeft, setTimeLeft] = useState(ROUND_TIMER_SECONDS);

  const playerStorageKey = `hotseat-player-${sessionId}`;
  
  const isHost = session && currentPlayerId && session.players.length > 0 && session.players[0].id === currentPlayerId;

  // Effect to manage the round timer
  useEffect(() => {
    if (session?.status !== 'playing' || !isHost) {
      return;
    }

    setTimeLeft(session.timerDuration); // Reset timer

    const timerInterval = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerInterval);
          // Host's client forces the round to end
          if (isHost) {
            const sessionRef = doc(db, 'sessions', sessionId);
            updateDoc(sessionRef, { status: 'round_results' });
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
    // isHost is included because only the host should run the timer logic that updates Firestore
  }, [session?.status, session?.currentQuestionIndex, session?.timerDuration, sessionId, isHost]);


  useEffect(() => {
    if (sessionId) { 
        const storedPlayerId = localStorage.getItem(playerStorageKey);
        if (storedPlayerId) {
          setCurrentPlayerId(storedPlayerId);
        }
    }
  }, [playerStorageKey, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        setSession(docSnap.data() as GameSession);
      } else {
        const isCreatingNew = searchParams.get('new') === 'true';
        const difficultyFromQuery = searchParams.get('difficulty') as QuestionDifficulty | null;
        const numQuestionsFromQuery = parseInt(searchParams.get('numQuestions') || '10', 10);
        
        if (isCreatingNew && difficultyFromQuery) {
          const newSession: GameSession = {
            id: sessionId,
            players: [],
            questions: [],
            allAnswers: {},
            currentQuestionIndex: 0,
            status: 'lobby',
            difficulty: difficultyFromQuery,
            numRounds: numQuestionsFromQuery,
            timerDuration: ROUND_TIMER_SECONDS,
          };
          setDoc(sessionRef, newSession)
            .then(() => {
              setSession(newSession);
              toast({ title: "Session Created!", description: "Waiting for players to join." });
            })
            .catch(error => {
              console.error("Error creating session:", error);
              toast({ 
                title: "Session Creation Failed", 
                description: `Could not create session ${sessionId}. Check Firebase setup. Error: ${error.message}`, 
                variant: "destructive",
                duration: 9000,
              });
              router.push('/');
            });
        } else {
          setSession(null);
        }
      }
    }, (error) => {
      console.error("Error subscribing to session:", error);
      toast({ title: "Connection Error", description: "Could not connect to session. Check Firebase setup and console.", variant: "destructive" });
      setSession(null);
    });

    return () => unsubscribe();
  }, [sessionId, router, searchParams, toast]);


  const handleAddPlayer = async () => {
    if (!playerName.trim() || !session || session.status !== 'lobby') return;
    if (session.players.find(p => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
      toast({ title: "Name already taken", description: "Please choose a different name.", variant: "destructive" });
      return;
    }

    let playerIdToSet = currentPlayerId;
    if (!playerIdToSet) {
      playerIdToSet = nanoid(8);
      localStorage.setItem(playerStorageKey, playerIdToSet);
      setCurrentPlayerId(playerIdToSet);
    }
    
    const newPlayer: Player = { id: playerIdToSet, name: playerName.trim(), score: 0 };
    const sessionRef = doc(db, 'sessions', sessionId);

    try {
      if (!session) {
          toast({title: "Error", description: "Session not available to join.", variant: "destructive"});
          return;
      }
      await updateDoc(sessionRef, {
        players: arrayUnion(newPlayer)
      });
      setPlayerName('');
      toast({ title: "Player Added!", description: `${newPlayer.name} has joined the game.` });
    } catch (error) {
      console.error("Error adding player:", error);
      toast({ title: "Error", description: "Could not add player. Ensure session exists and you have permissions.", variant: "destructive" });
    }
  };

  const handleStartGame = async () => {
    if (!session || session.players.length < MIN_PLAYERS || !isHost) {
      toast({ title: "Cannot start game", description: `You need at least ${MIN_PLAYERS} players and be the host.`, variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const numQuestions = session.numRounds;
      const questionPool = PREDEFINED_QUESTIONS[session.difficulty];
      const selectedQuestions = shuffleAndPick(questionPool, numQuestions);

      if (selectedQuestions.length === 0) {
        toast({ title: "No Questions Found", description: `There are no predefined questions for the "${session.difficulty}" difficulty.`, variant: "destructive" });
        setIsLoading(false);
        return;
      }
      
      if (selectedQuestions.length < numQuestions) {
        toast({ title: "Not Enough Questions", description: `Only ${selectedQuestions.length} questions available for this difficulty, but ${numQuestions} were requested.`, variant: "destructive" });
      }

      const questions: Question[] = selectedQuestions.map(qText => ({ id: nanoid(8), text: qText }));
      
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        questions,
        status: 'playing',
        currentQuestionIndex: 0,
        allAnswers: {}, 
      });
      toast({ title: "Game Started!", description: "Let the fun begin!" });
    } catch (error) {
      console.error("Failed to start game:", error);
      toast({ title: "Error starting game", description: "Could not set up the game questions. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNextRound = async () => {
      if (!session || !isHost) return;
      
      const sessionRef = doc(db, 'sessions', sessionId);
      if (session.currentQuestionIndex < session.questions.length - 1) {
          await updateDoc(sessionRef, {
              status: 'playing',
              currentQuestionIndex: session.currentQuestionIndex + 1
          });
      } else {
          await updateDoc(sessionRef, { status: 'results' });
      }
  };

  const handleSubmitAnswer = async (chosenPlayerId: string) => {
    if (!session || !currentPlayerId || session.status !== 'playing' || !currentQuestion) return;
    setIsSubmitting(true);

    const newAnswer: PlayerAnswer = { playerId: currentPlayerId, chosenPlayerId };
    const sessionRef = doc(db, 'sessions', sessionId);
    
    try {
      const currentAnswersForQuestion = session.allAnswers[currentQuestion.id] || [];
      const updatedAnswersForQuestion = [...currentAnswersForQuestion.filter(a => a.playerId !== currentPlayerId), newAnswer];
      
      const newAllAnswers = {
        ...session.allAnswers,
        [currentQuestion.id]: updatedAnswersForQuestion
      };

      const allPlayersAnswered = session.players.every(p => 
        updatedAnswersForQuestion.some(ans => ans.playerId === p.id)
      );

      if (allPlayersAnswered) {
          await updateDoc(sessionRef, {
            allAnswers: newAllAnswers,
            status: 'round_results',
          });
      } else {
        toast({ title: "Answer Submitted!", description: "Waiting for other players..." });
        await updateDoc(sessionRef, {
          allAnswers: newAllAnswers,
        });
      }
    } catch (error) {
        console.error("Error submitting answer:", error);
        toast({ title: "Error", description: "Could not submit answer.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const currentQuestion = (session?.status === 'playing' || session?.status === 'round_results') ? session.questions[session.currentQuestionIndex] : null;
  const currentPlayerHasAnswered = session && currentQuestion && currentPlayerId &&
    (session.allAnswers[currentQuestion.id] || []).some(ans => ans.playerId === currentPlayerId);


  if (session === undefined) { 
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 text-xl mt-4">Loading session...</p>
      </div>
    );
  }

  if (session === null) { 
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] text-center p-4">
        <Frown className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-headline font-bold text-destructive mb-2">Session Not Found</h1>
        <p className="text-lg text-muted-foreground mb-6 max-w-md">
          The game session ID <span className="font-bold text-primary">{sessionId}</span> could not be found.
          It might have expired, been mistyped, or never existed. Please check your Firebase setup if you are the host.
        </p>
        <Button onClick={() => router.push('/')} size="lg">
          Go to Homepage
        </Button>
      </div>
    );
  }
  
  const difficultyText = {
    'family-friendly': 'Family Friendly',
    'getting-personal': 'Getting Personal',
    'hot-seat-exclusive': 'Hot Seat Exclusive'
  };

  if (session.status === 'lobby') {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline">Game Lobby</CardTitle>
            <CardDescription>
              Session ID: <span className="font-bold text-primary">{sessionId}</span> <br/>
              Difficulty: <span className="font-semibold text-accent">{difficultyText[session.difficulty] || 'Not set'}</span> | Questions: <span className="font-semibold text-accent">{session.numRounds}</span>
            </CardDescription>
            <p className="text-sm text-muted-foreground">Share this ID with your friends to join!</p>
          </CardHeader>
          <CardContent className="space-y-6">
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
  
  if (session.status === 'round_results' && currentQuestion) {
      return (
        <RoundResult 
            session={session} 
            currentQuestion={currentQuestion}
            isHost={!!isHost}
            onNextRound={handleNextRound}
        />
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
          <CardContent className="space-y-6">
            <div className="text-center p-6 bg-secondary/50 rounded-lg min-h-[100px] flex items-center justify-center">
              <p className="text-xl md:text-2xl font-medium text-foreground">
                <MessageSquare className="inline-block w-7 h-7 mr-2 mb-1 text-primary" />
                {currentQuestion.text}
              </p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Timer className="w-5 h-5" />
                    <span>Time Left: {timeLeft}s</span>
                </div>
                <Progress value={(timeLeft / session.timerDuration) * 100} className="w-full" />
            </div>
            
            {currentPlayerHasAnswered ? (
              <div className="text-center p-4 bg-green-100 text-green-700 rounded-md">
                <p className="font-semibold">Your answer is submitted! Waiting for others.</p>
                 {isSubmitting && <Loader2 className="w-6 h-6 animate-spin mx-auto mt-2" />}
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-semibold mb-4 text-center text-accent">Choose a Player:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {session.players
                    .map(player => (
                    <Button
                      key={player.id}
                      variant="outline"
                      size="lg"
                      className="text-lg justify-start p-4 h-auto hover:bg-primary/10 hover:border-primary transition-all duration-200"
                      onClick={() => handleSubmitAnswer(player.id)}
                      disabled={isSubmitting || timeLeft === 0}
                    >
                      <Avatar className="w-10 h-10 mr-3">
                         <AvatarImage src={`https://placehold.co/40x40/E3F2FD/9C27B0?text=${player.name.charAt(0).toUpperCase()}`} alt={player.name} data-ai-hint="letter avatar"/>
                         <AvatarFallback>{player.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {player.name}
                      {player.id === currentPlayerId && <span className="text-xs text-muted-foreground ml-2">(Vote for yourself)</span>}
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
     if (typeof window !== "undefined") { 
        router.push(`/session/${sessionId}/results`);
     }
     return ( 
        <div className="flex justify-center items-center h-full">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="ml-4 text-xl">Transitioning to results...</p>
        </div>
     );
  }

  return (
    <div className="text-center py-10">
      <h1 className="text-2xl font-bold">Loading or Unknown State</h1>
      <p className="text-muted-foreground">Please wait or try refreshing.</p>
      <Button onClick={() => router.push('/')} className="mt-4">Go Home</Button>
    </div>
  );
}
