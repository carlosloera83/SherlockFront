export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseData {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  nickName: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
}
