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
  hasUserFinishedGame: boolean;
  canUserEnterGame: boolean;
  winnerUserId: string | null;
  winnerScorePoints: number | null;
  firstPlace : string | null;
}

export interface ApiResponseGames<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

export interface JoinGameSessionRequest {
  gameSessionId: string;
  userId: string;
}

export interface JoinGameSessionData {
  result: string;
  mensaje: string;
  currentPlayers?: number;
  availableSpots?: number;
}

export interface GameSessionLobbyPlayer {
  result: string;
  mensaje: string;
  userId: string;
  nickName: string;
  avatarInitial: string;
  scorePoints: number;
  correctAnswers: number;
  wrongAnswers: number;
  isFinished: boolean;
  playerStatus: string;
  joinedAt: string;
}

export type JoinGameSessionMessage =
  | 'USER_JOINED_LOBBY_SUCCESS'
  | 'USER_JOINED_LOBBY_AND_COUNTDOWN_STARTED'
  | 'USER_JOINED_GAME_SESSION'
  | 'USER_REJOINED_GAME_SESSION'
  | 'USER_ALREADY_FINISHED_GAME'
  | 'GAME_SESSION_FULL'
  | 'GAME_SESSION_FINISHED_OR_CANCELLED';