import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { Subscription, firstValueFrom, timeout } from 'rxjs';
import { LoginResponseData } from '../../../auth/class/ILogin';
import { AuthService } from '../../../auth/services/auth';
import { ActiveGameSession, GameSessionLobbyPlayer } from '../../class/IGames';
import { GameSessionLobbyStatusDto } from '../../class/game-session-lobby-status.dto';
import { GameSessionSignalrService } from '../../services/game-session-signalr.service';
import { GamesService } from '../../services/games';

interface LobbyPlayerCard {
  slot: number;
  name: string;
  avatar: string;
  role: string;
  status: 'UNIDO' | 'LISTO' | 'ESPERANDO';
  isCurrentUser: boolean;
}

@Component({
  selector: 'app-pocket-lobby',
  standalone: true,
  templateUrl: './pocket-lobby.component.html',
  styleUrls: ['./pocket-lobby.component.scss'],
  imports: [CommonModule, IonContent, IonSpinner],
})
export class PocketLobbyComponent implements OnInit, OnDestroy {
  session: ActiveGameSession | null = null;
  lobbyPlayers: LobbyPlayerCard[] = [];
  isLoading = true;
  isStarting = false;
  errorMessage: string | null = null;
  headerTitle = 'Lobby de partida';
  headerSubtitle = 'Esperando jugadores...';
  readinessMessage = 'Esperando a que se complete el grupo';
  requiredPlayers = 0;
  isLeavingLobby = false;
  isCountdownActive = false;
  countdownSecondsLeft = 0;
  private gameSessionId = '';
  private currentUser: LoginResponseData | null = null;
  private gameRoute = '/games/pocket';
  private countdownEndsAt: Date | null = null;
  private countdownHandle: ReturnType<typeof setInterval> | null = null;
  private readonly simulatedCountdownSeconds = 15;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly authService: AuthService,
    private readonly gamesService: GamesService,
    private readonly gameSessionSignalrService: GameSessionSignalrService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.currentUser = await this.authService.getSession();
    if (!this.currentUser) {
      this.errorMessage = 'No se encontro la sesion del usuario.';
      this.isLoading = false;
      return;
    }

    this.gameSessionId = (this.route.snapshot.queryParamMap.get('gameSessionId') ?? '').toUpperCase();
    this.gameRoute = this.route.snapshot.queryParamMap.get('gameRoute') || '/games/pocket';

    if (!this.gameSessionId) {
      this.errorMessage = 'No se encontro la partida seleccionada.';
      this.isLoading = false;
      return;
    }

    await this.refreshSession();

    try {
      this.subscriptions.add(
        this.gameSessionSignalrService.gameSessionsUpdated$.subscribe(() => {
          void this.refreshSession(false);
        })
      );

      this.subscriptions.add(
        this.gameSessionSignalrService.lobbyStatusUpdate$.subscribe((status) => {
          this.handleLobbyStatusUpdate(status);
        })
      );

      await this.gameSessionSignalrService.start();
      await this.gameSessionSignalrService.joinLobby(this.gameSessionId, this.currentUser.userId);
      await this.gameSessionSignalrService.requestLobbyStatus(this.gameSessionId, this.currentUser.userId);
    } catch {
      if (!this.session) {
        this.errorMessage = 'No fue posible cargar las actualizaciones del lobby.';
      }
    }
  }

  async ngOnDestroy(): Promise<void> {
    this.subscriptions.unsubscribe();
    this.clearCountdown();

    if (this.gameSessionId) {
      await this.gameSessionSignalrService.leaveLobby(this.gameSessionId);
    }

    await this.gameSessionSignalrService.stop();
  }

  async startGame(): Promise<void> {
    if (!this.session || !this.canStartGame() || this.isStarting) {
      return;
    }

    this.isStarting = true;
    try {
      await this.router.navigate([this.gameRoute], {
        queryParams: { gameSessionId: this.session.gameSessionId },
      });
    } finally {
      this.isStarting = false;
    }
  }

  async goBack(): Promise<void> {
    if (this.isLeavingLobby) {
      return;
    }

    const alert = await this.alertController.create({
      header: 'Salir del lobby',
      message: '¿Deseas salir del lobby?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
        },
        {
          text: 'SI',
          handler: () => {
            void this.confirmLeaveLobby();
          },
        },
      ],
    });

    await alert.present();
  }

  private async confirmLeaveLobby(): Promise<void> {
    if (this.isLeavingLobby) {
      return;
    }

    this.isLeavingLobby = true;

    if (!this.currentUser || !this.gameSessionId) {
      await this.router.navigate(['/games']);
      this.isLeavingLobby = false;
      return;
    }

    try {
      const response = await firstValueFrom(
        this.gamesService.cancelLobby(this.gameSessionId, this.currentUser.userId).pipe(timeout(12000))
      );

      if (!response.success) {
        this.errorMessage = response.message || 'No fue posible salir del lobby.';
        this.isLeavingLobby = false;
        return;
      }
    } catch {
      this.errorMessage = 'No fue posible salir del lobby.';
      this.isLeavingLobby = false;
      return;
    }

    await this.router.navigate(['/games']);
    this.isLeavingLobby = false;
  }

  canStartGame(): boolean {
    if (!this.session) {
      return false;
    }

    return this.hasRequiredPlayers(this.session);
  }

  getPlayersSummary(): string {
    if (!this.session) {
      return '0 / 0 jugadores';
    }

    return `${this.session.currentPlayers} / ${this.session.maxPlayers} jugadores`;
  }

  trackBySlot(_: number, player: LobbyPlayerCard): number {
    return player.slot;
  }

  getCountdownLabel(): string {
    const minutes = Math.floor(this.countdownSecondsLeft / 60);
    const seconds = this.countdownSecondsLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private async refreshSession(showLoader = true): Promise<void> {
    if (!this.currentUser) {
      return;
    }

    this.isLoading = showLoader;
    this.errorMessage = null;

    try {
      const response = await firstValueFrom(
        this.gamesService.getGameSessionsLiveStatus(this.currentUser.userId).pipe(timeout(12000))
      );

      if (!response.success) {
        this.errorMessage = response.message || 'No fue posible cargar la partida.';
        this.session = null;
        this.lobbyPlayers = [];
        return;
      }

      const session = (response.data || []).find(
        (item) => item.gameSessionId.toUpperCase() === this.gameSessionId
      );

      if (!session) {
        this.errorMessage = 'La partida ya no esta disponible.';
        this.session = null;
        this.lobbyPlayers = [];
        return;
      }

      this.session = session;
      this.applySessionState(session);
      this.reconcileCountdown(session);
      await this.refreshLobbyPlayers(session);
    } catch {
      if (!this.session) {
        this.errorMessage = 'No fue posible actualizar el lobby.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  private buildLobbyPlayers(session: ActiveGameSession): LobbyPlayerCard[] {
    const currentUserName = this.getCurrentUserDisplayName();
    const currentUserAvatar = this.getAvatarInitials(currentUserName);

    return this.buildLobbyPlayersFromApi(session, [
      {
        result: session.gameSessionId,
        mensaje: 'LOCAL_FALLBACK_PLAYER',
        userId: this.currentUser?.userId || '',
        nickName: currentUserName,
        avatarInitial: currentUserAvatar,
        scorePoints: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        isFinished: false,
        playerStatus: 'JOINED',
        joinedAt: new Date().toISOString(),
      },
    ]);
  }

  private buildLobbyPlayersFromApi(
    session: ActiveGameSession,
    players: GameSessionLobbyPlayer[]
  ): LobbyPlayerCard[] {
    const maxPlayers = Math.max(session.maxPlayers, session.currentPlayers, this.requiredPlayers, 1);
    const rolePool = ['Detective', 'Inspector', 'Analista', 'Agente', 'Perito', 'Cronista'];
    const everyoneReady = this.hasRequiredPlayers(session);
    const normalizedPlayers = players.slice(0, maxPlayers);

    if (this.session) {
      this.session.currentPlayers = normalizedPlayers.length;
      this.session.availableSpots = Math.max(maxPlayers - normalizedPlayers.length, 0);
    }

    return Array.from({ length: maxPlayers }, (_, index) => {
      const slot = index + 1;
      const player = normalizedPlayers[index];
      const isOccupied = !!player;
      const isCurrentUser = !!player && player.userId === this.currentUser?.userId;
      const role = `${rolePool[index % rolePool.length]} ${slot}`;
      const name = !player?.nickName?.trim()
        ? 'Esperando jugador'
        : isCurrentUser
          ? this.getCurrentUserDisplayName()
          : player.nickName;

      return {
        slot,
        name,
        avatar: isOccupied
          ? this.resolveAvatarInitial(player.avatarInitial, name)
          : this.getAvatarInitials(name),
        role,
        status: !isOccupied
          ? 'ESPERANDO'
          : everyoneReady || player.playerStatus === 'READY'
            ? 'LISTO'
            : 'UNIDO',
        isCurrentUser,
      };
    });
  }

  private handleLobbyStatusUpdate(status: GameSessionLobbyStatusDto): void {
    if (status.gameSessionId.toUpperCase() !== this.gameSessionId) {
      return;
    }

    if (!this.session) {
      void this.refreshSession(false);
      return;
    }

    this.session = {
      ...this.session,
      gameName: status.gameName,
      description: status.description ?? this.session.description,
      gameStatusCode: status.gameStatusCode,
      gameStatusName: status.gameStatusName,
      minPlayers: status.minPlayers,
      maxPlayers: status.maxPlayers,
      currentPlayers: status.currentPlayers,
      availableSpots: status.availableSpots,
      canStart: status.canStart,
    };

    this.reconcileCountdown(this.session);
    this.applySessionState(this.session);
    void this.refreshLobbyPlayers(this.session);
  }

  private async refreshLobbyPlayers(session: ActiveGameSession): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.gamesService.getLobbyPlayers(this.gameSessionId).pipe(timeout(12000))
      );

      if (!response.success || !Array.isArray(response.data)) {
        this.lobbyPlayers = this.buildLobbyPlayers(session);
        return;
      }

      this.lobbyPlayers = this.buildLobbyPlayersFromApi(session, response.data);
      this.reconcileCountdown(session);
      this.applySessionState(session);
    } catch {
      this.lobbyPlayers = this.buildLobbyPlayers(session);
      this.reconcileCountdown(session);
      this.applySessionState(session);
    }
  }

  private reconcileCountdown(session: ActiveGameSession): void {
    if (!this.hasRequiredPlayers(session)) {
      this.clearCountdown();
      return;
    }

    if (!this.countdownEndsAt) {
      this.startCountdown();
      return;
    }

    this.updateCountdownTick();
  }

  private startCountdown(): void {
    this.clearCountdown(false);
    this.countdownEndsAt = new Date(Date.now() + this.simulatedCountdownSeconds * 1000);
    this.isCountdownActive = true;
    this.updateCountdownTick();

    this.countdownHandle = setInterval(() => {
      this.updateCountdownTick();
    }, 1000);
  }

  private updateCountdownTick(): void {
    if (!this.countdownEndsAt) {
      this.clearCountdown();
      return;
    }

    const remaining = Math.max(
      0,
      Math.ceil((this.countdownEndsAt.getTime() - Date.now()) / 1000)
    );

    this.countdownSecondsLeft = remaining;
    this.isCountdownActive = remaining > 0;

    if (remaining === 0) {
      this.clearCountdown(false);

      if (this.session && this.canStartGame() && !this.isStarting) {
        void this.startGame();
      }
    }

    if (this.session) {
      this.applySessionState(this.session);
    }
  }

  private clearCountdown(resetSeconds = true): void {
    if (this.countdownHandle) {
      clearInterval(this.countdownHandle);
      this.countdownHandle = null;
    }

    this.countdownEndsAt = null;
    this.isCountdownActive = false;

    if (resetSeconds) {
      this.countdownSecondsLeft = 0;
    }
  }

  private getCurrentUserDisplayName(): string {
    if (!this.currentUser) {
      return 'Tu jugador';
    }

    const preferredName = [
      this.currentUser.nickName,
      `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim(),
      this.currentUser.username,
    ].find((value) => !!value?.trim());

    return preferredName || 'Tu jugador';
  }

  private getAvatarInitials(name: string): string {
    const words = name
      .split(' ')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 2);

    if (words.length === 0) {
      return 'JG';
    }

    return words.map((word) => word[0]).join('').toUpperCase();
  }

  private resolveAvatarInitial(avatarInitial: string | null | undefined, fallbackName: string): string {
    if (avatarInitial?.trim()) {
      return avatarInitial.trim().slice(0, 2).toUpperCase();
    }

    return this.getAvatarInitials(fallbackName);
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

  private applySessionState(session: ActiveGameSession): void {
    this.requiredPlayers = this.getRequiredPlayers(session);
    this.headerTitle = session.gameName.toUpperCase();
    this.headerSubtitle = this.canStartGame()
      ? 'Todos listos para comenzar'
      : 'Esperando jugadores...';

    if (this.isCountdownActive && this.countdownSecondsLeft > 0) {
      this.readinessMessage = `Jugadores minimos completos. Inicio en ${this.getCountdownLabel()}`;
      return;
    }

    this.readinessMessage = this.canStartGame()
      ? 'Todos los jugadores necesarios ya estan listos'
      : `Faltan ${Math.max(this.requiredPlayers - session.currentPlayers, 0)} jugador(es) para iniciar`;
  }
}