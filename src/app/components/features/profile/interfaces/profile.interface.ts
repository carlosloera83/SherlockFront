export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  avatarId: string;
  pathAvatar: string;
  createdAt: string;
  isActive: boolean;
  points?: number;
  gems?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}
