import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UserProfile, ApiResponse } from '../interfaces/profile.interface';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly profileUrl = `${environment.apiUrl}/Users/profile`;

  constructor(private http: HttpClient) {}

  getUserProfile(userId: string): Observable<ApiResponse<UserProfile>> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.profileUrl}/${userId}`);
  }
}
