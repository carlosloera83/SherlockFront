import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { firstValueFrom, timeout } from 'rxjs';
import { GamesService } from '../services/games';
import { AuthService } from '../../auth/services/auth';
import { ActiveGameSession, JoinGameSessionMessage } from '../class/IGames';
import { GameSessionsLiveService } from '../services/game-sessions-live.service';

interface GameCard {
  status: string;
  statusTone: 'warning' | 'success' | 'neutral';
  title: string;
  subtitle: string;
  players: string;
  energy: string;
  completion: string;
  schedule: string;
  ctaGradient: string;
  backgroundImage: string;
  isUserInGame: boolean;
  availableSpots: number;
  session: ActiveGameSession;
  canUserEnterGame: boolean;
}

const TYPE_BACKGROUNDS: Record<string, string> = {
  POCKET:
    "linear-gradient(180deg, rgba(7, 10, 24, 0.2) 0%, rgba(7, 10, 24, 0.86) 100%), url('https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80')",
  ARENA:
    "linear-gradient(180deg, rgba(5, 10, 28, 0.2) 0%, rgba(5, 10, 28, 0.84) 100%), url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80')",
  DEFAULT:
    "linear-gradient(180deg, rgba(22, 7, 10, 0.18) 0%, rgba(22, 7, 10, 0.88) 100%), url('https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80')",
};

const STATUS_GRADIENTS: Record<string, string> = {
  WAITING: 'linear-gradient(90deg, #8b5cf6 0%, #ff005c 100%)',
  ACTIVE:  'linear-gradient(90deg, #22c55e 0%, #0ea5a4 100%)',
  DEFAULT: 'linear-gradient(90deg, #f97316 0%, #e11d48 100%)',
};

@Component({
  selector: 'app-games',
  standalone: true,
  templateUrl: './games.page.html',
  styleUrls: ['./games.page.scss'],
  imports: [CommonModule, IonContent, IonSpinner],
})
export class GamesPage implements OnInit, OnDestroy {
  games: GameCard[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  joiningGameSessionId: string | null = null;
  winnerFlashSet = new Set<string>();
  private currentUserId: string | null = null;
  private prevWinnerMap = new Map<string, string | null | undefined>();

  constructor(
    private gamesService: GamesService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private gameSessionsLiveService: GameSessionsLiveService,
  ) {}

  async ngOnInit(): Promise<void> {
    const session = await this.authService.getSession();
    if (!session) {
      this.isLoading = false;
      this.errorMessage = 'No se encontró sesión de usuario.';
      return;
    }

    this.currentUserId = session.userId;
    await this.loadGames();

    try {
      await this.gameSessionsLiveService.startConnection(() => {
        this.loadGames(false);
      });
    } catch {
      this.errorMessage = 'No fue posible iniciar actualizaciones en vivo.';
    }
  }

  async ngOnDestroy(): Promise<void> {
    await this.gameSessionsLiveService.stopConnection();
  }

  private async loadGames(showLoader = true): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    this.isLoading = showLoader;
    this.errorMessage = null;

    try {
      const response = await firstValueFrom(
        this.gamesService.getGameSessionsLiveStatus(this.currentUserId).pipe(timeout(12000))
      );

      if (!response.success) {
        this.errorMessage = response.message;
        this.games = [];
        return;
      }

      const sessions = Array.isArray(response.data) ? response.data : [];
      const newGames = sessions.map((s) => this.mapSessionToCard(s));

      newGames.forEach((card) => {
        const id = card.session.gameSessionId;
        const prev = this.prevWinnerMap.get(id);
        const curr = card.session.firstPlace;

        if (prev !== undefined && prev !== curr) {
          this.winnerFlashSet.add(id);
          setTimeout(() => this.winnerFlashSet.delete(id), 2000);
        }

        this.prevWinnerMap.set(id, curr);
      });

      this.games = newGames;
    } catch (error) {
      console.error('Error cargando o mapeando partidas en vivo:', error);
      this.errorMessage = 'Error al cargar las partidas. Verifica API y conexión.';
      this.games = [];
    } finally {
      this.isLoading = false;
    }
  }

  private mapSessionToCard(s: ActiveGameSession): GameCard {
    const safeSession: ActiveGameSession = {
      ...s,
      gameId: s.gameId ?? '',
      gameName: s.gameName ?? 'Partida',
      description: s.description ?? '',
      gameTypeCode: s.gameTypeCode ?? 'POCKET',
      gameTypeName: s.gameTypeName ?? 'Pocket',
      entryCostPoints: s.totalPotPoints ?? 0,
      durationMinutes: s.durationMinutes ?? 0,
      minPlayers: s.minPlayers ?? 0,
      maxPlayers: s.maxPlayers ?? 0,
      rewardPercentage: s.rewardPercentage ?? 0,
      gameStatusCode: s.gameStatusCode ?? 'DEFAULT',
      gameStatusName: s.gameStatusName ?? 'Sin estado',
      sessionDate: s.sessionDate ?? '',
      scheduledStartTime: s.scheduledStartTime ?? s.sessionDate ?? '',
      scheduledEndTime: s.scheduledEndTime ?? '',
      actualStartTime: s.actualStartTime ?? null,
      actualEndTime: s.actualEndTime ?? null,
      totalPotPoints: s.totalPotPoints ?? 0,
      currentPlayers: s.currentPlayers ?? 0,
      availableSpots: s.availableSpots ?? 0,
      canStart: s.canStart ?? false,
      userId: s.userId ?? '',
      isUserInGame: s.isUserInGame ?? false,
      hasUserFinishedGame: s.hasUserFinishedGame ?? false,
      canUserEnterGame: s.canUserEnterGame ?? true,
      winnerUserId: s.winnerUserId ?? null,
      winnerScorePoints: s.winnerScorePoints ?? null,
      firstPlace: s.firstPlace ?? null,
    };

    const statusTone = this.resolveStatusTone(safeSession.gameStatusCode);
    return {
      status: safeSession.gameStatusName.toUpperCase(),
      statusTone,
      title: safeSession.gameName.toUpperCase(),
      subtitle: safeSession.gameTypeName.toUpperCase(),
      players: `${safeSession.currentPlayers}/${safeSession.maxPlayers}`,
      energy: String(safeSession.entryCostPoints),
      completion: `${safeSession.rewardPercentage}%`,
      schedule: this.formatTime(safeSession.scheduledStartTime),
      ctaGradient: STATUS_GRADIENTS[safeSession.gameStatusCode] ?? STATUS_GRADIENTS['DEFAULT'],
      backgroundImage: TYPE_BACKGROUNDS[safeSession.gameTypeCode] ?? TYPE_BACKGROUNDS['DEFAULT'],
      isUserInGame: safeSession.isUserInGame,
      availableSpots: safeSession.availableSpots,
      session: safeSession,
      canUserEnterGame: safeSession.canUserEnterGame,
    };
  }

  private resolveStatusTone(code: string): 'warning' | 'success' | 'neutral' {
    if (code === 'WAITING') return 'warning';
    if (code === 'ACTIVE') return 'success';
    return 'neutral';
  }

  private formatTime(dateStr: string): string {
    if (!dateStr) {
      return '--:--';
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return '--:--';
    }

    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  async openGame(game: GameCard): Promise<void> {
    if (!this.currentUserId) {
      this.errorMessage = 'No se encontró sesión de usuario.';
      return;
    }

    const session = game.session;
    const gameRoute = this.resolveGameRoute(session.gameTypeCode);
    if (!gameRoute) {
      await this.showInfoMessage('Este modo de juego aun no esta disponible en la app.');
      return;
    }

    const actionLabel = this.getActionLabel(session);
    if (actionLabel === 'Cupo lleno') {
      await this.showInfoMessage('Esta partida ya alcanzó su cupo máximo.');
      return;
    }

    if (actionLabel === 'Partida finalizada') {
      await this.showInfoMessage('Esta partida está finalizada o cancelada.');
      return;
    }

    if (actionLabel === 'En espera') {
      await this.showInfoMessage(
        `Aun faltan jugadores para iniciar (${session.currentPlayers}/${this.getRequiredPlayers(session)}).`
      );
      return;
    }

    if (actionLabel === 'Continuar') {
      this.navigateToGame(session.gameSessionId, gameRoute);
      return;
    }

    if (actionLabel === 'Ver resultado') {
      this.navigateToGame(session.gameSessionId, gameRoute);
      return;
    }

    if (actionLabel === 'Entrar') {
      const accepted = await this.confirmJoin(session.entryCostPoints);
      if (!accepted) {
        return;
      }

      this.joiningGameSessionId = session.gameSessionId;
      try {
        const response = await firstValueFrom(
          this.gamesService.joinGameSession(session.gameSessionId, this.currentUserId)
        );

        const joinMessage = (response.message || response.data?.mensaje || '') as JoinGameSessionMessage;

        if (!response.success) {
          this.errorMessage = response.message || 'No fue posible procesar la partida.';
          return;
        }

        if (joinMessage === 'GAME_SESSION_FULL') {
          await this.showInfoMessage('Cupo lleno para esta partida.');
          await this.loadGames(false);
          return;
        }

        if (joinMessage === 'GAME_SESSION_FINISHED_OR_CANCELLED') {
          await this.showInfoMessage('La partida ya finalizó o fue cancelada.');
          await this.loadGames(false);
          return;
        }

        if (joinMessage === 'USER_ALREADY_FINISHED_GAME') {
          await this.showInfoMessage('Ya terminaste esta partida. Se mostrará el resultado.');
          this.navigateToGame(session.gameSessionId, gameRoute);
          return;
        }

        if (joinMessage !== 'USER_JOINED_GAME_SESSION' && joinMessage !== 'USER_REJOINED_GAME_SESSION') {
          this.errorMessage = 'No fue posible unirte a la partida.';
          return;
        }

        session.isUserInGame = true;
        session.hasUserFinishedGame = false;

        if (response.data) {
          session.currentPlayers = response.data.currentPlayers;
          session.availableSpots = response.data.availableSpots;
        }

        game.isUserInGame = true;

        if (response.data) {
          game.availableSpots = response.data.availableSpots;
          game.players = `${response.data.currentPlayers}/${session.maxPlayers}`;
        }

        await this.loadGames(false);

        if (this.hasRequiredPlayers(session)) {
          await this.showInfoMessage('Ya estan los jugadores necesarios. Ahora puedes presionar Continuar.');
        } else {
          await this.showInfoMessage(
            `Te uniste a la partida. Queda en espera (${session.currentPlayers}/${this.getRequiredPlayers(session)}).`
          );
        }
      } catch {
        this.errorMessage = 'No fue posible unirte al juego. Intenta de nuevo.';
        return;
      } finally {
        this.joiningGameSessionId = null;
      }
    }
  }

  getActionLabel(session: ActiveGameSession): string {
    if (!session.canUserEnterGame && session.hasUserFinishedGame) {
      return 'Ver resultado';
    }

    if (session.gameStatusCode === 'FINISHED') {
      return 'Partida finalizada';
    }

    if (session.availableSpots === 0 && !session.isUserInGame) {
      return 'Cupo lleno';
    }

    if (session.isUserInGame && !session.hasUserFinishedGame) {
      return this.hasRequiredPlayers(session) ? 'Continuar' : 'En espera';
    }

    return 'Entrar';
  }

  isActionDisabled(session: ActiveGameSession): boolean {
    const actionLabel = this.getActionLabel(session);
    return actionLabel === 'Cupo lleno' || actionLabel === 'Partida finalizada' || actionLabel === 'En espera';
  }

  isContinueAction(session: ActiveGameSession): boolean {
    return this.getActionLabel(session) === 'Continuar';
  }

  getActionButtonText(session: ActiveGameSession): string {
    const action = this.getActionLabel(session);
    if (action === 'Continuar') {
      return 'INICIAR AHORA';
    }

    return action;
  }

  getSessionInfoText(session: ActiveGameSession): string {
    if (session.winnerUserId) {
      return `Ganador definido: ${session.winnerScorePoints ?? 0} pts`;
    }

    if (session.canStart) {
      return 'Lista para iniciar';
    }

    if (session.isUserInGame && !session.hasUserFinishedGame && !this.hasRequiredPlayers(session)) {
      return `Esperando jugadores (${session.currentPlayers}/${this.getRequiredPlayers(session)})`;
    }

    return session.gameStatusName;
  }

  isWinnerFlashing(session: ActiveGameSession): boolean {
    return this.winnerFlashSet.has(session.gameSessionId);
  }

  getWinnerDisplayName(session: ActiveGameSession): string {
    if (!session.firstPlace) {
      return 'POR DEFINIR';
    }

    const winner = session.firstPlace.trim();
    if (winner.length > 14 && winner.includes('-')) {
      return ` ${winner.slice(0, 8).toUpperCase()}`;
    }

    return winner.toUpperCase();
  }

  getWinnerPoints(session: ActiveGameSession): number {
    return session.winnerScorePoints ?? 0;
  }

  private hasRequiredPlayers(session: ActiveGameSession): boolean {
    if (session.canStart) {
      return true;
    }

    if (session.maxPlayers > 0 && session.currentPlayers >= session.maxPlayers) {
      return true;
    }

    if (session.availableSpots === 0 && session.currentPlayers > 0) {
      return true;
    }

    return session.currentPlayers >= this.getRequiredPlayers(session);
  }

  private getRequiredPlayers(session: ActiveGameSession): number {
    if (session.minPlayers > 0) {
      return session.minPlayers;
    }

    if (session.maxPlayers > 0) {
      return session.maxPlayers;
    }

    return 1;
  }

  private resolveGameRoute(gameTypeCode: string): string | null {
    const normalized = (gameTypeCode || '').toUpperCase();

    if (normalized === 'POCKET' || normalized === 'DEFAULT' || normalized === '') {
      return '/games/pocket';
    }

    return null;
  }

  private navigateToGame(gameSessionId: string, route: string): void {
    this.router.navigate([route], {
      queryParams: {
        gameSessionId,
      },
    });
  }

  private async confirmJoin(entryCostPoints: number): Promise<boolean> {
    const alert = await this.alertController.create({
      header: 'Entrar al juego',
      message: `Este juego cuesta ${entryCostPoints} puntos. ¿Quieres gastarlos para unirte?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Sí, entrar',
          role: 'confirm',
        },
      ],
    });

    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role === 'confirm';
  }

  private async showInfoMessage(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Partida',
      message,
      buttons: ['Entendido'],
    });

    await alert.present();
    await alert.onDidDismiss();
  }

  isSignalRConnected(): boolean {
    return this.gameSessionsLiveService.isConnected();
  }
}
