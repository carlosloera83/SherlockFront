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
import { environment } from 'src/environments/environment';
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
  session: ActiveGameSession;
  canUserEnterGame: boolean;
  isPlaceholder?: boolean;
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

interface OnlineFriend {
  name: string;
  avatar: string;
  online: boolean;
}

interface HudShortcut {
  label: string;
  glyph: string;
  badge: number;
}

interface BoardMenuSection {
  title: string;
  items: string[];
  accent: 'purple' | 'gold' | 'lime' | 'blue';
}

interface BoardStatItem {
  label: string;
  value: number;
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
  private readonly defaultProfileAvatarUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=180&q=80';
  private readonly localProfileAvatarFallback = 'assets/Images/avatares/Avatar_Blank.png';

  games: GameCard[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  dataHintMessage: string | null = null;
  selectedGameSessionId: string | null = null;
  readyCarouselIndex = 0;
  isCarouselAnimating = false;

  userDisplayName = 'Jugador';
  userInitial = 'J';
  resolvedCases = 0;
  currentStreak = 0;
  profileLevel = 1;
  profileProgress = 0;
  profileGoal = 10000;
  sidebarDetectives: SidebarDetective[] = [];
  profileAvatarUrl = this.defaultProfileAvatarUrl;
  profileAvatarHasError = false;
  onlineFriends: OnlineFriend[] = [
    { name: 'Alex', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80', online: true },
    { name: 'Mia', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80', online: true },
    { name: 'Chris', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80', online: true },
    { name: 'Leito', avatar: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=120&q=80', online: true },
    { name: 'Nora', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=120&q=80', online: false },
  ];
  hudShortcuts: HudShortcut[] = [
    { label: 'RECOMPENSAS', glyph: 'R', badge: 2 },
    { label: 'CORREO', glyph: 'M', badge: 1 },
    { label: 'CONFIG.', glyph: 'C', badge: 0 },
  ];
  worldMessage = 'Aqui puede ir un mensaje global para todos los jugadores, como un anuncio de evento o una felicitación por el día.';
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
  isMusicEnabled = false;
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
  private readyCarouselTimer: ReturnType<typeof setInterval> | null = null;
  private readyCarouselAnimationTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly boardMenuSections: BoardMenuSection[] = [
    {
      title: 'Selecciona una modalidad',
      items: [ 'Contra reloj'],
      accent: 'purple',
    },
    // {
    //   title: 'Sherlock Rankings',
    //   items: ['Mundial', 'Tu pais', 'Tu ciudad'],
    //   accent: 'gold',
    // },
    // {
    //   title: 'Sherlock City',
    //   items: ['Reto semanal'],
    //   accent: 'lime',
    // },
    // {
    //   title: 'Sherlock Quizard',
    //   items: [],
    //   accent: 'blue',
    // },
  ];

  constructor(
    private gamesService: GamesService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private gameSessionsLiveService: GameSessionsLiveService,
    private pocketService: PocketService,
  ) {}

  readonly appVersion = environment.version;

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
    this.startReadyCarouselAutoPlay();

    try {
      await this.gameSessionsLiveService.startConnection(() => {
        this.loadGames(false);
      });
    } catch {
      this.errorMessage = 'No fue posible iniciar actualizaciones en vivo.';
    }
  }

  async ngOnDestroy(): Promise<void> {
    this.stopReadyCarouselAutoPlay();
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
    this.startReadyCarouselAutoPlay();
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
    this.stopReadyCarouselAutoPlay();
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
        this.games = [];
        this.errorMessage = response.message || 'No hay partidas disponibles en este momento.';
        this.ensureSelectedGame();
        this.rebuildDashboardMetrics();
        return;
      }

      const sessions = Array.isArray(response.data) ? response.data : [];
      if (sessions.length === 0) {
        this.games = [];
        this.errorMessage = 'No hay partidas disponibles en este momento.';
        this.ensureSelectedGame();
        this.rebuildDashboardMetrics();
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
      this.ensureSelectedGame();
      this.rebuildDashboardMetrics();
    } catch (error) {
      console.error('Error cargando o mapeando partidas en vivo:', error);
      this.games = [];
      this.errorMessage = 'Error de conexión en partidas en vivo.';
      this.ensureSelectedGame();
      this.rebuildDashboardMetrics();
    } finally {
      this.isLoading = false;
    }
  }

  private mapSessionToCard(s: ActiveGameSession): GameCard {
    const resolvedCostGems = s.costGems ?? s.entryCostPoints ?? s.totalPotPoints ?? 0;

    const safeSession: ActiveGameSession = {
      ...s,
      gameId: s.gameId ?? '',
      gameName: s.gameName ?? 'Partida',
      description: s.description ?? '',
      gameTypeCode: s.gameTypeCode ?? 'POCKET',
      gameTypeName: s.gameTypeName ?? 'Pocket',
      costGems: resolvedCostGems,
      entryCostPoints: resolvedCostGems,
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
      energy: String(safeSession.costGems ?? safeSession.entryCostPoints),
      completion: `${safeSession.rewardPercentage}%`,
      schedule: this.formatTime(safeSession.scheduledStartTime),
      difficulty: this.resolveDifficulty(safeSession),
      questionCount: this.resolveQuestionCount(safeSession),
      onlineCount: this.resolveOnlineCount(safeSession),
      ctaGradient: STATUS_GRADIENTS[safeSession.gameStatusCode] ?? STATUS_GRADIENTS['DEFAULT'],
      backgroundImage: TYPE_BACKGROUNDS[safeSession.gameTypeCode] ?? TYPE_BACKGROUNDS['DEFAULT'],
      isUserInGame: safeSession.isUserInGame,
      availableSpots: safeSession.availableSpots,
      session: safeSession,
      canUserEnterGame: safeSession.canUserEnterGame,
      isPlaceholder: false,
    };
  }

  get displayGames(): GameCard[] {
    return this.games.length > 0 ? this.games : this.buildPlaceholderGames();
  }

  get rankingSummary(): { world: number; country: number; city: number } {
    const world = Math.max(57, 84 - Math.floor(this.profileLevel * 1.7) - (this.games.length * 4));
    const country = Math.max(33, world - 24);
    const city = Math.max(11, country - 22);

    return { world, country, city };
  }

  get playerStats(): BoardStatItem[] {
    return [
      { label: 'JJ', value: Math.max(85, this.resolvedCases + 24) },
      { label: 'JG', value: Math.max(50, this.currentStreak + 38) },
      { label: 'Puntos', value: Math.max(450, Math.round(this.trophyScore / 20)) },
      { label: 'Partidas', value: Math.max(80, this.games.length * 16 + 32) },
      { label: 'Partidas Doradas', value: Math.max(5, Math.floor(this.readyGames.length / 2) + 3) },
    ];
  }

  get featuredGames(): GameCard[] {
    return this.displayGames;
  }

  get sidebarMenuSections(): BoardMenuSection[] {
    return this.boardMenuSections;
  }

  get displayRankingPlayers(): SidebarDetective[] {
    if (this.sidebarDetectives.length > 0) {
      return this.sidebarDetectives;
    }

    return [
      { position: 1, name: 'MysteryMaster', points: 12840, isCurrentUser: false },
      { position: 2, name: 'ClueHunter', points: 11760, isCurrentUser: false },
      { position: 3, name: `${this.userDisplayName} (Tu)`, points: 10890, isCurrentUser: true },
      { position: 4, name: 'PuzzleKing', points: 10440, isCurrentUser: false },
    ];
  }

  get onlineFriendsCount(): number {
    return this.onlineFriends.filter((friend) => friend.online).length;
  }

  get onlinePlayersBadgeCount(): number {
    return Math.max(8, this.onlineFriendsCount + (this.games.length * 2));
  }

  get victoryRate(): number {
    return Math.min(92, Math.max(75, 68 + this.readyGames.length * 4 + Math.floor(this.currentStreak / 3)));
  }

  get welcomeBannerText(): string {
    return `Bienvenido, ${this.userDisplayName} - Nivel ${this.profileLevel}`;
  }

  get hasLiveGames(): boolean {
    return this.games.length > 0;
  }

  get showBoardWarning(): boolean {
    return !!this.errorMessage && !this.hasLiveGames;
  }

  get currentGame(): GameCard | null {
    if (this.games.length === 0) {
      return null;
    }

    const ready = this.readyGames;
    if (ready.length > 0) {
      if (!this.selectedGameSessionId) {
        return ready[0];
      }

      return ready.find((game) => game.session.gameSessionId === this.selectedGameSessionId) || ready[0];
    }

    if (!this.selectedGameSessionId) {
      return this.games[0];
    }

    return this.games.find((game) => game.session.gameSessionId === this.selectedGameSessionId) || this.games[0];
  }

  get readyGames(): GameCard[] {
    return this.games.filter((game) => this.isReadyGame(game.session));
  }

  get hasReadyGames(): boolean {
    return this.readyGames.length > 0;
  }

  getReadyCarouselTransform(): string {
    return `translateX(-${this.readyCarouselIndex * 100}%)`;
  }

  isSelectedReadyGame(game: GameCard): boolean {
    return this.selectedGameSessionId === game.session.gameSessionId;
  }

  prevReadyGame(): void {
    const ready = this.readyGames;
    if (ready.length < 2) {
      return;
    }

    const nextIndex = (this.readyCarouselIndex - 1 + ready.length) % ready.length;
    this.selectGame(ready[nextIndex]);
    this.triggerDoorAnimation();
    this.restartReadyCarouselAutoPlay();
  }

  nextReadyGame(): void {
    const ready = this.readyGames;
    if (ready.length < 2) {
      return;
    }

    const nextIndex = (this.readyCarouselIndex + 1) % ready.length;
    this.selectGame(ready[nextIndex]);
    this.triggerDoorAnimation();
    this.restartReadyCarouselAutoPlay();
  }

  trackByGameSession(_: number, game: GameCard): string {
    return game.session.gameSessionId;
  }

  trackByBoardStat(_: number, item: BoardStatItem): string {
    return item.label;
  }

  selectGame(game: GameCard): void {
    if (!this.isReadyGame(game.session)) {
      return;
    }

    this.selectedGameSessionId = game.session.gameSessionId;
    this.syncReadyCarouselIndex();
    this.rebuildDashboardMetrics();
  }

  getActionButtonBackground(game: GameCard): string {
    return this.isContinueAction(game.session)
      ? 'linear-gradient(90deg, #22c55e 0%, #14b8a6 55%, #0ea5e9 100%)'
      : (game.isUserInGame ? '#1e293b' : game.ctaGradient);
  }

  isPlaceholderGame(game: GameCard): boolean {
    return game.isPlaceholder === true;
  }

  getBoardCardClass(game: GameCard): string {
    if (this.isPlaceholderGame(game)) {
      return 'game-room--placeholder';
    }

    const action = this.getActionLabel(game.session);

    if (action === 'Partida finalizada' || action === 'Cupo lleno') {
      return 'game-room--closed';
    }

    return 'game-room--open';
  }

  getBoardStatusText(game: GameCard): string {
    if (this.isPlaceholderGame(game)) {
      return 'Cerrado!';
    }

    const action = this.getActionLabel(game.session);

    if (action === 'Partida finalizada') {
      return 'Cerrado!';
    }

    if (action === 'Cupo lleno') {
      return 'Lleno';
    }

    return game.subtitle;
  }

  getBoardActionText(game: GameCard): string {
    if (this.isPlaceholderGame(game)) {
      return 'Proximamente';
    }

    const action = this.getActionButtonText(game.session);
    return action === 'Entrar' ? 'Unirme' : action;
  }

  getRoomThemeClass(game: GameCard): string {
    const label = `${game.title} ${game.subtitle}`.toUpperCase();
    const boardClass = this.getBoardCardClass(game);

    if (label.includes('MUNDIAL') || label.includes('RANK')) {
      return boardClass === 'game-room--open' ? 'room-card--gold' : 'room-card--gold room-card--disabled';
    }

    if (boardClass === 'game-room--closed' || boardClass === 'game-room--placeholder') {
      return 'room-card--disabled';
    }

    return 'room-card--violet';
  }

  getRoomCategoryText(game: GameCard): string {
    const label = `${game.title} ${game.subtitle}`.toUpperCase();
    if (label.includes('MUNDIAL') || label.includes('RANK')) {
      return 'RANKINGS';
    }

    return 'POCKET';
  }

  getRoomParticipantsText(game: GameCard): string {
    const current = game.session.currentPlayers || this.extractPlayersFromLabel(game.players) || game.session.maxPlayers;
    const max = game.session.maxPlayers || this.extractPlayersFromLabel(game.players) || current;

    return `${current}/${max}`;
  }

  getRoomCostGems(game: GameCard): number {
    return game.session.costGems ?? game.session.entryCostPoints ?? 0;
  }

  getRoomPrizeGems(game: GameCard): number {
    if (game.session.totalPotPoints > 0) {
      return game.session.totalPotPoints;
    }

    const entryCost = this.getRoomCostGems(game);
    const players = game.session.maxPlayers || game.session.currentPlayers || 1;
    return entryCost * players;
  }

  getRoomCountdownText(game: GameCard): string {
    const endDate = this.resolveRoomCloseDate(game.session);
    if (!endDate) {
      return 'Cierre por definir';
    }

    const diffMs = endDate.getTime() - Date.now();
    if (diffMs <= 0) {
      return 'Cerrada';
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }

    return `${seconds}s`;
  }

  getRoomPlacesText(game: GameCard): number {
    return game.availableSpots || game.session.availableSpots || game.session.maxPlayers || 0;
  }

  isBoardActionDisabled(game: GameCard): boolean {
    if (this.isPlaceholderGame(game)) {
      return true;
    }

    return this.isActionDisabled(game.session) || this.joiningGameSessionId === game.session.gameSessionId;
  }

  async handleBoardAction(game: GameCard): Promise<void> {
    if (this.isPlaceholderGame(game)) {
      await this.showInfoMessage('Esta sala es una referencia visual. Estara disponible pronto.');
      return;
    }

    await this.openGame(game);
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

  private resolveRoomCloseDate(session: ActiveGameSession): Date | null {
    if (session.actualEndTime) {
      const actualEnd = new Date(session.actualEndTime);
      if (!Number.isNaN(actualEnd.getTime())) {
        return actualEnd;
      }
    }

    const scheduledEnd = new Date(session.scheduledEndTime);
    const scheduledStart = new Date(session.scheduledStartTime || session.sessionDate);
    const hasValidEnd = !Number.isNaN(scheduledEnd.getTime());
    const hasValidStart = !Number.isNaN(scheduledStart.getTime());

    if (hasValidEnd && (!hasValidStart || scheduledEnd.getTime() > scheduledStart.getTime())) {
      return scheduledEnd;
    }

    if (hasValidStart && session.durationMinutes > 0) {
      return new Date(scheduledStart.getTime() + (session.durationMinutes * 60 * 1000));
    }

    return hasValidEnd ? scheduledEnd : null;
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

      const accepted = await this.confirmJoin(session.costGems ?? session.entryCostPoints);
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
          if (this.isInsufficientGemsMessage(response.message)) {
            await this.showInsufficientGemsModal(response.message || 'INSUFFICIENT_GEMS');
            return;
          }

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
      } catch (error: any) {
        const apiMessage = error?.error?.message || error?.message || '';
        if (this.isInsufficientGemsMessage(apiMessage)) {
          await this.showInsufficientGemsModal(apiMessage || 'INSUFFICIENT_GEMS');
          return;
        }

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

  isResultAction(session: ActiveGameSession): boolean {
    return this.getActionLabel(session) === 'Ver resultado';
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
      return 'Por Definir';
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
    this.router.navigate(['/games/pocket/ranking'], {
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

  public  async openRankingModal(session: ActiveGameSession): Promise<void> {
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
      header: '',
      message: `
        <div class="game-join-alert__content">
          <div class="game-join-alert__icon-wrap">
            <div class="game-join-alert__icon">💎</div>
          </div>
          <h2 class="game-join-alert__title">ENTRAR AL JUEGO</h2>
          <p class="game-join-alert__lead">Este juego cuesta</p>
          <div class="game-join-alert__cost-pill">
            <span class="game-join-alert__cost-icon">💎</span>
            <strong>${entryCostPoints}</strong>
            <span>Gemas</span>
          </div>
          <p class="game-join-alert__question">¿Quieres gastarlas para unirte?</p>
        </div>
      `,
      cssClass: ['game-join-alert'],
      buttons: [
        {
          text: 'CANCELAR',
          role: 'cancel',
          cssClass: 'game-join-alert__btn game-join-alert__btn--cancel',
        },
        {
          text: 'SÍ, ENTRAR',
          role: 'confirm',
          cssClass: 'game-join-alert__btn game-join-alert__btn--confirm',
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

  private isInsufficientGemsMessage(message: string | null | undefined): boolean {
    return (message || '').toUpperCase().includes('INSUFFICIENT_GEMS');
  }

  private async showInsufficientGemsModal(message: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'No tienes gemas suficientes',
      message: `
        <div class="insufficient-gems-alert__content">
          <div class="insufficient-gems-alert__sad-face">☹️</div>
          <p class="insufficient-gems-alert__message">${message}</p>
        </div>
      `,
      cssClass: ['register-result-alert', 'register-result-alert--error', 'insufficient-gems-alert'],
      buttons: [
        {
          text: '✅ Aceptar',
          role: 'cancel',
        },
        {
          text: '🛒 Comprar Gemas',
          role: 'buy-gems',
        },
      ],
    });

    await alert.present();
    const result = await alert.onDidDismiss();

    if (result.role === 'buy-gems') {
      await this.router.navigate(['/profile']);
    }
  }

  isSignalRConnected(): boolean {
    return this.gameSessionsLiveService.isConnected();
  }

  get diamondBalance(): number {
    return Math.max(9000, this.reportCount * 210);
  }

  get gems(): number {
    return this.diamondBalance;
  }

  get worldRankingPoints(): number {
    return this.rankingSummary.world;
  }

  get countryRankingPoints(): number {
    return this.rankingSummary.country;
  }

  get gamesWon(): number {
    return Math.max(0, Math.floor(this.trophyScore / 120));
  }

  get gamesPlayed(): number {
    return Math.max(0, Math.max(80, this.games.length * 16 + 32));
  }

  getMissionProgress(mission: MissionMock): number {
    if (mission.goal <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((mission.current / mission.goal) * 100));
  }

  private buildPlaceholderGames(): GameCard[] {
    return [
      
    ];
  }

  private createPlaceholderGame(
    id: string,
    title: string,
    subtitle: string,
    players: number,
    spots: number,
    statusCode: string,
    statusName: string,
    currentPlayers = players,
  ): GameCard {
    const now = new Date();
    const session: ActiveGameSession = {
      gameSessionId: id,
      gameId: id,
      gameName: title,
      description: subtitle,
      gameTypeCode: 'POCKET',
      gameTypeName: subtitle,
      costGems: 25,
      entryCostPoints: 25,
      durationMinutes: 12,
      minPlayers: 2,
      maxPlayers: players,
      rewardPercentage: statusCode === 'WAITING' ? 220 : 120,
      gameStatusCode: statusCode,
      gameStatusName: statusName,
      sessionDate: now.toISOString(),
      scheduledStartTime: now.toISOString(),
      scheduledEndTime: now.toISOString(),
      actualStartTime: null,
      actualEndTime: null,
      totalPotPoints: 200,
      currentPlayers,
      availableSpots: spots,
      canStart: statusCode === 'WAITING' && spots > 0,
      userId: '',
      isUserInGame: false,
      hasUserFinishedGame: false,
      canUserEnterGame: statusCode === 'WAITING' && spots > 0,
      winnerUserId: null,
      winnerScorePoints: null,
      firstPlace: null,
    };

    const card = this.mapSessionToCard(session);
    card.title = title;
    card.subtitle = subtitle;
    card.players = `${players}`;
    card.availableSpots = spots;
    card.isPlaceholder = true;

    return card;
  }

  private extractPlayersFromLabel(value: string): number {
    const match = /^\s*(\d+)/.exec(value || '');
    return match ? Number(match[1]) : 0;
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

  private ensureSelectedGame(): void {
    const ready = this.readyGames;
    if (ready.length > 0) {
      const currentReadyExists = ready.some((game) => game.session.gameSessionId === this.selectedGameSessionId);
      if (!currentReadyExists) {
        this.selectedGameSessionId = ready[0].session.gameSessionId;
      }

      this.syncReadyCarouselIndex();
      this.restartReadyCarouselAutoPlay();
      return;
    }

    const currentExists = this.games.some((game) => game.session.gameSessionId === this.selectedGameSessionId);
    if (!currentExists) {
      this.selectedGameSessionId = this.games.length > 0 ? this.games[0].session.gameSessionId : null;
    }

    this.readyCarouselIndex = 0;
    this.stopReadyCarouselAutoPlay();
  }

  private hydrateUserProfile(session: LoginResponseData): void {
    const avatarSession = session as LoginResponseData & {
      avatarUrl?: string;
      profileImageUrl?: string;
      imageUrl?: string;
      photoUrl?: string;
      avatar?: string;
    };
    const resolvedAvatar = [
      avatarSession.avatarUrl,
      avatarSession.profileImageUrl,
      avatarSession.imageUrl,
      avatarSession.photoUrl,
      avatarSession.avatar,
    ].find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();

    this.userDisplayName = session.nickName || session.firstName || session.username || 'Jugador';
    this.userInitial = this.getAvatarInitials(this.userDisplayName).slice(0, 1) || 'J';
    this.profileAvatarHasError = false;
    this.profileAvatarUrl = resolvedAvatar ?? this.defaultProfileAvatarUrl;
  }

  onProfileAvatarError(): void {
    if (this.profileAvatarUrl !== this.localProfileAvatarFallback) {
      this.profileAvatarUrl = this.localProfileAvatarFallback;
      return;
    }

    this.profileAvatarHasError = true;
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

    this.resolvedCases = Math.max(12, this.games.length * 9 + 18);
    this.currentStreak = Math.max(3, active.session.currentPlayers + 6);
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

  private isReadyGame(session: ActiveGameSession): boolean {
    const code = (session.gameStatusCode || '').toUpperCase();
    const name = (session.gameStatusName || '').toUpperCase();
    return code === 'WAITING' || name === 'READY' || name === 'LISTO';
  }

  private syncReadyCarouselIndex(): void {
    const ready = this.readyGames;
    if (ready.length === 0) {
      this.readyCarouselIndex = 0;
      return;
    }

    const index = ready.findIndex((game) => game.session.gameSessionId === this.selectedGameSessionId);
    this.readyCarouselIndex = index >= 0 ? index : 0;
  }

  private startReadyCarouselAutoPlay(): void {
    if (this.readyCarouselTimer || this.readyGames.length < 2) {
      return;
    }

    this.readyCarouselTimer = setInterval(() => {
      const ready = this.readyGames;
      if (ready.length < 2) {
        this.stopReadyCarouselAutoPlay();
        return;
      }

      const nextIndex = (this.readyCarouselIndex + 1) % ready.length;
      this.selectedGameSessionId = ready[nextIndex].session.gameSessionId;
      this.syncReadyCarouselIndex();
      this.rebuildDashboardMetrics();
      this.triggerDoorAnimation();
    }, 3000);
  }

  private restartReadyCarouselAutoPlay(): void {
    this.stopReadyCarouselAutoPlay();
    this.startReadyCarouselAutoPlay();
  }

  private stopReadyCarouselAutoPlay(): void {
    if (this.readyCarouselTimer) {
      clearInterval(this.readyCarouselTimer);
      this.readyCarouselTimer = null;
    }

    if (this.readyCarouselAnimationTimer) {
      clearTimeout(this.readyCarouselAnimationTimer);
      this.readyCarouselAnimationTimer = null;
    }
  }

  private triggerDoorAnimation(): void {
    this.isCarouselAnimating = false;

    if (this.readyCarouselAnimationTimer) {
      clearTimeout(this.readyCarouselAnimationTimer);
    }

    this.readyCarouselAnimationTimer = setTimeout(() => {
      this.isCarouselAnimating = true;

      this.readyCarouselAnimationTimer = setTimeout(() => {
        this.isCarouselAnimating = false;
        this.readyCarouselAnimationTimer = null;
      }, 760);
    }, 10);
  }
}
