export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string | null;
  nickName: string;
}

export interface RegisterResponseData {
  result: string;
  mensaje: string;
}