import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { GamesService } from '../services/games';
import { AuthService } from '../../auth/services/auth';
import { ActiveGameSession } from '../class/IGames';

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
export class GamesPage implements OnInit {
  games: GameCard[] = [];
  isLoading = true;
  errorMessage: string | null = null;

  constructor(
    private gamesService: GamesService,
    private authService: AuthService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const session = await this.authService.getSession();
    if (!session) {
      this.isLoading = false;
      this.errorMessage = 'No se encontró sesión de usuario.';
      return;
    }
    this.loadGames(session.userId);
  }

  private loadGames(userId: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.gamesService.getActiveGameSessions(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.games = response.data.map((s) => this.mapSessionToCard(s));
        } else {
          this.errorMessage = response.message;
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error al cargar las partidas. Intenta de nuevo.';
        this.isLoading = false;
      },
    });
  }

  private mapSessionToCard(s: ActiveGameSession): GameCard {
    const statusTone = this.resolveStatusTone(s.gameStatusCode);
    return {
      status: s.gameStatusName.toUpperCase(),
      statusTone,
      title: s.gameName.toUpperCase(),
      subtitle: s.gameTypeName.toUpperCase(),
      players: `${s.currentPlayers}/${s.maxPlayers}`,
      energy: String(s.entryCostPoints),
      completion: `${s.rewardPercentage}%`,
      schedule: this.formatTime(s.scheduledStartTime),
      ctaGradient: STATUS_GRADIENTS[s.gameStatusCode] ?? STATUS_GRADIENTS['DEFAULT'],
      backgroundImage: TYPE_BACKGROUNDS[s.gameTypeCode] ?? TYPE_BACKGROUNDS['DEFAULT'],
      isUserInGame: s.isUserInGame,
      availableSpots: s.availableSpots,
      session: s,
    };
  }

  private resolveStatusTone(code: string): 'warning' | 'success' | 'neutral' {
    if (code === 'WAITING') return 'warning';
    if (code === 'ACTIVE') return 'success';
    return 'neutral';
  }

  private formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  openGame(session: ActiveGameSession): void {
    if (session.gameTypeCode === 'POCKET') {
      this.router.navigate(['/games/pocket'], {
        queryParams: {
          gameSessionId: session.gameSessionId,
        },
      });
    }
  }
}
