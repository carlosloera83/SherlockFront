import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonBadge,
  IonIcon,
  IonButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  peopleOutline,
  trophyOutline,
  cashOutline,
  checkmarkCircle,
  closeCircle,
  refreshOutline,
  createOutline,
} from 'ionicons/icons';
import { GamesService } from '../services/games.service';
import { Game } from '../models/games.model';
import { AuthService } from 'src/app/components/auth/services/auth';

@Component({
  selector: 'app-game-list',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonBadge,
    IonIcon,
    IonButton,
    IonSpinner,
  ],
  templateUrl: './game-list.component.html',
  styleUrls: ['./game-list.component.scss'],
})
export class GameListComponent implements OnInit {
  @Output() editGame = new EventEmitter<Game>();
  games: Game[] = [];
  isLoading = false;
  errorMessage = '';
  private userId = '';

  constructor(
    private gamesService: GamesService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({
      'time-outline': timeOutline,
      'people-outline': peopleOutline,
      'trophy-outline': trophyOutline,
      'cash-outline': cashOutline,
      'checkmark-circle': checkmarkCircle,
      'close-circle': closeCircle,
      'refresh-outline': refreshOutline,
      'create-outline': createOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const session = await this.authService.getSession();
    if (!session) {
      this.errorMessage = 'No se encontró sesión de usuario.';
      return;
    }
    this.userId = session.userId;
    this.loadGames();
  }

  loadGames(event?: any): void {
    if (!this.userId) {
      event?.target?.complete();
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';

    this.gamesService.getGames(this.userId).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.success) {
          this.games = response.data;
          
          if (this.games.length === 0) {
            this.errorMessage = 'No se encontraron juegos para este usuario.';
          }
        } else {
          this.errorMessage = response.message || 'Error al cargar juegos';
        }
        this.cdr.detectChanges();
        event?.target?.complete();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Error de conexión al cargar juegos';
        this.cdr.detectChanges();
        event?.target?.complete();
      },
    });
  }

  onEdit(game: Game): void {
    this.editGame.emit(game);
  }
}
