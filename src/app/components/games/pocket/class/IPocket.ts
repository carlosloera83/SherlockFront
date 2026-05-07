export interface PocketQuestion {
  gameQuestionMappingId: string;
  gameSessionId: string;
  gameQuestionId: string;
  questionOrder: number;
  points: number;
  isRequired: boolean;
  questionText: string;
  explanation: string;
  difficultyLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PocketQuestionOption {
  id: string;
  gameQuestionId: string;
  optionText: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponsePocket<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

export interface SubmitAnswerRequest {
  gameSessionId: string;
  userId: string;
  gameQuestionId: string;
  selectedOptions: string[];
}

export interface SubmitAnswerData {
  result: string;
  mensaje: string;
  isCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
  isGameFinished: boolean;
  nextQuestionId: string | null;
}

export interface RankingEntry {
  gameSessionId: string;
  userId: string;
  position: number;
  playerName: string;
  avatarInitial: string;
  scorePoints: number;
  correctAnswers: number;
  wrongAnswers: number;
  isFinished: boolean;
  finishedAt: string | null;
  isCurrentUser: boolean;
}
