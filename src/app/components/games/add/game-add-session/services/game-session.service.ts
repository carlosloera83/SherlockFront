import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateGameSessionAiPreviewRequest,
  CreateGameSessionAiPreviewResponse,
  ApiResponse,
  CreateGameSessionFullRequest,
  GameStatus,
  GameSummary,
} from '../models/game-session.model';

@Injectable({
  providedIn: 'root',
})
export class GameSessionService {
  private readonly gameSessionFullUrl = 'https://localhost:7143/api/GameSessions/GameSessionFull';
  private readonly gameSessionPreviewUrl = 'https://localhost:7143/api/GameSessions/PreviewGenerateWithAI';
  private readonly gamesUrl = 'https://localhost:7143/api/Games';
  private readonly gameStatusesUrl = 'https://localhost:7143/api/GameStatuses';

  constructor(private http: HttpClient) {}

  createSessionFull(payload: CreateGameSessionFullRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(this.gameSessionFullUrl, payload);
  }

  generateSessionPreview(
    payload: CreateGameSessionAiPreviewRequest
  ): Observable<ApiResponse<CreateGameSessionAiPreviewResponse>> {
    return this.http.post<ApiResponse<CreateGameSessionAiPreviewResponse>>(this.gameSessionPreviewUrl, payload);
  }

  getGames(userId: string): Observable<ApiResponse<GameSummary[]>> {
    return this.http.get<ApiResponse<GameSummary[]>>(`${this.gamesUrl}?userId=${userId}`);
  }

  getGameStatuses(): Observable<ApiResponse<GameStatus[]>> {
    return this.http.get<ApiResponse<GameStatus[]>>(this.gameStatusesUrl);
  }
}
