import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonInput,
  IonTextarea,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonLoading,
  IonAlert,
  IonToggle,
  IonIcon,
  IonToolbar,
  IonButtons,
  IonTitle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, closeOutline, addOutline, calendarOutline } from 'ionicons/icons';
import { GamesService } from './services/games.service';
import { CreateGameRequest, Game } from './models/games.model';
import { GameListComponent } from './game-list/game-list.component';

@Component({
  selector: 'app-games-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonButton,
    IonInput,
    IonTextarea,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonLoading,
    IonAlert,
    IonToggle,
    IonIcon,
    IonToolbar,
    IonButtons,
    IonTitle,
    GameListComponent,
  ],
  templateUrl: './games-admin.page.html',
  styleUrls: ['./games-admin.page.scss'],
})
export class GamesAdminPage implements OnInit {
  gameForm!: FormGroup;
  isLoading = false;
  showAlert = false;
  alertMessage = '';
  alertTitle = '';
  isSuccess = false;

  // Mock game types - replace with actual API call if needed
  gameTypes = [
    { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', name: 'Action' },
    { id: '3fa85f64-5717-4562-b3fc-2c963f66afa7', name: 'Strategy' },
    { id: '3fa85f64-5717-4562-b3fc-2c963f66afa8', name: 'Puzzle' },
  ];

  showForm = false;

  constructor(
    private formBuilder: FormBuilder,
    private gamesService: GamesService,
    private router: Router
  ) {
    addIcons({
      'checkmark-outline': checkmarkOutline,
      'close-outline': closeOutline,
      'add-outline': addOutline,
      'calendar-outline': calendarOutline,
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  goToAddSession(): void {
    this.router.navigate(['/games/admin/add-session']);
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.gameForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      gameTypeId: ['', Validators.required],
      entryCostPoints: [0, [Validators.required, Validators.min(0)]],
      durationMinutes: [0, [Validators.required, Validators.min(1)]],
      minPlayers: [1, [Validators.required, Validators.min(1)]],
      maxPlayers: [10, [Validators.required, Validators.min(1)]],
      rewardPercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      isActive: [true, Validators.required],
    });
  }

  onSubmit(): void {
    if (this.gameForm.invalid) {
      this.showErrorAlert('Validation Error', 'Please fill all required fields correctly.');
      return;
    }

    this.isLoading = true;
    const gameData: CreateGameRequest = this.gameForm.getRawValue();

    this.gamesService.createGame(gameData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.showSuccessAlert('Success', `Game created successfully! ID: ${response.data}`);
          this.gameForm.reset({
            isActive: true,
            minPlayers: 1,
            maxPlayers: 10,
            entryCostPoints: 0,
            durationMinutes: 0,
            rewardPercentage: 0,
          });
        } else {
          this.showErrorAlert('Error', response.message || 'Failed to create game');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error creating game:', error);
        this.showErrorAlert('API Error', error.error?.message || 'An error occurred while creating the game.');
      },
    });
  }

  resetForm(): void {
    this.gameForm.reset({
      isActive: true,
      minPlayers: 1,
      maxPlayers: 10,
      entryCostPoints: 0,
      durationMinutes: 0,
      rewardPercentage: 0,
    });
  }

  private showSuccessAlert(title: string, message: string): void {
    this.alertTitle = title;
    this.alertMessage = message;
    this.isSuccess = true;
    this.showAlert = true;
  }

  private showErrorAlert(title: string, message: string): void {
    this.alertTitle = title;
    this.alertMessage = message;
    this.isSuccess = false;
    this.showAlert = true;
  }

  closeAlert(): void {
    this.showAlert = false;
  }

  onEditGame(game: Game): void {
    // TODO: navegar a edición o pre-poblar formulario
    console.log('Editar juego:', game);
  }
}
