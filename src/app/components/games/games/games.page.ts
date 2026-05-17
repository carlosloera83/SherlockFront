import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { firstValueFrom, timeout } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';
import { App } from '@capacitor/app';
import { GamesService } from '../services/games';
import { AuthService } from '../../auth/services/auth';
import { ActiveGameSession, JoinGameSessionMessage } from '../class/IGames';
import { GameSessionsLiveService } from '../services/game-sessions-live.service';
import { RankingEntry } from '../pocket/class/IPocket';
import { PocketService } from '../pocket/services/pocket';
import { LoginResponseData } from '../../auth/class/ILogin';

interface GameCard {
  status: string;
  statusTone: 'warning' | 'success' | 'neutral';
  title: string;
  subtitle: string;
  modeIcon: string;
  modeTag: string;
  players: string;
  energy: string;
  completion: string;
  schedule: string;
  difficulty: string;
  questionCount: number;
  onlineCount: number;
  ctaGradient: string;
  backgroundImage: string;
  isUserInGame: boolean;
  availableSpots: number;
  isMock: boolean;
  session: ActiveGameSession;
  canUserEnterGame: boolean;
}

interface RankingModalPlayer {
  position: number;
  name: string;
  points: number;
  avatar: string;
  isCurrentUser: boolean;
}

interface SidebarDetective {
  position: number;
  name: string;
  points: number;
  isCurrentUser: boolean;
}

interface MissionMock {
  title: string;
  current: number;
  goal: number;
  reward: number;
}

interface BottomTab {
  icon: string;
  label: string;
  active: boolean;
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
  dataHintMessage: string | null = null;
  selectedGameSessionId: string | null = null;
  usingMockData = false;

  userDisplayName = 'Jugador';
  userInitial = 'J';
  resolvedCases = 0;
  currentStreak = 0;
  profileLevel = 1;
  profileProgress = 0;
  profileGoal = 10000;
  sidebarDetectives: SidebarDetective[] = [];
  onlineFriends = ['AX', 'MJ', 'CN', 'LT'];
  worldMessage = 'DetectiveAna: Alguien para jugar Geografia?';
  eventCountdown = '02:14:22';
  missionsMock: MissionMock[] = [
    { title: 'Resuelve 3 pistas', current: 2, goal: 3, reward: 50 },
    { title: 'Visita 5 ubicaciones', current: 3, goal: 5, reward: 60 },
    { title: 'Completa 1 juego', current: 0, goal: 1, reward: 100 },
  ];
  bottomTabs: BottomTab[] = [
    { icon: '⌂', label: 'LOBBY', active: true },
    { icon: '▣', label: 'CASOS', active: false },
    { icon: '⌖', label: 'MAPA', active: false },
    { icon: '◈', label: 'INVENTARIO', active: false },
    { icon: '♛', label: 'RANKING', active: false },
    { icon: '🛒', label: 'TIENDA', active: false },
  ];

  coinsBalance = 0;
  reportCount = 0;
  trophyScore = 0;
  isMusicEnabled = true;
  isUserMenuOpen = false;

  joiningGameSessionId: string | null = null;
  showRankingModal = false;
  isRankingLoading = false;
  rankingErrorMessage: string | null = null;
  rankingPlayers: RankingModalPlayer[] = [];
  rankingSessionTitle = 'Ranking final';
  winnerFlashSet = new Set<string>();
  private readonly enterSoundPath = 'assets/sounds/Entrar_Sound.mp3';
  private readonly backgroundMusicPath = 'assets/sounds/Music_Games.mp3';
  private enterSound: HTMLAudioElement | null = null;
  private backgroundMusic: HTMLAudioElement | null = null;
  private unlockMusicHandler: (() => void) | null = null;
  private hasTriedBackgroundMusic = false;
  private audioContext: AudioContext | null = null;
  private currentUserId: string | null = null;
  private orientationLocked = false;
  private prevWinnerMap = new Map<string, string | null | undefined>();
  private backButtonListener: { remove: () => Promise<void> } | null = null;

  constructor(
    private gamesService: GamesService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private gameSessionsLiveService: GameSessionsLiveService,
    private pocketService: PocketService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.forceLandscapeOrientation();
    if (Capacitor.isNativePlatform()) {
      await StatusBar.hide().catch(() => {});
    }
    void this.ensureBackgroundMusicStarted();

    const session = await this.authService.getSession();
    if (!session) {
      this.isLoading = false;
      this.errorMessage = 'No se encontró sesión de usuario.';
      return;
    }

    this.hydrateUserProfile(session);
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
    this.stopBackgroundMusic();
    await this.releaseOrientationLock();
    await this.gameSessionsLiveService.stopConnection();
    if (Capacitor.isNativePlatform()) {
      await StatusBar.show().catch(() => {});
    }
    if (this.backButtonListener) {
      await this.backButtonListener.remove().catch(() => {});
      this.backButtonListener = null;
    }
  }

  async ionViewWillEnter(): Promise<void> {
    await this.forceLandscapeOrientation();
    await this.ensureBackgroundMusicStarted();
    if (Capacitor.isNativePlatform()) {
      await StatusBar.hide().catch(() => {});
    }
  }

  async ionViewDidEnter(): Promise<void> {
    await this.forceLandscapeOrientation();
    if (Capacitor.isNativePlatform()) {
      await StatusBar.hide().catch(() => {});
      this.backButtonListener = await App.addListener('backButton', () => {
        this.router.navigate(['/games'], { replaceUrl: true });
      });
    }
  }

  async ionViewWillLeave(): Promise<void> {
    this.stopBackgroundMusic();
    this.isUserMenuOpen = false;
    await this.releaseOrientationLock();
    if (Capacitor.isNativePlatform()) {
      await StatusBar.show().catch(() => {});
    }
    if (this.backButtonListener) {
      await this.backButtonListener.remove().catch(() => {});
      this.backButtonListener = null;
    }
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  goToProfile(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = false;
    void this.router.navigate(['/profile']);
  }

  async logout(event: Event): Promise<void> {
    event.stopPropagation();
    this.isUserMenuOpen = false;
    this.stopBackgroundMusic();
    await this.authService.clearSession();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (!this.isUserMenuOpen) {
      return;
    }

    this.isUserMenuOpen = false;
  }

  private async loadGames(showLoader = true): Promise<void> {
    if (!this.currentUserId) {
      return;
    }

    this.isLoading = showLoader;
    this.errorMessage = null;
    this.dataHintMessage = null;

    try {
      const response = await firstValueFrom(
        this.gamesService.getGameSessionsLiveStatus(this.currentUserId).pipe(timeout(12000))
      );

      if (!response.success) {
        this.injectMockGames(response.message || 'No hay partidas disponibles en este momento.');
        return;
      }

      const sessions = Array.isArray(response.data) ? response.data : [];
      if (sessions.length === 0) {
        this.injectMockGames('Sin datos en vivo por ahora. Se muestran modos de demostración.');
        return;
      }

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
      this.usingMockData = false;
      this.ensureSelectedGame();
      this.rebuildDashboardMetrics();
    } catch (error) {
      console.error('Error cargando o mapeando partidas en vivo:', error);
      this.injectMockGames('Error de conexión en partidas en vivo. Se muestran modos de demostración.');
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
      modeIcon: this.resolveModeIcon(safeSession),
      modeTag: safeSession.gameTypeName,
      players: `${safeSession.currentPlayers}/${safeSession.maxPlayers}`,
      energy: String(safeSession.entryCostPoints),
      completion: `${safeSession.rewardPercentage}%`,
      schedule: this.formatTime(safeSession.scheduledStartTime),
      difficulty: this.resolveDifficulty(safeSession),
      questionCount: this.resolveQuestionCount(safeSession),
      onlineCount: this.resolveOnlineCount(safeSession),
      ctaGradient: STATUS_GRADIENTS[safeSession.gameStatusCode] ?? STATUS_GRADIENTS['DEFAULT'],
      backgroundImage: TYPE_BACKGROUNDS[safeSession.gameTypeCode] ?? TYPE_BACKGROUNDS['DEFAULT'],
      isUserInGame: safeSession.isUserInGame,
      availableSpots: safeSession.availableSpots,
      isMock: false,
      session: safeSession,
      canUserEnterGame: safeSession.canUserEnterGame,
    };
  }

  get currentGame(): GameCard | null {
    if (this.games.length === 0) {
      return null;
    }

    if (!this.selectedGameSessionId) {
      return this.games[0];
    }

    return this.games.find((game) => game.session.gameSessionId === this.selectedGameSessionId) || this.games[0];
  }

  selectGame(game: GameCard): void {
    this.selectedGameSessionId = game.session.gameSessionId;
    this.rebuildDashboardMetrics();
  }

  getActionButtonBackground(game: GameCard): string {
    return this.isContinueAction(game.session)
      ? 'linear-gradient(90deg, #22c55e 0%, #14b8a6 55%, #0ea5e9 100%)'
      : (game.isUserInGame ? '#1e293b' : game.ctaGradient);
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

    if (game.isMock) {
      await this.showInfoMessage('Estas en modo demostracion. Cuando haya partidas en vivo podras entrar.');
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

    if (actionLabel === 'Lobby') {
      this.navigateToLobby(session.gameSessionId, gameRoute);
      return;
    }

    if (actionLabel === 'Continuar') {
      this.navigateToLobby(session.gameSessionId, gameRoute);
      return;
    }

    if (actionLabel === 'Ver resultado') {
      await this.openRankingModal(session);
      return;
    }

    if (actionLabel === 'Entrar') {
      this.playEnterSound();

      const accepted = await this.confirmJoin(session.entryCostPoints);
      if (!accepted) {
        return;
      }

      this.joiningGameSessionId = session.gameSessionId;
      try {
        const response = await firstValueFrom(
          this.gamesService.joinGameSession(session.gameSessionId, this.currentUserId)
        );

        const joinMessage = (response.data?.mensaje || response.message || '') as JoinGameSessionMessage;

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

        const isJoinSuccessMessage =
          joinMessage === 'USER_REJOINED_GAME_SESSION' ||
          joinMessage === 'USER_JOINED_GAME_SESSION' ||
          joinMessage.startsWith('USER_JOINED_');

        if (!isJoinSuccessMessage) {
          this.errorMessage = 'No fue posible unirte a la partida.';
          return;
        }

        session.isUserInGame = true;
        session.hasUserFinishedGame = false;

        if (response.data) {
          if (typeof response.data.currentPlayers === 'number') {
            session.currentPlayers = response.data.currentPlayers;
          }

          if (typeof response.data.availableSpots === 'number') {
            session.availableSpots = response.data.availableSpots;
          }
        }

        game.isUserInGame = true;

        if (response.data) {
          if (typeof response.data.availableSpots === 'number') {
            game.availableSpots = response.data.availableSpots;
          }

          if (typeof response.data.currentPlayers === 'number') {
            game.players = `${response.data.currentPlayers}/${session.maxPlayers}`;
          }
        }

        await this.loadGames(false);
        this.navigateToLobby(session.gameSessionId, gameRoute);
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
      return this.hasRequiredPlayers(session) ? 'Continuar' : 'Lobby';
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
      return 'VER LOBBY';
    }

    if (action === 'Lobby') {
      return 'VER LOBBY';
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

  getProfileProgressPercent(): number {
    if (this.profileGoal <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((this.profileProgress / this.profileGoal) * 100));
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

  closeRankingModal(): void {
    this.showRankingModal = false;
    this.isRankingLoading = false;
    this.rankingErrorMessage = null;
    this.rankingPlayers = [];
  }

  trackByRankingPosition(_: number, player: RankingModalPlayer): number {
    return player.position;
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

  private navigateToLobby(gameSessionId: string, gameRoute: string): void {
    this.router.navigate(['/games/pocket/lobby'], {
      queryParams: {
        gameSessionId,
        gameRoute,
      },
    });
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

  private async openRankingModal(session: ActiveGameSession): Promise<void> {
    if (!this.currentUserId) {
      this.errorMessage = 'No se encontró sesión de usuario.';
      return;
    }

    this.rankingSessionTitle = `Resultado de ${session.gameName.toUpperCase()}`;
    this.showRankingModal = true;
    this.isRankingLoading = true;
    this.rankingErrorMessage = null;
    this.rankingPlayers = [];

    try {
      const response = await firstValueFrom(
        this.pocketService.getRanking(session.gameSessionId, this.currentUserId).pipe(timeout(12000))
      );

      if (!response.success || !Array.isArray(response.data)) {
        this.rankingErrorMessage = response.message || 'No fue posible cargar el ranking.';
        return;
      }

      this.rankingPlayers = this.mapRankingEntries(response.data);

      if (this.rankingPlayers.length === 0) {
        this.rankingErrorMessage = 'No hay resultados de ranking para esta partida.';
      }
    } catch {
      this.rankingErrorMessage = 'No fue posible cargar el ranking.';
    } finally {
      this.isRankingLoading = false;
    }
  }

  private mapRankingEntries(entries: RankingEntry[]): RankingModalPlayer[] {
    return [...entries]
      .sort((a, b) => a.position - b.position)
      .map((entry) => ({
        position: entry.position,
        name: entry.playerName,
        points: entry.scorePoints,
        avatar: (entry.avatarInitial || this.getAvatarInitials(entry.playerName)).toUpperCase(),
        isCurrentUser: entry.isCurrentUser,
      }));
  }

  private getAvatarInitials(name: string): string {
    const initials = (name || '')
      .trim()
      .split(' ')
      .filter((part) => part.length > 0)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return initials || 'PL';
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

  get diamondBalance(): number {
    return Math.max(9000, this.reportCount * 210);
  }

  getMissionProgress(mission: MissionMock): number {
    if (mission.goal <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((mission.current / mission.goal) * 100));
  }

  private playEnterSound(): void {
    try {
      if (!this.enterSound) {
        this.enterSound = new Audio(this.enterSoundPath);
        this.enterSound.preload = 'auto';
      }

      this.enterSound.currentTime = 0;
      void this.enterSound.play().catch(() => {
        this.playEnterSoundFallback();
      });
      return;
    } catch {
      // Fall back to generated tone.
    }

    this.playEnterSoundFallback();
  }

  private playEnterSoundFallback(): void {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContextCtor();
      }

      if (this.audioContext.state === 'suspended') {
        void this.audioContext.resume();
      }

      const now = this.audioContext.currentTime;

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.17);
    } catch {
      // Ignore audio errors to keep game flow unaffected.
    }
  }

  private async playBackgroundMusic(): Promise<void> {
    if (!this.isMusicEnabled) {
      return;
    }

    this.initBackgroundMusic();

    if (!this.backgroundMusic) {
      return;
    }

    try {
      this.backgroundMusic.currentTime = 0;
      await this.backgroundMusic.play();
      this.removeMusicUnlockListeners();
    } catch {
      this.attachMusicUnlockListeners();
    }
  }

  private async ensureBackgroundMusicStarted(): Promise<void> {
    if (!this.isMusicEnabled) {
      return;
    }

    if (this.hasTriedBackgroundMusic && this.backgroundMusic && !this.backgroundMusic.paused) {
      return;
    }

    this.hasTriedBackgroundMusic = true;
    await this.playBackgroundMusic();
  }

  private initBackgroundMusic(): void {
    if (this.backgroundMusic) {
      return;
    }

    this.backgroundMusic = new Audio(this.backgroundMusicPath);
    this.backgroundMusic.preload = 'auto';
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.55;
  }

  async toggleBackgroundMusic(): Promise<void> {
    this.isMusicEnabled = !this.isMusicEnabled;

    if (this.isMusicEnabled) {
      await this.ensureBackgroundMusicStarted();
      return;
    }

    this.stopBackgroundMusic();
  }

  private stopBackgroundMusic(): void {
    this.removeMusicUnlockListeners();

    if (!this.backgroundMusic) {
      return;
    }

    this.backgroundMusic.pause();
    this.backgroundMusic.currentTime = 0;
  }

  private attachMusicUnlockListeners(): void {
    if (this.unlockMusicHandler) {
      return;
    }

    this.unlockMusicHandler = () => {
      if (!this.isMusicEnabled) {
        return;
      }

      void this.playBackgroundMusic();
    };

    window.addEventListener('pointerdown', this.unlockMusicHandler, { once: true });
    window.addEventListener('touchstart', this.unlockMusicHandler, { once: true });
    window.addEventListener('click', this.unlockMusicHandler, { once: true });
    window.addEventListener('keydown', this.unlockMusicHandler, { once: true });
  }

  private removeMusicUnlockListeners(): void {
    if (!this.unlockMusicHandler) {
      return;
    }

    window.removeEventListener('pointerdown', this.unlockMusicHandler);
    window.removeEventListener('touchstart', this.unlockMusicHandler);
    window.removeEventListener('click', this.unlockMusicHandler);
    window.removeEventListener('keydown', this.unlockMusicHandler);
    this.unlockMusicHandler = null;
  }

  private injectMockGames(reason: string): void {
    const mockGames = this.buildMockGames();
    this.games = mockGames;
    this.usingMockData = true;
    this.dataHintMessage = reason;
    this.ensureSelectedGame();
    this.rebuildDashboardMetrics();
  }

  private buildMockGames(): GameCard[] {
    const now = Date.now();

    const sessions: ActiveGameSession[] = [
      this.createMockSession({
        gameSessionId: 'mock-duelo-1',
        gameName: 'Duelo Detectivesco',
        description: 'Cara a cara contra otro detective.',
        gameTypeName: 'Arena',
        gameStatusCode: 'WAITING',
        gameStatusName: 'Esperando',
        durationMinutes: 5,
        minPlayers: 2,
        maxPlayers: 2,
        currentPlayers: 1,
        availableSpots: 1,
        rewardPercentage: 250,
        totalPotPoints: 40,
        sessionDate: new Date(now + 2 * 60000).toISOString(),
        scheduledStartTime: new Date(now + 2 * 60000).toISOString(),
        firstPlace: 'MysteryMaster',
        winnerScorePoints: 15420,
      }),
      this.createMockSession({
        gameSessionId: 'mock-caso-2',
        gameName: 'Caso Misterioso',
        description: 'Resuelve el enigma principal.',
        gameTypeName: 'Pocket',
        gameStatusCode: 'ACTIVE',
        gameStatusName: 'Activo',
        durationMinutes: 12,
        minPlayers: 1,
        maxPlayers: 4,
        currentPlayers: 2,
        availableSpots: 2,
        rewardPercentage: 180,
        totalPotPoints: 25,
        sessionDate: new Date(now + 12 * 60000).toISOString(),
        scheduledStartTime: new Date(now + 12 * 60000).toISOString(),
        firstPlace: 'ClueHunter',
        winnerScorePoints: 13890,
      }),
      this.createMockSession({
        gameSessionId: 'mock-enigma-3',
        gameName: 'Enigma Rapido',
        description: 'Acertijos veloces de precision.',
        gameTypeName: 'Pocket',
        gameStatusCode: 'WAITING',
        gameStatusName: 'Esperando',
        durationMinutes: 4,
        minPlayers: 1,
        maxPlayers: 1,
        currentPlayers: 1,
        availableSpots: 0,
        rewardPercentage: 120,
        totalPotPoints: 15,
        sessionDate: new Date(now + 25 * 60000).toISOString(),
        scheduledStartTime: new Date(now + 25 * 60000).toISOString(),
        firstPlace: 'EnigmaSolver',
        winnerScorePoints: 8750,
      }),
      this.createMockSession({
        gameSessionId: 'mock-investiga-4',
        gameName: 'Investigacion Conjunta',
        description: 'Modo cooperativo para equipos.',
        gameTypeName: 'Pocket',
        gameStatusCode: 'WAITING',
        gameStatusName: 'Esperando',
        durationMinutes: 15,
        minPlayers: 3,
        maxPlayers: 4,
        currentPlayers: 3,
        availableSpots: 1,
        rewardPercentage: 300,
        totalPotPoints: 60,
        sessionDate: new Date(now + 45 * 60000).toISOString(),
        scheduledStartTime: new Date(now + 45 * 60000).toISOString(),
        firstPlace: 'PuzzleKing',
        winnerScorePoints: 8200,
      }),
    ];

    return sessions.map((session) => {
      const card = this.mapSessionToCard(session);
      card.isMock = true;
      card.canUserEnterGame = false;
      card.onlineCount = Math.max(card.onlineCount, 120 + Math.floor(Math.random() * 260));
      return card;
    });
  }

  private createMockSession(partial: Partial<ActiveGameSession>): ActiveGameSession {
    return {
      gameSessionId: partial.gameSessionId || `mock-${Date.now()}`,
      gameId: partial.gameId || partial.gameSessionId || 'mock-game',
      gameName: partial.gameName || 'Modo Detectivesco',
      description: partial.description || 'Partida de demostracion',
      gameTypeCode: partial.gameTypeCode || 'POCKET',
      gameTypeName: partial.gameTypeName || 'Pocket',
      entryCostPoints: partial.entryCostPoints ?? partial.totalPotPoints ?? 0,
      durationMinutes: partial.durationMinutes ?? 5,
      minPlayers: partial.minPlayers ?? 1,
      maxPlayers: partial.maxPlayers ?? 2,
      rewardPercentage: partial.rewardPercentage ?? 150,
      gameStatusCode: partial.gameStatusCode || 'WAITING',
      gameStatusName: partial.gameStatusName || 'Esperando',
      sessionDate: partial.sessionDate || new Date().toISOString(),
      scheduledStartTime: partial.scheduledStartTime || partial.sessionDate || new Date().toISOString(),
      scheduledEndTime: partial.scheduledEndTime || '',
      actualStartTime: partial.actualStartTime ?? null,
      actualEndTime: partial.actualEndTime ?? null,
      totalPotPoints: partial.totalPotPoints ?? 0,
      currentPlayers: partial.currentPlayers ?? 1,
      availableSpots: partial.availableSpots ?? Math.max(0, (partial.maxPlayers ?? 2) - (partial.currentPlayers ?? 1)),
      canStart: partial.canStart ?? false,
      userId: partial.userId || this.currentUserId || 'demo-user',
      isUserInGame: partial.isUserInGame ?? false,
      hasUserFinishedGame: partial.hasUserFinishedGame ?? false,
      canUserEnterGame: partial.canUserEnterGame ?? false,
      winnerUserId: partial.winnerUserId ?? null,
      winnerScorePoints: partial.winnerScorePoints ?? null,
      firstPlace: partial.firstPlace ?? null,
    };
  }

  private ensureSelectedGame(): void {
    const currentExists = this.games.some((game) => game.session.gameSessionId === this.selectedGameSessionId);
    if (!currentExists) {
      this.selectedGameSessionId = this.games.length > 0 ? this.games[0].session.gameSessionId : null;
    }
  }

  private hydrateUserProfile(session: LoginResponseData): void {
    this.userDisplayName = session.nickName || session.firstName || session.username || 'Jugador';
    this.userInitial = this.getAvatarInitials(this.userDisplayName).slice(0, 1) || 'J';
  }

  private rebuildDashboardMetrics(): void {
    const active = this.currentGame;
    if (!active) {
      this.coinsBalance = 0;
      this.reportCount = 0;
      this.trophyScore = 0;
      this.resolvedCases = 0;
      this.currentStreak = 0;
      this.profileLevel = 1;
      this.profileProgress = 0;
      this.profileGoal = 1000;
      this.sidebarDetectives = [];
      return;
    }

    const totalEntry = this.games.reduce((sum, game) => sum + Number(game.energy), 0);
    const totalPlayers = this.games.reduce((sum, game) => sum + game.session.currentPlayers, 0);

    this.coinsBalance = 12000 + totalEntry * 8;
    this.reportCount = 40 + this.games.length + Math.floor(totalPlayers / 2);
    this.trophyScore = Math.max(9000, (active.session.winnerScorePoints ?? 9000) + 120);

    this.resolvedCases = Math.max(12, this.games.length * 9 + (this.usingMockData ? 11 : 18));
    this.currentStreak = Math.max(3, active.session.currentPlayers + (this.usingMockData ? 4 : 6));
    this.profileLevel = Math.max(5, Math.floor(this.resolvedCases / 3));
    this.profileGoal = 10000;
    this.profileProgress = Math.min(this.profileGoal, this.trophyScore - 700);

    const currentUserPoints = Math.max(7500, this.trophyScore - 220);
    this.sidebarDetectives = [
      { position: 1, name: 'MysteryMaster', points: currentUserPoints + 2200, isCurrentUser: false },
      { position: 2, name: 'ClueHunter', points: currentUserPoints + 980, isCurrentUser: false },
      { position: 3, name: `${this.userDisplayName} (Tu)`, points: currentUserPoints, isCurrentUser: true },
      { position: 4, name: 'EnigmaSolver', points: Math.max(6400, currentUserPoints - 360), isCurrentUser: false },
      { position: 5, name: 'PuzzleKing', points: Math.max(6200, currentUserPoints - 640), isCurrentUser: false },
    ];
  }

  private resolveModeIcon(session: ActiveGameSession): string {
    const text = `${session.gameName} ${session.gameTypeName}`.toLowerCase();

    if (text.includes('duelo') || text.includes('arena')) {
      return '⚔️';
    }

    if (text.includes('caso')) {
      return '🔎';
    }

    if (text.includes('investig')) {
      return '👥';
    }

    if (text.includes('torneo')) {
      return '🏆';
    }

    if (text.includes('enigma') || text.includes('rapido')) {
      return '⚡';
    }

    return '🕵️';
  }

  private resolveDifficulty(session: ActiveGameSession): string {
    if (session.rewardPercentage >= 280) {
      return 'Experto';
    }

    if (session.rewardPercentage >= 180) {
      return 'Alta';
    }

    return 'Media';
  }

  private resolveQuestionCount(session: ActiveGameSession): number {
    if (session.maxPlayers <= 1) {
      return 8;
    }

    return Math.max(10, Math.min(18, session.durationMinutes * 2));
  }

  private resolveOnlineCount(session: ActiveGameSession): number {
    const baseline = (session.currentPlayers * 28) + (session.rewardPercentage * 0.4);
    return Math.max(48, Math.round(baseline));
  }

  private async forceLandscapeOrientation(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await ScreenOrientation.lock({ orientation: 'landscape' });
      } else {
        const orientationApi = (window.screen as Screen & { orientation?: { lock?: (type: string) => Promise<void> } }).orientation;
        if (orientationApi?.lock) {
          await orientationApi.lock('landscape');
        }
      }

      this.orientationLocked = true;
    } catch (error) {
      this.orientationLocked = false;
      console.warn('No se pudo bloquear orientacion horizontal en Games.', error);
    }
  }

  private async releaseOrientationLock(): Promise<void> {
    if (!this.orientationLocked) {
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await ScreenOrientation.unlock();
      } else {
        const orientationApi = (window.screen as Screen & { orientation?: { unlock?: () => void } }).orientation;
        orientationApi?.unlock?.();
      }
    } catch (error) {
      console.warn('No se pudo liberar orientacion en Games.', error);
    } finally {
      this.orientationLocked = false;
    }
  }
}
