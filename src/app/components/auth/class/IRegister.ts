export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  nickName: string;
}

export interface RegisterResponseData {
  result: string;
  mensaje: string;
}