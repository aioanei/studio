'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { GameSession, Player, Question, PlayerAnswer } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Award, Home, RefreshCcw } from 'lucide-react';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<GameSession | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const storageKey = `hotseat-session-${sessionId}`;
    const storedSession = localStorage.getItem(storageKey);
    if (storedSession) {
      const parsedSession: GameSession = JSON.parse(storedSession);
      // Ensure status is 'results' if accessing this page directly
      if (parsedSession.status !== 'results') {
        parsedSession.status = 'results';
        localStorage.setItem(storageKey, JSON.stringify(parsedSession));
      }
      setSession(parsedSession);
    } else {
      // If no session found, redirect to home or show error
      router.push('/');
    }
  }, [sessionId, router]);

  const calculatedScores = useMemo(() => {
    if (!session) return [];
    
    const scores: Record<string, number> = {};
    session.players.forEach(p => scores[p.id] = 0);

    Object.values(session.allAnswers).forEach(questionAnswers => {
      questionAnswers.forEach(answer => {
        if (scores[answer.chosenPlayerId] !== undefined) {
          scores[answer.chosenPlayerId]++;
        }
      });
    });
    
    return session.players
      .map(player => ({ ...player, score: scores[player.id] }))
      .sort((a, b) => b.score - a.score);

  }, [session]);

  if (!session) {
    return <div className="text-center py-10">Loading results...</div>;
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
          
          {/* Rankings Section */}
          <section>
            <h2 className="text-3xl font-semibold mb-6 text-center text-accent flex items-center justify-center gap-2">
              <Award className="w-8 h-8" /> Final Scores
            </h2>
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
          </section>

          {/* Detailed Answers Section */}
          <section>
            <h2 className="text-3xl font-semibold mb-6 text-center text-accent">Detailed Votes</h2>
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
                            <TableCell>{getPlayerName(answer.chosenPlayerId)}</TableCell>
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
          </section>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
          <Button onClick={() => router.push(`/session/${sessionId}`)} variant="outline" size="lg" className="text-accent border-accent hover:bg-accent/10">
            <RefreshCcw className="mr-2 h-5 w-5" /> Play Again (Same Lobby)
          </Button>
          <Button onClick={() => router.push('/')} size="lg" className="bg-primary hover:bg-primary/90">
            <Home className="mr-2 h-5 w-5" /> New Game
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
