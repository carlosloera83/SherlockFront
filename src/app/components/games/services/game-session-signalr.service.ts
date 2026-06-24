import { Injectable } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { GameSessionLobbyStatusDto } from '../class/game-session-lobby-status.dto';
import { environment } from 'src/environments/environment';

type LobbyStatusPayload = Omit<
  GameSessionLobbyStatusDto,
  'countdownStartedAt' | 'countdownEndsAt'
> & {
  countdownStartedAt: string | Date | null;
  countdownEndsAt: string | Date | null;
};

@Injectable({
  providedIn: 'root',
})
export class GameSessionSignalrService {
  private readonly hubUrl = `${environment.apiUrl.replace(/\/api\/?$/, '')}/hubs/gamesessions`;
  private readonly lobbyStatusUpdateSubject = new Subject<GameSessionLobbyStatusDto>();
  private readonly gameSessionsUpdatedSubject = new Subject<void>();
  private connection: HubConnection | null = null;

  readonly lobbyStatusUpdate$: Observable<GameSessionLobbyStatusDto> =
    this.lobbyStatusUpdateSubject.asObservable();
  readonly gameSessionsUpdated$: Observable<void> = this.gameSessionsUpdatedSubject.asObservable();

  async start(): Promise<void> {
    const connection = this.ensureConnection();

    if (connection.state === HubConnectionState.Disconnected) {
      await connection.start();
    }
  }

  async stop(): Promise<void> {
    if (!this.connection) {
      return;
    }

    this.connection.off('LobbyStatusUpdate');
    this.connection.off('GameSessionsUpdated');

    if (this.connection.state !== HubConnectionState.Disconnected) {
      await this.connection.stop();
    }

    this.connection = null;
  }

  async joinLobby(gameSessionId: string, userId: string): Promise<void> {
    await this.start();
    await this.connection?.invoke('JoinLobbyGroup', gameSessionId, userId);
  }

  async leaveLobby(gameSessionId: string): Promise<void> {
    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    await this.connection.invoke('LeaveLobbyGroup', gameSessionId);
  }

  async requestLobbyStatus(gameSessionId: string, userId: string): Promise<void> {
    await this.start();
    await this.connection?.invoke('RequestLobbyStatus', gameSessionId, userId);
  }

  isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  private ensureConnection(): HubConnection {
    if (this.connection) {
      return this.connection;
    }

    this.connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    this.connection.on('LobbyStatusUpdate', (payload: LobbyStatusPayload) => {
      this.lobbyStatusUpdateSubject.next(this.normalizeLobbyStatus(payload));
    });

    this.connection.on('GameSessionsUpdated', () => {
      this.gameSessionsUpdatedSubject.next();
    });

    return this.connection;
  }

  private normalizeLobbyStatus(payload: LobbyStatusPayload): GameSessionLobbyStatusDto {
    return {
      ...payload,
      countdownStartedAt: this.toDate(payload.countdownStartedAt),
      countdownEndsAt: this.toDate(payload.countdownEndsAt),
    };
  }

  private toDate(value: string | Date | null): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
