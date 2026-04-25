export interface Game {
  id: string;
  name: string;
  description: string;
  gameTypeId: string;
  entryCostPoints: number;
  durationMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  rewardPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameRequest {
  name: string;
  description: string;
  gameTypeId: string;
  entryCostPoints: number;
  durationMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  rewardPercentage: number;
  isActive: boolean;
}

export interface CreateGameResponse {
  success: boolean;
  message: string;
  data: string; // UUID of created game
  errors: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
}
