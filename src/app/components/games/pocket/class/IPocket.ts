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
