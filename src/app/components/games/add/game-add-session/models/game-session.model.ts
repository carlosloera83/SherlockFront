export interface CreateGameSessionFullRequest {
  gameId: string;
  gameStatusId: string;
  name: string;
  description: string;
  sessionDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  costGems: number;
  totalGems: number;
  questions: CreateGameSessionFullQuestionRequest[];
  options: CreateGameSessionFullOptionRequest[];
}

export interface CreateGameSessionAiPreviewRequest {
  prompt: string;
  numberOfQuestions: number;
  pointsPerQuestion: number;
}

export interface CreateGameSessionAiPreviewFromUrlRequest {
  url: string;
  numberOfQuestions: number;
  pointsPerQuestion: number;
}

export type QuestionGenerationMode = 'prompt' | 'pdf' | 'url';

export interface AiSessionPreviewOption {
  optionText: string;
  isCorrect: boolean;
}

export interface AiSessionPreviewQuestion {
  questionText: string;
  explanation: string;
  platformUrl?: string | null;
  difficultyLevel: number;
  points: number;
  options: AiSessionPreviewOption[];
}

export interface CreateGameSessionAiPreviewResponse {
  questions: AiSessionPreviewQuestion[];
}

export interface GameStatusCatalogOption {
  code: string;
  name: string;
  value: string;
}

export interface GameStatus {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameSessionFullQuestionRequest {
  tempQuestionId: number;
  questionText: string;
  explanation: string;
  platformUrl?: string | null;
  difficultyLevel: number;
  questionOrder: number;
  points: number;
  isRequired: boolean;
}

export interface CreateGameSessionFullOptionRequest {
  tempQuestionId: number;
  optionText: string;
  isCorrect: boolean;
  displayOrder: number;
}

export interface GameSummary {
  id: string;
  name: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}
