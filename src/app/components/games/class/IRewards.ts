export interface PendingRewardDto {
  pendingRewardId: string;
  gameSessionId: string;
  gameSessionName: string;
  pointsEarned: number;
  gemsEarned: number;
  isWinner: boolean;
  rewardStatus: string;
  createdAt: string;
}

export interface ClaimPendingRewardRequest {
  pendingRewardId: string;
  userId: string;
}

export interface GenericResponseDto {
  result: string | null;
  mensaje: string;
}

export interface ApiResponseRewards<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
}
