

export type QuestionCategory = 'Life' | 'Wacky' | 'Love' | 'Daring';

export interface Player {
  id: string;
  name: string;
  score: number; // How many times this player was chosen
}

export interface Question {
  id:string;
  text: string;
  category: QuestionCategory;
}

export interface PlayerAnswer {
  playerId: string; // ID of the player who is answering
  chosenPlayerId: string; // ID of the player chosen as the answer
}

export interface GameQuestionAnswers {
  questionId: string;
  answers: PlayerAnswer[]; // Array of answers from all players for this question
}

export type GameStatus = 'lobby' | 'playing' | 'round_results' | 'results';

export type QuestionDifficulty = 'family-friendly' | 'getting-personal' | 'hot-seat-exclusive';

export interface GameSession {
  id: string;
  players: Player[];
  questions: Question[];
  /**
   * Stores answers for each question.
   * Key is questionId, value is an array of PlayerAnswer.
   */
  allAnswers: Record<string, PlayerAnswer[]>;
  currentQuestionIndex: number;
  status: GameStatus;
  hostId?: string; // ID of the player who can start the game (optional for simpler client-side)
  difficulty: QuestionDifficulty;
  numRounds: number;
  timerDuration: number; // Duration of the timer in seconds for each round
}
