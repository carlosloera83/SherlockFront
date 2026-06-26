import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../../auth/services/auth';
import { ApiResponse } from '../../auth/class/ILogin';

interface OnlineCountData {
  onlineCount: number;
}

@Injectable({ providedIn: 'root' })
export class PresenceService {
  private readonly hubUrl = `${environment.apiUrl.replace(/\/api\/?$/, '')}/hubs/Presence`;
  private readonly fallbackUrl = `${environment.apiUrl}/presence/online-count`;
  private connection: HubConnection | null = null;

  readonly onlineCount = signal<number>(0);

  constructor(
    private authService: AuthService,
    private http: HttpClient,
  ) {}

  async connect(): Promise<void> {
    if (this.connection) return;

    this.connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: async () => {
          const session = await this.authService.getSession();
          const token = session?.token ?? '';
          console.log('[Presence] token length:', token.length);
          return token;
        },
      })
      .withAutomaticReconnect()
      .build();

    this.connection.onreconnecting(() => void this.loadFallback());
    this.connection.onreconnected(() => void this.loadFallback());

    this.connection.on('onlinePlayersUpdated', (count: number) => {
      this.onlineCount.set(count);
    });

    try {
      await this.connection.start();
      await this.loadFallback();
    } catch {
      await this.loadFallback();
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return;
    this.connection.off('onlinePlayersUpdated');
    if (this.connection.state !== HubConnectionState.Disconnected) {
      await this.connection.stop();
    }
    this.connection = null;
  }

  private async loadFallback(): Promise<void> {
    try {
      const session = await this.authService.getSession();
      const token = session?.token ?? '';
      const headers = token
        ? new HttpHeaders({ Authorization: `Bearer ${token}` })
        : new HttpHeaders();

      const res = await firstValueFrom(
        this.http.get<ApiResponse<OnlineCountData>>(this.fallbackUrl, { headers }),
      );
      if (res.success) {
        this.onlineCount.set(res.data.onlineCount);
      }
    } catch {
      // silent fail — count stays at current value
    }
  }
}
