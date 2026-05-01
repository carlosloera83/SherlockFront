import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { STORAGE_KEYS } from 'src/app/core/constants/storage.keys';
import { ApiResponse, LoginRequest, LoginResponseData } from '../class/ILogin';
import { RegisterRequest, RegisterResponseData } from '../class/IRegister';
 
 

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly loginUrl = `${environment.apiUrl}/auth/login`;
  private readonly registerUrl = `${environment.apiUrl}/auth/register`;

  constructor(private http: HttpClient) {}

  login(payload: LoginRequest): Observable<ApiResponse<LoginResponseData>> {
    return this.http.post<ApiResponse<LoginResponseData>>(this.loginUrl, payload);
  }

  register(payload: RegisterRequest): Observable<ApiResponse<RegisterResponseData>> {
    return this.http.post<ApiResponse<RegisterResponseData>>(this.registerUrl, payload);
  }

  async saveSession(user: LoginResponseData): Promise<void> {
    await Preferences.set({
      key: STORAGE_KEYS.userSession,
      value: JSON.stringify(user),
    });
  }

  async getSession(): Promise<LoginResponseData | null> {
    const result = await Preferences.get({
      key: STORAGE_KEYS.userSession,
    });

    if (!result.value) {
      return null;
    }

    try {
      return JSON.parse(result.value) as LoginResponseData;
    } catch {
      return null;
    }
  }

  async hasSession(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }

  async clearSession(): Promise<void> {
    await Preferences.remove({
      key: STORAGE_KEYS.userSession,
    });
  }
}