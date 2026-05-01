import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GameSessionsLiveService {
  private readonly hubUrl = `${environment.apiUrl.replace(/\/api\/?$/, '')}/hubs/gamesessions`;
  private connection: HubConnection | null = null;

  async startConnection(onUpdated: () => void): Promise<void> {
    if (!this.connection) {
      this.connection = new HubConnectionBuilder()
        .withUrl(this.hubUrl)
        .withAutomaticReconnect()
        .build();
    }

    this.connection.off('GameSessionsUpdated');

    this.connection.on('GameSessionsUpdated', () => {
      onUpdated();
    });

    if (this.connection.state === 'Disconnected') {
      await this.connection.start();
    }
  }

  async stopConnection(): Promise<void> {
    if (!this.connection) {
      return;
    }

    this.connection.off('GameSessionsUpdated');

    if (this.connection.state !== 'Disconnected') {
      await this.connection.stop();
    }

    this.connection = null;
  }

  isConnected(): boolean {
    return this.connection?.state === 'Connected';
  }
}