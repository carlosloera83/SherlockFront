import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponsePocket, PocketQuestion, PocketQuestionOption } from '../class/IPocket';

@Injectable({
  providedIn: 'root',
})
export class PocketService {
  private readonly baseUrl = `${environment.apiUrl}/Games`;

  constructor(private http: HttpClient) {}

  getQuestions(gameSessionId: string): Observable<ApiResponsePocket<PocketQuestion[]>> {
    return this.http.get<ApiResponsePocket<PocketQuestion[]>>(
      `${this.baseUrl}/Questions?gameSessionId=${gameSessionId}`
    );
  }

  getQuestionOptions(questionId: string): Observable<ApiResponsePocket<PocketQuestionOption[]>> {
    return this.http.get<ApiResponsePocket<PocketQuestionOption[]>>(
      `${this.baseUrl}/QuestionOptions?questionId=${questionId}`
    );
  }
}
