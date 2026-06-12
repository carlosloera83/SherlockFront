import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateGameSessionAiPreviewRequest,
  CreateGameSessionAiPreviewFromUrlRequest,
  CreateGameSessionAiPreviewResponse,
  ApiResponse,
  CreateGameSessionFullRequest,
  GameStatus,
  GameSummary,
} from '../models/game-session.model';
import { environment } from '../../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GameSessionService {
  private readonly gameSessionFullUrl = `${environment.apiUrl}/GameSessions/GameSessionFull`;
  private readonly gameSessionPreviewUrl = `${environment.apiUrl}/GameSessions/PreviewGenerateWithAI`;
  private readonly gamesUrl = `${environment.apiUrl}/Games`;
  private readonly gameStatusesUrl = `${environment.apiUrl}/GameStatuses`;

  constructor(private http: HttpClient) {}

  createSessionFull(payload: CreateGameSessionFullRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(this.gameSessionFullUrl, payload);
  }

  generateSessionPreview(
    payload: CreateGameSessionAiPreviewRequest
  ): Observable<ApiResponse<CreateGameSessionAiPreviewResponse>> {
    return this.http.post<ApiResponse<CreateGameSessionAiPreviewResponse>>(this.gameSessionPreviewUrl, payload);
  }

  generateSessionPreviewFromPdf(
    pdfFile: File,
    numberOfQuestions: number,
    pointsPerQuestion: number
  ): Observable<ApiResponse<CreateGameSessionAiPreviewResponse>> {
    const formData = new FormData();
    formData.append('PdfFile', pdfFile, pdfFile.name);
    formData.append('NumberOfQuestions', String(numberOfQuestions));
    formData.append('PointsPerQuestion', String(pointsPerQuestion));

    return this.http.post<ApiResponse<CreateGameSessionAiPreviewResponse>>(
      `${this.gameSessionPreviewUrl}/FromPDF`,
      formData
    );
  }

  generateSessionPreviewFromUrl(
    payload: CreateGameSessionAiPreviewFromUrlRequest
  ): Observable<ApiResponse<CreateGameSessionAiPreviewResponse>> {
    return this.http.post<ApiResponse<CreateGameSessionAiPreviewResponse>>(
      `${this.gameSessionPreviewUrl}/FromURL`,
      payload
    );
  }

  getGames(userId: string): Observable<ApiResponse<GameSummary[]>> {
    return this.http.get<ApiResponse<GameSummary[]>>(`${this.gamesUrl}?userId=${userId}`);
  }

  getGameStatuses(): Observable<ApiResponse<GameStatus[]>> {
    return this.http.get<ApiResponse<GameStatus[]>>(this.gameStatusesUrl);
  }
}
