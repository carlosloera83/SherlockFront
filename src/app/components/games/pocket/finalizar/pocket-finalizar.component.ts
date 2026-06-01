import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { firstValueFrom, timeout } from 'rxjs';
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
  selector: 'app-pocket-finalizar',
  standalone: true,
  templateUrl: './pocket-finalizar.component.html',
  styleUrls: ['./pocket-finalizar.component.scss'],
  imports: [CommonModule, IonContent, IonSpinner, IonButton],
})
export class PocketFinalizarComponent implements OnInit {
  isLoading = true;
  errorMessage: string | null = null;

  sessionTitle = 'Modo Pocket';
  finalScore = 0;
  rankingPlayers: RankingPlayer[] = [];
  currentUserPosition: number | null = null;

  private gameSessionId = '';
  private userId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly pocketService: PocketService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.gameSessionId = (this.route.snapshot.queryParamMap.get('gameSessionId') ?? '').toUpperCase();
    this.sessionTitle = this.route.snapshot.queryParamMap.get('sessionName') ?? 'Modo Pocket';

    const scoreParam = this.route.snapshot.queryParamMap.get('score');
    this.finalScore = scoreParam ? Number(scoreParam) : 0;

    if (!this.gameSessionId) {
      this.errorMessage = 'No se encontro la partida para mostrar resultados.';
      this.isLoading = false;
      return;
    }

    const session = await this.authService.getSession();
    if (!session) {
      this.errorMessage = 'No se encontro la sesion del usuario.';
      this.isLoading = false;
      return;
    }

    this.userId = session.userId.toUpperCase();
    await this.loadFinalRanking();
  }

  get supportMessage(): string {
    if (this.currentUserPosition === 1) {
      return 'Impresionante trabajo. Te llevaste el primer lugar.';
    }

    if (this.currentUserPosition && this.currentUserPosition <= 3) {
      return 'Gran partida. Estuviste entre los mejores, sigue asi.';
    }

    return 'Buen esfuerzo. Cada ronda suma experiencia para la siguiente victoria.';
  }

  get positionLabel(): string {
    if (!this.currentUserPosition) {
      return '--';
    }

    return `#${this.currentUserPosition}`;
  }

  get gemsCount(): number {
    return Math.floor(this.finalScore / 10);
  }

  trackByPosition(_: number, player: RankingPlayer): number {
    return player.position;
  }

  goToGames(): void {
    void this.router.navigate(['/games']);
  }

  async shareResults(): Promise<void> {
    const shareText = `Terminé Pocket con ${this.finalScore} pts, puesto ${this.positionLabel} y ${this.gemsCount} gemas.`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Resultado final Pocket',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        return;
      }
    }

    await navigator.clipboard?.writeText(`${shareText} ${shareUrl}`).catch(() => {
      // If clipboard is unavailable, keep the action silent.
    });
  }

  private async loadFinalRanking(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const response = await firstValueFrom(
        this.pocketService.getRanking(this.gameSessionId, this.userId).pipe(timeout(12000))
      );

      if (!response.success) {
        this.errorMessage = response.message || 'No fue posible cargar el ranking final.';
        this.rankingPlayers = [];
        return;
      }

      const entries = Array.isArray(response.data) ? response.data : [];
      this.rankingPlayers = this.mapRankingEntries(entries);

      const currentPlayer = entries.find((entry) => entry.isCurrentUser || entry.userId.toUpperCase() === this.userId);
      this.currentUserPosition = currentPlayer?.position ?? null;

      if (this.rankingPlayers.length === 0) {
        this.errorMessage = 'No hay resultados disponibles todavia.';
      }
    } catch {
      this.errorMessage = 'No fue posible cargar el ranking final.';
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
}
