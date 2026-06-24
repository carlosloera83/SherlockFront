import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ApiResponseRewards,
  ClaimPendingRewardRequest,
  GenericResponseDto,
  PendingRewardDto,
} from '../class/IRewards';

@Injectable({
  providedIn: 'root',
})
export class RewardsService {
  private readonly rewardsBaseUrl = `${environment.apiUrl}/rewards`;

  constructor(private http: HttpClient) {}

  getPendingRewardsByUser(userId: string): Observable<ApiResponseRewards<PendingRewardDto[]>> {
    const lowerCaseUrl = `${this.rewardsBaseUrl}/pending/${userId}`;
    const pascalCaseUrl = `${environment.apiUrl}/Rewards/pending/${userId}`;

    return this.http.get<ApiResponseRewards<PendingRewardDto[]>>(lowerCaseUrl).pipe(
      catchError(() => this.http.get<ApiResponseRewards<PendingRewardDto[]>>(pascalCaseUrl))
    );
  }

  claimPendingReward(request: ClaimPendingRewardRequest): Observable<ApiResponseRewards<GenericResponseDto>> {
    const lowerCaseUrl = `${this.rewardsBaseUrl}/claim`;
    const pascalCaseUrl = `${environment.apiUrl}/Rewards/claim`;

    return this.http.post<ApiResponseRewards<GenericResponseDto>>(lowerCaseUrl, request).pipe(
      catchError(() => this.http.post<ApiResponseRewards<GenericResponseDto>>(pascalCaseUrl, request))
    );
  }
}
