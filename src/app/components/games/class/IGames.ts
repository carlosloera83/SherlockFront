export interface ActiveGameSession {
  gameSessionId: string;
  gameId: string;
  gameName: string;
  description: string;
  gameTypeCode: string;
  gameTypeName: string;
  entryCostPoints: number;
  durationMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  rewardPercentage: number;
  gameStatusCode: string;
  gameStatusName: string;
  sessionDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  totalPotPoints: number;
  currentPlayers: number;
  availableSpots: number;
  canStart: boolean;
  userId: string;
  isUserInGame: boolean;
}

export interface ApiResponseGames<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}