
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { QuestionDifficulty } from '@/types';
import { nanoid } from 'nanoid';
import { PartyPopper, LogIn, Settings2 } from 'lucide-react';

export default function HomePage() {
  const [joinSessionId, setJoinSessionId] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty>('family-friendly');
  const router = useRouter();

  const handleCreateSession = () => {
    const newSessionId = nanoid(6).toUpperCase();
    // Pass difficulty as a query parameter
    router.push(`/session/${newSessionId}?difficulty=${selectedDifficulty}&new=true`);
  };

  const handleJoinSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinSessionId.trim()) {
      router.push(`/session/${joinSessionId.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-headline font-bold text-primary mb-4">
          Welcome to The Hot Seat!
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Gather your friends, answer revealing questions, and find out who's really in the hot seat.
          Create a new game or join an existing one to start the fun!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="text-3xl font-headline flex items-center gap-2">
              <PartyPopper className="w-8 h-8 text-primary" />
              Create New Game
            </CardTitle>
            <CardDescription>
              Start a new game session and invite your friends. Choose your question style below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="difficulty-select" className="text-lg font-medium flex items-center gap-1 mb-2">
                <Settings2 className="w-5 h-5 text-muted-foreground" />
                Question Difficulty
              </Label>
              <Select value={selectedDifficulty} onValueChange={(value) => setSelectedDifficulty(value as QuestionDifficulty)}>
                <SelectTrigger id="difficulty-select" className="w-full text-lg py-6">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family-friendly" className="text-lg">😊 Family Friendly</SelectItem>
                  <SelectItem value="getting-personal" className="text-lg">🤔 Getting Personal</SelectItem>
                  <SelectItem value="hot-seat-exclusive" className="text-lg">🌶️ Hot Seat Exclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedDifficulty === 'family-friendly' && 'Fun and light-hearted questions suitable for everyone.'}
              {selectedDifficulty === 'getting-personal' && 'A bit more revealing, great for close friends.'}
              {selectedDifficulty === 'hot-seat-exclusive' && 'Daring and potentially NSFW questions for the bold!'}
            </p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleCreateSession}
              className="w-full text-lg py-6 bg-primary hover:bg-primary/90"
              aria-label="Create a new game session"
            >
              Create Session
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="text-3xl font-headline flex items-center gap-2">
              <LogIn className="w-8 h-8 text-accent" />
              Join Existing Game
            </CardTitle>
            <CardDescription>
              Enter the game ID shared by your friend to join their session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinSession} className="space-y-4">
              <Input
                type="text"
                value={joinSessionId}
                onChange={(e) => setJoinSessionId(e.target.value.toUpperCase())}
                placeholder="Enter Game ID (e.g., ABC123)"
                className="text-lg py-6"
                aria-label="Game ID to join"
                maxLength={6}
              />
              <Button type="submit" className="w-full text-lg py-6 bg-accent hover:bg-accent/90" disabled={!joinSessionId.trim()}>
                Join Session
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
