import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular/standalone';
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
}

@Component({
  selector: 'app-pocket-ranking',
  standalone: true,
  template: `
    <ion-content class="ranking-content" [fullscreen]="true" [scrollY]="false" [forceOverscroll]="false">
      <section class="ranking-shell">
        <header class="ranking-header reveal-header">
          <img src="assets/Images/LogoSH.png" alt="Logo Sherlock" class="ranking-logo" />
          <span class="ranking-tag"><h1>Ranking </h1></span>
          
          
        </header>

        <section class="ranking-card reveal-card" *ngIf="isLoading">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Cargando ranking...</p>
        </section>

        <section class="ranking-card reveal-card" *ngIf="!isLoading && errorMessage && rankingPlayers.length === 0">
          <p>{{ errorMessage }}</p>
          <small>Puedes entrar al juego desde el boton inferior.</small>
        </section>

        <section class="ranking-card reveal-card" *ngIf="!isLoading && rankingPlayers.length > 0">
          <article
            class="ranking-row"
            *ngFor="let player of rankingPlayers; let rowIndex = index; trackBy: trackByPosition"
            [style.animation-delay.ms]="getRowAnimationDelay(rowIndex)"
            [class.ranking-row--current]="player.isCurrentUser">
            <div class="ranking-position">#{{ player.position }}</div>
            <div class="ranking-avatar">{{ player.avatar }}</div>
            <div class="ranking-name">{{ player.name }}</div>
            <div class="ranking-points">{{ player.points }} pts</div>
          </article>
        </section>

        <footer class="ranking-actions">
          <ion-button expand="block" class="enter-button" (click)="continueNow()">
            Entrar al juego
          </ion-button>
        </footer>
      </section>
    </ion-content>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .ranking-content {
        --background: url('/assets/Images/principal/BackGround.png') center top / 100% 100% no-repeat;
      }

      .ranking-shell {
        min-height: 100%;
        padding: 1.5rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        color: #edf2ff;
      }

      .ranking-header {
        text-align: center;
      }

      .ranking-logo {
        width: clamp(96px, 22vw, 112px);
        height: clamp(96px, 22vw, 112px);
        display: block;
        margin: 0 auto 0.6rem;
        object-fit: contain;
        border-radius: 22px;
        padding: 4px;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(212, 175, 55, 0.35);
        box-shadow:
          0 0 0 1px rgba(0, 0, 0, 0.35),
          0 8px 22px rgba(0, 0, 0, 0.35),
          0 0 24px rgba(212, 175, 55, 0.12);
      }

      .reveal-header {
        animation: rise-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }

      .ranking-tag {
        display: inline-flex;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        background: rgba(255, 204, 0, 0.18);
        color: #ffd451;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-size: 0.74rem;
      }

      .ranking-header h1 {
        margin: 0.75rem 0 0.35rem;
        font-size: clamp(1.45rem, 4.8vw, 2rem);
        font-weight: 800;
      }

      .ranking-header p {
        margin: 0;
        color: #c7d4f3;
      }

      .ranking-card {
        width: min(100%, 720px);
        margin: 0 auto;
        border-radius: 1.2rem;
        border: 1px solid rgba(255, 211, 77, 0.38);
        background: rgba(0, 0, 0, 0.62);
        box-shadow: 0 18px 34px rgba(1, 7, 20, 0.5);
        backdrop-filter: blur(6px);
        padding: 0.95rem;
      }

      .reveal-card {
        animation: rise-in 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
        animation-delay: 100ms;
      }

      .ranking-card ion-spinner,
      .ranking-card p,
      .ranking-card small {
        display: block;
        text-align: center;
      }

      .ranking-card p {
        margin: 0.55rem 0 0;
      }

      .ranking-card small {
        margin-top: 0.4rem;
        color: #aac0ea;
      }

      .ranking-row {
        display: grid;
        grid-template-columns: auto auto 1fr auto;
        align-items: center;
        gap: 0.7rem;
        padding: 0.65rem;
        border-radius: 0.8rem;
        border: 1px solid rgba(30, 255, 168, 0.55);
        background: linear-gradient(130deg, rgba(3, 19, 15, 0.84), rgba(8, 12, 16, 0.84));
        box-shadow: 0 0 0 1px rgba(30, 255, 168, 0.14), 0 10px 22px rgba(0, 0, 0, 0.3);
        opacity: 0;
        transform: translateY(8px) scale(0.985);
        animation: row-reveal 460ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      }

      .ranking-row + .ranking-row {
        margin-top: 0.55rem;
      }

      .ranking-row--current {
        border: 1px solid rgba(255, 69, 206, 0.85);
        box-shadow: 0 0 0 1px rgba(255, 69, 206, 0.22), 0 0 18px rgba(255, 69, 206, 0.3), 0 10px 22px rgba(0, 0, 0, 0.28);
      }

      .ranking-position {
        font-weight: 800;
        color: #28ffd0;
        min-width: 2.5rem;
        text-shadow: 0 0 10px rgba(40, 255, 208, 0.36);
      }

      .ranking-avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(0, 255, 245, 0.45);
        font-weight: 700;
        font-size: 0.76rem;
      }

      .ranking-name {
        font-weight: 700;
      }

      .ranking-points {
        color: #f9ff54;
        font-weight: 700;
        text-shadow: 0 0 10px rgba(249, 255, 84, 0.35);
      }

      @keyframes rise-in {
        0% {
          opacity: 0;
          transform: translateY(12px) scale(0.99);
        }

        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes row-reveal {
        0% {
          opacity: 0;
          transform: translateY(8px) scale(0.985);
        }

        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .reveal-header,
        .reveal-card,
        .ranking-row {
          animation: none !important;
          opacity: 1;
          transform: none;
        }
      }

      .ranking-actions {
        width: min(100%, 720px);
        margin: auto auto 0;
      }

      .enter-button {
        --background: linear-gradient(120deg, #ffcf2d 0%, #ffb802 100%);
        --background-hover: linear-gradient(120deg, #ffd651 0%, #ffbe1f 100%);
        --color: #111d36;
        --border-radius: 0.9rem;
        font-weight: 800;
        text-transform: none;
      }

      @media (max-width: 640px) {
        .ranking-shell {
          padding: 1rem 0.75rem;
        }

        .ranking-row {
          grid-template-columns: auto auto 1fr;
        }

        .ranking-points {
          grid-column: 3;
          justify-self: end;
        }
      }
    `,
  ],
  imports: [CommonModule, IonContent, IonSpinner, IonButton],
})
export class PocketRankingComponent implements OnInit, OnDestroy {
  rankingPlayers: RankingPlayer[] = [];
  isLoading = true;
  errorMessage: string | null = null;

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
  ) {}

  async ngOnInit(): Promise<void> {
    this.registerOrientationGuards();
    await this.ensurePortraitLock();

    this.gameSessionId = (this.route.snapshot.queryParamMap.get('gameSessionId') ?? '').toUpperCase();
    this.nextRoute = this.route.snapshot.queryParamMap.get('gameRoute') || '/games/pocket';
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

  private async loadRanking(): Promise<void> {
    if (!this.currentUser || !this.gameSessionId) {
      return;
    }

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
    if (this.isNavigating) {
      return;
    }

    this.isNavigating = true;

    try {
      if (!this.gameSessionId) {
        await this.router.navigate(['/games']);
        return;
      }

      await this.router.navigate([this.nextRoute], {
        queryParams: {
          gameSessionId: this.gameSessionId,
        },
      });
    } finally {
      this.isNavigating = false;
    }
  }

  private async ensurePortraitLock(): Promise<void> {
    this.clearOrientationRetries();
    await this.forcePortraitOrientation();

    // Retry lock to handle devices that ignore the first orientation request.
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
        if (!document.hidden) {
          void this.ensurePortraitLock();
        }
      };

      document.addEventListener('visibilitychange', this.visibilityOrientationHandler);
    }

    if (!this.focusOrientationHandler) {
      this.focusOrientationHandler = () => {
        void this.ensurePortraitLock();
      };

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
        if (orientationApi?.lock) {
          await orientationApi.lock('portrait');
        }
      }

      this.orientationLocked = true;
    } catch (error) {
      this.orientationLocked = false;
      console.warn('No se pudo bloquear orientacion vertical en ranking Pocket.', error);
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
      console.warn('No se pudo liberar orientacion en ranking Pocket.', error);
    } finally {
      this.orientationLocked = false;
    }
  }
}
