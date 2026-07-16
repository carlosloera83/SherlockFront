import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonContent, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkOutline, closeOutline, trophyOutline, peopleOutline, flashOutline,
  locationOutline, starOutline, helpCircleOutline, timeOutline,
  radioOutline, chevronForwardOutline,
} from 'ionicons/icons';
import { firstValueFrom, timeout } from 'rxjs';
import { LoginResponseData } from '../../../auth/class/ILogin';
import { AuthService } from '../../../auth/services/auth';
import { RankingEntry } from '../class/IPocket';
import { PocketService } from '../services/pocket';

interface RankingPlayer {
  position: number;
  name: string;
  points: number;
  avatar: string;
  isCurrentUser: boolean;
  correctAnswers: number;
  wrongAnswers: number;
  isFinished: boolean;
}

@Component({
  selector: 'app-pocket-ranking',
  standalone: true,
  templateUrl: './pocket-ranking.component.html',
  styleUrls: ['./pocket-ranking.component.scss'],
  imports: [CommonModule, IonContent, IonSpinner, IonButton, IonIcon],
})
export class PocketRankingComponent implements OnInit, OnDestroy {
  rankingPlayers: RankingPlayer[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  gameName = '';
  gameDesc = '';
  gameCategory = '';
  gameZone = '';
  gameMode = '';
  gameDuration = '';
  gameDifficulty = '';
  gameMaxScore = '';
  gameQuestions = 0;

  private currentUser: LoginResponseData | null = null;
  private gameSessionId = '';
  private nextRoute = '/games/pocket';
  private isNavigating = false;
  private orientationLocked = false;
  private orientationRetryHandles: ReturnType<typeof setTimeout>[] = [];
  private visibilityOrientationHandler: (() => void) | null = null;
  private focusOrientationHandler: (() => void) | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly pocketService: PocketService,
  ) {
    addIcons({
      'checkmark-outline': checkmarkOutline,
      'close-outline': closeOutline,
      'trophy-outline': trophyOutline,
      'people-outline': peopleOutline,
      'flash-outline': flashOutline,
      'location-outline': locationOutline,
      'star-outline': starOutline,
      'help-circle-outline': helpCircleOutline,
      'time-outline': timeOutline,
      'radio-outline': radioOutline,
      'chevron-forward-outline': chevronForwardOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    this.registerOrientationGuards();
    await this.ensurePortraitLock();

    const params = this.route.snapshot.queryParamMap;
    this.gameSessionId = (params.get('gameSessionId') ?? '').toUpperCase();
    this.nextRoute = params.get('gameRoute') || '/games/pocket';
    this.gameName = params.get('gameName') ?? '';
    this.gameDesc = params.get('gameDesc') ?? '';
    this.gameCategory = params.get('gameCategory') ?? '';
    this.gameZone = params.get('gameZone') ?? '';
    this.gameMode = params.get('gameMode') ?? '';
    this.gameDuration = params.get('gameDuration') ?? '';
    this.gameDifficulty = params.get('gameDifficulty') ?? '';
    this.gameMaxScore = params.get('gameMaxScore') ?? '';
    this.gameQuestions = Number(params.get('gameQuestions') ?? 0);
    this.currentUser = await this.authService.getSession();

    if (!this.gameSessionId) {
      this.errorMessage = 'No se encontro la partida seleccionada.';
      this.isLoading = false;
      return;
    }

    if (!this.currentUser) {
      this.errorMessage = 'No se encontro la sesion del usuario.';
      this.isLoading = false;
      return;
    }

    await this.loadRanking();
  }

  ngOnDestroy(): void {
    this.unregisterOrientationGuards();
    void this.releaseOrientationLock();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.ensurePortraitLock();
  }

  async ionViewDidEnter(): Promise<void> {
    await this.ensurePortraitLock();
  }

  async ionViewWillLeave(): Promise<void> {
    this.clearOrientationRetries();
    await this.releaseOrientationLock();
  }

  trackByPosition(_: number, player: RankingPlayer): number {
    return player.position;
  }

  continueNow(): void {
    void this.navigateToQuestions();
  }

  getRowAnimationDelay(index: number): number {
    return 180 + (index * 85);
  }

  getMedalEmoji(position: number): string {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '';
  }

  getPositionClass(position: number): string {
    if (position === 1) return 'pos-gold';
    if (position === 2) return 'pos-silver';
    if (position === 3) return 'pos-bronze';
    return '';
  }

  get totalPlayers(): number {
    return this.rankingPlayers.length;
  }

  get topPlayer(): RankingPlayer | null {
    return this.rankingPlayers[0] ?? null;
  }

  private async loadRanking(): Promise<void> {
    if (!this.currentUser || !this.gameSessionId) return;

    this.isLoading = true;
    this.errorMessage = null;

    try {
      const response = await firstValueFrom(
        this.pocketService.getRanking(this.gameSessionId, this.currentUser.userId).pipe(timeout(12000))
      );

      if (!response.success) {
        this.errorMessage = response.message || 'No fue posible cargar el ranking.';
        this.rankingPlayers = [];
        return;
      }

      const rankingData = Array.isArray(response.data) ? response.data : [];
      this.rankingPlayers = this.mapRankingEntries(rankingData);

      if (this.rankingPlayers.length === 0) {
        this.errorMessage = 'No hay jugadores en el ranking todavia.';
      }
    } catch {
      this.errorMessage = 'No fue posible cargar el ranking.';
      this.rankingPlayers = [];
    } finally {
      this.isLoading = false;
    }
  }

  private mapRankingEntries(entries: RankingEntry[]): RankingPlayer[] {
    return [...entries]
      .sort((a, b) => a.position - b.position)
      .map((entry) => ({
        position: entry.position,
        name: entry.playerName,
        points: entry.scorePoints,
        avatar: (entry.avatarInitial || this.getAvatarInitials(entry.playerName)).toUpperCase(),
        isCurrentUser: entry.isCurrentUser,
        correctAnswers: entry.correctAnswers ?? 0,
        wrongAnswers: entry.wrongAnswers ?? 0,
        isFinished: entry.isFinished ?? false,
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

  private async navigateToQuestions(): Promise<void> {
    if (this.isNavigating) return;
    this.isNavigating = true;

    try {
      if (!this.gameSessionId) {
        await this.router.navigate(['/games']);
        return;
      }

      await this.router.navigate([this.nextRoute], {
        queryParams: { gameSessionId: this.gameSessionId },
      });
    } finally {
      this.isNavigating = false;
    }
  }

  private async ensurePortraitLock(): Promise<void> {
    this.clearOrientationRetries();
    await this.forcePortraitOrientation();

    [200, 500, 900].forEach((delayMs) => {
      const timeoutHandle = setTimeout(() => {
        void this.forcePortraitOrientation();
      }, delayMs);
      this.orientationRetryHandles.push(timeoutHandle);
    });
  }

  private clearOrientationRetries(): void {
    this.orientationRetryHandles.forEach((handle) => clearTimeout(handle));
    this.orientationRetryHandles = [];
  }

  private registerOrientationGuards(): void {
    if (!this.visibilityOrientationHandler) {
      this.visibilityOrientationHandler = () => {
        if (!document.hidden) void this.ensurePortraitLock();
      };
      document.addEventListener('visibilitychange', this.visibilityOrientationHandler);
    }

    if (!this.focusOrientationHandler) {
      this.focusOrientationHandler = () => { void this.ensurePortraitLock(); };
      window.addEventListener('focus', this.focusOrientationHandler);
    }
  }

  private unregisterOrientationGuards(): void {
    this.clearOrientationRetries();

    if (this.visibilityOrientationHandler) {
      document.removeEventListener('visibilitychange', this.visibilityOrientationHandler);
      this.visibilityOrientationHandler = null;
    }

    if (this.focusOrientationHandler) {
      window.removeEventListener('focus', this.focusOrientationHandler);
      this.focusOrientationHandler = null;
    }
  }

  private async forcePortraitOrientation(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await ScreenOrientation.lock({ orientation: 'portrait' });
      } else {
        const orientationApi = (window.screen as Screen & { orientation?: { lock?: (type: string) => Promise<void> } }).orientation;
        if (orientationApi?.lock) await orientationApi.lock('portrait');
      }
      this.orientationLocked = true;
    } catch {
      this.orientationLocked = false;
    }
  }

  private async releaseOrientationLock(): Promise<void> {
    if (!this.orientationLocked) return;
    try {
      if (Capacitor.isNativePlatform()) {
        await ScreenOrientation.unlock();
      } else {
        const orientationApi = (window.screen as Screen & { orientation?: { unlock?: () => void } }).orientation;
        orientationApi?.unlock?.();
      }
    } finally {
      this.orientationLocked = false;
    }
  }
}
