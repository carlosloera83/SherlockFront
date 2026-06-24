import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { Preferences } from '@capacitor/preferences';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  diamondOutline,
  flashOutline,
  medalOutline,
  mailOutline,
  personCircleOutline,
  shieldOutline,
  starOutline,
  timeOutline,
  trophyOutline,
} from 'ionicons/icons';
import { ProfileService } from './services/profile.service';
import { UserProfile } from './interfaces/profile.interface';
import { STORAGE_KEYS } from 'src/app/core/constants/storage.keys';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [CommonModule, IonContent, IonSpinner],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProfilePage implements OnInit {
  userProfile: UserProfile | null = null;
  loading = true;
  error: string | null = null;
  avatarPath = 'assets/Images/avatares/';

  constructor(private profileService: ProfileService) {
    addIcons({
      'calendar-outline': calendarOutline,
      'diamond-outline': diamondOutline,
      'flash-outline': flashOutline,
      'medal-outline': medalOutline,
      'mail-outline': mailOutline,
      'person-circle-outline': personCircleOutline,
      'shield-outline': shieldOutline,
      'star-outline': starOutline,
      'time-outline': timeOutline,
      'trophy-outline': trophyOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const userId = await this.getUserIdFromStorage();
      if (!userId) {
        this.error = 'No se encontró el ID del usuario';
        this.loading = false;
        return;
      }

      this.profileService.getUserProfile(userId).subscribe({
        next: (response) => {
          if (response.success) {
            this.userProfile = response.data;
            console.log('User profile loaded:', this.userProfile.gems);
            console.log('User profile loaded:', this.userProfile); 
          } else {
            this.error = response.message || 'Error al cargar el perfil';
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading profile:', err);
          this.error = 'Error al cargar el perfil';
          this.loading = false;
        },
      });
    } catch (err) {
      console.error('Error:', err);
      this.error = 'Error al obtener el ID del usuario';
      this.loading = false;
    }
  }

  private async getUserIdFromStorage(): Promise<string | null> {
    try {
      // Intenta con Preferences de Capacitor
      const result = await Preferences.get({
        key: STORAGE_KEYS.userSession,
      });

      console.log('Session from Preferences:', result.value);

      if (result.value) {
        const session = JSON.parse(result.value);
        console.log('Parsed session:', session);
        return session.id || session.userId || null;
      }

      // Si no encuentra en Preferences, intenta directamente en localStorage
      const localStorageValue = localStorage.getItem(STORAGE_KEYS.userSession);
      console.log('Session from localStorage:', localStorageValue);
      
      if (localStorageValue) {
        const session = JSON.parse(localStorageValue);
        console.log('Parsed localStorage session:', session);
        return session.id || session.userId || null;
      }

      return null;
    } catch (error) {
      console.error('Error getting user ID from storage:', error);
      return null;
    }
  }

  getAvatarImageUrl(): string {
    if (this.userProfile?.profileImageUrl) {
      return this.userProfile.profileImageUrl;
    }

    if (this.userProfile?.pathAvatar) {
      return `${this.avatarPath}${this.userProfile.pathAvatar}`;
    }

    return `${this.avatarPath}default-avatar.png`;
  }

  get displayPoints(): number {
    return this.userProfile?.points ?? 0;
  }

  get displayGems(): number {
    return this.userProfile?.gems ?? 0;
  }

  get displayLevel(): number {
    return Math.max(1, Math.round(this.displayPoints / 300));
  }

  get levelTierLabel(): string {
    if (this.displayPoints >= 10000) {
      return 'Oro';
    }

    if (this.displayPoints >= 5000) {
      return 'Plata';
    }

    return 'Bronce';
  }

  get worldRanking(): number {
    return Math.max(1, 100000 - this.displayPoints * 3);
  }

  get nationalRanking(): number {
    return Math.max(1, 5000 - this.displayPoints);
  }

  get memberSinceLabel(): string {
    if (!this.userProfile?.createdAt) {
      return '--';
    }

    return new Date(this.userProfile.createdAt).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
