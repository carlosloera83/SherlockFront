import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ActiveGameSession, ApiResponseGames } from '../class/IGames';

@Injectable({
  providedIn: 'root',
})
export class GamesService {
  private readonly baseUrl = `${environment.apiUrl}/Games`;

  constructor(private http: HttpClient) {}

  getActiveGameSessions(userId: string): Observable<ApiResponseGames<ActiveGameSession[]>> {
    return this.http.get<ApiResponseGames<ActiveGameSession[]>>(
      `${this.baseUrl}/ActiveGameSession?userId=${userId}`
    );
  }
}