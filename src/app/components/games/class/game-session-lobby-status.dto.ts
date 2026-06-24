export interface GameSessionLobbyStatusDto {
  result: string;
  mensaje: string;
  gameSessionId: string;
  gameName: string;
  description: string | null;
  gameStatusCode: string;
  gameStatusName: string;
  minPlayers: number;
  maxPlayers: number;
  currentPlayers: number;
  pendingPlayersToStart: number;
  availableSpots: number;
  isJoinLocked: boolean;
  livePhase: string | null;
  countdownStartedAt: Date | null;
  countdownEndsAt: Date | null;
  canStart: boolean;
  isUserInLobby: boolean;
}
