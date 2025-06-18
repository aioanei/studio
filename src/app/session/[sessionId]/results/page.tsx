
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import type { GameSession, Player } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Award, Home, RefreshCcw, Loader2, Frown } from 'lucide-react';
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
        // It's okay if status is not 'results' yet, calculations will be based on current data.
        // If game restarts, this page might show old results briefly until session updates to lobby.
        setSession(sessionData);
      } else {
        setSession(null); 
        toast({ title: "Session Expired", description: "This game session no longer exists.", variant: "destructive" });
        // Optional: redirect if session is truly gone and not just in a different state
        // router.push('/'); 
      }
    }, (error) => {
      console.error("Error fetching results:", error);
      toast({ title: "Error", description: "Could not load game results.", variant: "destructive" });
      setSession(null);
    });

    return () => unsubscribe();
  }, [sessionId, router, toast]);

  const calculatedScores = useMemo(() => {
    if (!session || !session.players || session.status !== 'results') return []; // Only calculate for results status
    
    const scores: Record<string, number> = {};
    session.players.forEach(p => scores[p.id] = 0);

    Object.values(session.allAnswers || {}).forEach(questionAnswers => {
      (questionAnswers || []).forEach(answer => {
        // Ensure chosenPlayerId is treated as string for key access
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

  const handlePlayAgain = async () => {
    if (!session) return;
    // Ensure current user is host before allowing reset.
    // This requires knowing the currentPlayerId, which isn't directly available on results page
    // without passing it or fetching player details again.
    // For simplicity, allowing anyone to "Play Again" which resets the lobby.
    // A more robust solution would verify host status.
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

  if (session === null || !session.players) { // Added !session.players for robustness
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] text-center p-4">
        <Frown className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-headline font-bold text-destructive mb-2">Results Not Found</h1>
        <p className="text-lg text-muted-foreground mb-6 max-w-md">
          The results for session ID <span className="font-bold text-primary">{sessionId}</span> could not be loaded.
          The session may have been deleted or there was an error.
        </p>
        <Button onClick={() => router.push('/')} size="lg">
          Go to Homepage
        </Button>
      </div>
    );
  }
  
  // If session status is not 'results', show a message or redirect.
  // This handles cases where user navigates directly to results URL before game ends.
  if (session.status !== 'results') {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)] text-center p-4">
        <Info className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-headline font-bold text-primary mb-2">Game In Progress or Lobby</h1>
        <p className="text-lg text-muted-foreground mb-6 max-w-md">
          The game <span className="font-bold text-accent">{sessionId}</span> is not yet finished. Results will appear here once the game ends.
        </p>
        <Button onClick={() => router.push(`/session/${sessionId}`)} size="lg" variant="outline">
          Back to Game
        </Button>
         <Button onClick={() => router.push('/')} size="lg" className="mt-2">
          Go to Homepage
        </Button>
      </div>
    );
  }
  
  const getPlayerName = (playerId: string) => session.players.find(p => p.id === playerId)?.name || 'Unknown Player';

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card className="shadow-xl animate-in fade-in duration-500">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-headline text-primary">Game Over!</CardTitle>
          <CardDescription className="text-lg">Here's how everyone voted and who ended up in The Hot Seat!</CardDescription>
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
                      <div className="text-3xl font-bold text-primary">{player.score} <span className="text-sm font-normal text-muted-foreground">votes received</span></div>
                      {index === 0 && <p className="text-sm text-yellow-600 font-semibold mt-1">👑 Hottest Seat!</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No scores to display. This might happen if the game ended prematurely.</p>
            )}
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-6 text-center text-accent">Detailed Votes</h2>
            {session.questions && session.questions.length > 0 ? (
              <ScrollArea className="h-[400px] rounded-md border p-4 bg-secondary/30">
                <div className="space-y-6">
                  {session.questions.map((question, qIndex) => (
                    <div key={question.id}>
                      <h3 className="text-xl font-medium mb-2 text-primary-dark">
                        Q{qIndex + 1}: {question.text}
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Voter</TableHead>
                            <TableHead>Chose</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(session.allAnswers[question.id] || []).map((answer, aIndex) => (
                            <TableRow key={`${question.id}-${answer.playerId}-${aIndex}`}>
                              <TableCell className="font-medium">{getPlayerName(answer.playerId)}</TableCell>
                              <TableCell>{getPlayerName(answer.chosenPlayerId as string)}</TableCell>
                            </TableRow>
                          ))}
                          {(session.allAnswers[question.id] || []).length === 0 && (
                              <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No answers recorded for this question.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
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
            <RefreshCcw className="mr-2 h-5 w-5" /> Play Again (Reset Lobby)
          </Button>
          <Button onClick={() => router.push('/')} size="lg" className="bg-primary hover:bg-primary/90">
            <Home className="mr-2 h-5 w-5" /> New Game
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
