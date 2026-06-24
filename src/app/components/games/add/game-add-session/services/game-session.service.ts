import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import {
  CreateGameSessionAiPreviewRequest,
  CreateGameSessionAiPreviewFromUrlRequest,
  CreateGameSessionAiPreviewResponse,
  ApiResponse,
  Category,
  CreateGameSessionFullRequest,
  GameStatus,
  GameSummary,
} from '../models/game-session.model';
import { environment } from '../../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GameSessionService {
  // La generación con IA puede hacer hasta 5 llamadas a DeepSeek (hasta 100 preguntas),
  // por lo que la espera puede ser de varios minutos.
  private static readonly AI_GENERATION_TIMEOUT_MS = 10 * 60 * 1000;

  private readonly gameSessionFullUrl = `${environment.apiUrl}/GameSessions/GameSessionFull`;
  private readonly gameSessionPreviewUrl = `${environment.apiUrl}/GameSessions/PreviewGenerateWithAI`;
  private readonly gamesUrl = `${environment.apiUrl}/Games`;
  private readonly gameStatusesUrl = `${environment.apiUrl}/GameStatuses`;
  private readonly categoriesUrl = `${environment.apiUrl}/Categories`;

  constructor(private http: HttpClient) {}

  createSessionFull(payload: CreateGameSessionFullRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(this.gameSessionFullUrl, payload);
  }

  generateSessionPreview(
    payload: CreateGameSessionAiPreviewRequest
  ): Observable<ApiResponse<CreateGameSessionAiPreviewResponse>> {
    return this.http
      .post<ApiResponse<CreateGameSessionAiPreviewResponse>>(this.gameSessionPreviewUrl, payload)
      .pipe(timeout(GameSessionService.AI_GENERATION_TIMEOUT_MS));
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

    return this.http
      .post<ApiResponse<CreateGameSessionAiPreviewResponse>>(`${this.gameSessionPreviewUrl}/FromPDF`, formData)
      .pipe(timeout(GameSessionService.AI_GENERATION_TIMEOUT_MS));
  }

  generateSessionPreviewFromUrl(
    payload: CreateGameSessionAiPreviewFromUrlRequest
  ): Observable<ApiResponse<CreateGameSessionAiPreviewResponse>> {
    return this.http
      .post<ApiResponse<CreateGameSessionAiPreviewResponse>>(`${this.gameSessionPreviewUrl}/FromURL`, payload)
      .pipe(timeout(GameSessionService.AI_GENERATION_TIMEOUT_MS));
  }

  getGames(userId: string): Observable<ApiResponse<GameSummary[]>> {
    return this.http.get<ApiResponse<GameSummary[]>>(`${this.gamesUrl}?userId=${userId}`);
  }

  getGameStatuses(): Observable<ApiResponse<GameStatus[]>> {
    return this.http.get<ApiResponse<GameStatus[]>>(this.gameStatusesUrl);
  }

  getCategories(): Observable<ApiResponse<Category[]>> {
    return this.http.get<ApiResponse<Category[]>>(this.categoriesUrl);
  }
}
