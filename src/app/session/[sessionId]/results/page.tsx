
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import type { GameSession, Player, QuestionCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, Home, RefreshCcw, Loader2, Frown, Info, Medal, Trophy, Bomb, Heart, Brain, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

// A new component for displaying the awards
function GameAwards({ session, calculatedScores }: { session: GameSession, calculatedScores: Player[] }) {
    const awards = useMemo(() => {
        const categoryVotes: Record<QuestionCategory, Record<string, number>> = {
            'Life': {},
            'Wacky': {},
            'Love': {},
            'Daring': {},
        };

        session.questions.forEach(q => {
            const answers = session.allAnswers[q.id] || [];
            answers.forEach(ans => {
                if (!categoryVotes[q.category]) categoryVotes[q.category] = {};
                categoryVotes[q.category][ans.chosenPlayerId] = (categoryVotes[q.category][ans.chosenPlayerId] || 0) + 1;
            });
        });

        const findWinner = (votes: Record<string, number>): Player | null => {
            let winnerId: string | null = null;
            let maxVotes = 0;
            for (const playerId in votes) {
                if (votes[playerId] > maxVotes) {
                    maxVotes = votes[playerId];
                    winnerId = playerId;
                }
            }
            return session.players.find(p => p.id === winnerId) || null;
        };

        const awardsData = [
            { title: 'Life of the Party', category: 'Life' as QuestionCategory, Icon: Gift },
            { title: 'Most Wacky', category: 'Wacky' as QuestionCategory, Icon: Bomb },
            { title: 'Biggest Flirt', category: 'Love' as QuestionCategory, Icon: Heart },
            { title: 'Most Daring', category: 'Daring' as QuestionCategory, Icon: Trophy },
        ].map(award => ({
            ...award,
            winner: findWinner(categoryVotes[award.category]),
        })).filter(award => award.winner);

        // Runner up award
        if (calculatedScores.length > 1) {
            awardsData.push({
                title: 'Just Missed It!',
                winner: calculatedScores[1],
                Icon: Medal,
            });
        }
        
        return awardsData;
    }, [session, calculatedScores]);

    const containerVariants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: 0.8,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
    };

    return (
        <section>
            <h2 className="text-3xl font-semibold mb-6 text-center text-accent flex items-center justify-center gap-2">
                <Award className="w-8 h-8" /> Special Awards
            </h2>
             <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {awards.map((award, index) => (
                    <motion.div key={index} variants={itemVariants}>
                        <Card className="bg-secondary/30 h-full">
                            <CardContent className="p-6 text-center flex flex-col items-center justify-center">
                                <award.Icon className="w-12 h-12 text-accent mb-3" />
                                <p className="text-xl font-bold text-accent mb-2">{award.title}</p>
                                {award.winner ? (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={`https://placehold.co/40x40/E3F2FD/4285F4?text=${award.winner.name.charAt(0).toUpperCase()}`} alt={award.winner.name} data-ai-hint="letter avatar" />
                                            <AvatarFallback>{award.winner.name.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <p className="text-2xl font-bold text-primary">{award.winner.name}</p>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">No winner</p>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    );
}

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
              <Trophy className="w-8 h-8" /> Final Scores
            </h2>
            {calculatedScores.length > 0 ? (
              <div className="space-y-4">
                {calculatedScores.map((player, index) => (
                  <Card key={player.id} className={`shadow-md ${index === 0 ? 'border-2 border-yellow-400 bg-yellow-50' : 'bg-background'}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className={`text-2xl font-bold w-8 text-center ${index === 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}>{index + 1}</span>
                        <Avatar className="w-12 h-12">
                            <AvatarImage src={`https://placehold.co/48x48/${index === 0 ? 'FFD700/000000' : 'E3F2FD/4285F4'}?text=${player.name.charAt(0).toUpperCase()}`} alt={player.name} data-ai-hint="letter avatar"/>
                            <AvatarFallback>{player.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="text-xl font-medium">{player.name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{player.score}</div>
                        <div className="text-sm text-muted-foreground">votes</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No scores to display.</p>
            )}
          </section>

          <GameAwards session={session} calculatedScores={calculatedScores} />

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
