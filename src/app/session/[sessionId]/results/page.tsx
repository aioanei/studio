
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import type { GameSession, Player } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Award, Home, RefreshCcw, Loader2, Frown, Info, ThumbsUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<GameSession | null | undefined>(undefined); 

  useEffect(() => {
    if (!sessionId) {
      router.push('/'); 
      return;
    }
    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const sessionData = docSnap.data() as GameSession;
        setSession(sessionData);
      } else {
        setSession(null); 
        toast({ title: "Session Expired", description: "This game session no longer exists.", variant: "destructive" });
      }
    }, (error) => {
      console.error("Error fetching results:", error);
      toast({ title: "Error", description: "Could not load game results.", variant: "destructive" });
      setSession(null);
    });

    return () => unsubscribe();
  }, [sessionId, router, toast]);

  const calculatedScores = useMemo(() => {
    if (!session || !session.players || session.status !== 'results') return [];
    
    const scores: Record<string, number> = {};
    session.players.forEach(p => scores[p.id] = 0);

    Object.values(session.allAnswers || {}).forEach(questionAnswers => {
      (questionAnswers || []).forEach(answer => {
        const chosenId = answer.chosenPlayerId as string;
        if (scores[chosenId] !== undefined) {
          scores[chosenId]++;
        }
      });
    });
    
    return session.players
      .map(player => ({ ...player, score: scores[player.id] || 0 }))
      .sort((a, b) => b.score - a.score);
  }, [session]);
  
  const roundWinners = useMemo(() => {
    if (!session || !session.questions || session.status !== 'results') return [];

    return session.questions.map(question => {
        const answers = session.allAnswers[question.id] || [];
        if (answers.length === 0) {
            return { question, winners: [] };
        }

        const votes: Record<string, number> = {};
        answers.forEach(ans => {
            votes[ans.chosenPlayerId] = (votes[ans.chosenPlayerId] || 0) + 1;
        });

        const maxVotes = Math.max(...Object.values(votes));
        const winnerIds = Object.keys(votes).filter(id => votes[id] === maxVotes);
        const winners = session.players.filter(p => winnerIds.includes(p.id));

        return { question, winners };
    });
  }, [session]);

  const handlePlayAgain = async () => {
    if (!session) return;
    const sessionRef = doc(db, 'sessions', sessionId);
    try {
      await updateDoc(sessionRef, {
        status: 'lobby',
        questions: [],
        allAnswers: {},
        currentQuestionIndex: 0,
        players: session.players.map(p => ({ ...p, score: 0 })), 
      });
      router.push(`/session/${sessionId}`);
    } catch (error) {
      console.error("Error restarting game:", error);
      toast({ title: "Error", description: "Could not restart the game.", variant: "destructive" });
    }
  };

  if (session === undefined) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 text-xl mt-4">Loading results...</p>
      </div>
    );
  }

  if (session === null || !session.players) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] text-center p-4">
        <Frown className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-headline font-bold text-destructive mb-2">Results Not Found</h1>
        <p className="text-lg text-muted-foreground mb-6 max-w-md">
          The results for session ID <span className="font-bold text-primary">{sessionId}</span> could not be loaded.
        </p>
        <Button onClick={() => router.push('/')} size="lg">
          Go to Homepage
        </Button>
      </div>
    );
  }
  
  if (session.status !== 'results') {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] text-center p-4">
        <Info className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-headline font-bold text-primary mb-2">Game In Progress</h1>
        <p className="text-lg text-muted-foreground mb-6 max-w-md">
          The game <span className="font-bold text-accent">{sessionId}</span> is not finished yet. Results will appear here once the game ends.
        </p>
        <Button onClick={() => router.push(`/session/${sessionId}`)} size="lg" variant="outline">
          Back to Game
        </Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card className="shadow-xl animate-in fade-in duration-500">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-headline text-primary">Game Over!</CardTitle>
          <CardDescription className="text-lg">Here are the final results!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <section>
            <h2 className="text-3xl font-semibold mb-6 text-center text-accent flex items-center justify-center gap-2">
              <Award className="w-8 h-8" /> Final Scores
            </h2>
            {calculatedScores.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {calculatedScores.map((player, index) => (
                  <Card key={player.id} className={`shadow-md ${index === 0 ? 'border-2 border-yellow-400 bg-yellow-50' : 'bg-background'}`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                       <CardTitle className="text-xl font-medium">{player.name}</CardTitle>
                       <Avatar className="w-10 h-10">
                          <AvatarImage src={`https://placehold.co/40x40/${index === 0 ? 'FFD700/000000' : 'E3F2FD/4285F4'}?text=${player.name.charAt(0).toUpperCase()}`} alt={player.name} data-ai-hint="letter avatar"/>
                          <AvatarFallback>{player.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">{player.score} <span className="text-sm font-normal text-muted-foreground">times in the hot seat</span></div>
                      {index === 0 && <p className="text-sm text-yellow-600 font-semibold mt-1">👑 Hottest Seat!</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No scores to display.</p>
            )}
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-6 text-center text-accent">Round Summary</h2>
            {roundWinners.length > 0 ? (
              <ScrollArea className="h-[400px] rounded-md border p-4 bg-secondary/30">
                <div className="space-y-4">
                  {roundWinners.map(({ question, winners }, qIndex) => (
                    <Card key={question.id} className="bg-background/80">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Q{qIndex + 1}: <span className="font-normal">{question.text}</span></CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3">
                                <ThumbsUp className="w-6 h-6 text-primary" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Most Likely To Be...</p>
                                    {winners.length > 0 ? (
                                        <p className="font-bold text-lg text-primary">{winners.map(w => w.name).join(', ')}</p>
                                    ) : (
                                        <p className="text-muted-foreground italic">No votes were cast.</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center">No questions were played in this session.</p>
            )}
          </section>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
          <Button onClick={handlePlayAgain} variant="outline" size="lg" className="text-accent border-accent hover:bg-accent/10">
            <RefreshCcw className="mr-2 h-5 w-5" /> Play Again
          </Button>
          <Button onClick={() => router.push('/')} size="lg" className="bg-primary hover:bg-primary/90">
            <Home className="mr-2 h-5 w-5" /> New Game
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
