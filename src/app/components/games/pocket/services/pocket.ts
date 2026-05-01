import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ApiResponsePocket,
  PocketQuestion,
  PocketQuestionOption,
  SubmitAnswerData,
  SubmitAnswerRequest,
} from '../class/IPocket';

@Injectable({
  providedIn: 'root',
})
export class PocketService {
  private readonly questionBaseUrl = `${environment.apiUrl}/GameQuestions`;
  private readonly gameSessionBaseUrl = `${environment.apiUrl}/GameSessions`;

  constructor(private http: HttpClient) {}

  getQuestions(gameSessionId: string, userId: string): Observable<ApiResponsePocket<PocketQuestion[]>> {
    return this.http.get<ApiResponsePocket<PocketQuestion[]>>(
      `${this.questionBaseUrl}/QuestionsBySession?gameSessionId=${gameSessionId}&userId=${userId}`
    );
  }

  getQuestionOptions(questionId: string): Observable<ApiResponsePocket<PocketQuestionOption[]>> {
    return this.http.get<ApiResponsePocket<PocketQuestionOption[]>>(
      `${this.questionBaseUrl}/QuestionOptionsByQuestion?questionId=${questionId}`
    );
  }

  submitAnswer(payload: SubmitAnswerRequest): Observable<ApiResponsePocket<SubmitAnswerData>> {
    return this.http.post<ApiResponsePocket<SubmitAnswerData>>(
      `${this.gameSessionBaseUrl}/SubmitAnswer`,
      payload,
    );
  }
}
