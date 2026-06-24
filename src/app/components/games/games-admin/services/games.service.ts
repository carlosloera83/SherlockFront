import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, CreateGameRequest, CreateGameResponse, Game } from '../models/games.model';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GamesService {
  private readonly apiUrl = `${environment.apiUrl}/Games`;

  constructor(private http: HttpClient) {}

  createGame(gameData: CreateGameRequest): Observable<CreateGameResponse> {
    return this.http.post<CreateGameResponse>(this.apiUrl, gameData);
  }

  getGames(userId: string): Observable<ApiResponse<Game[]>> {
    return this.http.get<ApiResponse<Game[]>>(`${this.apiUrl}?userId=${userId}`);
  }
}
