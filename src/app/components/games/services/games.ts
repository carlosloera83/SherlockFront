import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ActiveGameSession,
  ApiResponseGames,
  JoinGameSessionData,
} from '../class/IGames';

@Injectable({
  providedIn: 'root',
})
export class GamesService {
  private readonly gameSessionsUrl = `${environment.apiUrl}/GameSessions`;

  constructor(private http: HttpClient) {}

  getGameSessionsLiveStatus(userId: string): Observable<ApiResponseGames<ActiveGameSession[]>> {
    const liveStatusKebabUrl = `${this.gameSessionsUrl}/live-status?userId=${userId}`;
    const liveStatusPascalUrl = `${this.gameSessionsUrl}/LiveStatus?userId=${userId}`;

    return this.http.get<ApiResponseGames<ActiveGameSession[]>>(liveStatusKebabUrl).pipe(
      catchError(() => this.http.get<ApiResponseGames<ActiveGameSession[]>>(liveStatusPascalUrl))
    );
  }

  joinGameSession(gameSessionId: string, userId: string): Observable<ApiResponseGames<JoinGameSessionData>> {
    return this.http.post<ApiResponseGames<JoinGameSessionData>>(
      `${this.gameSessionsUrl}/join`,
      {
        gameSessionId,
        userId,
      }
    );
  }
}