import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { compassOutline, eyeOutline, locationOutline, mapOutline, navigateOutline, searchOutline } from 'ionicons/icons';
import { AuthService } from '../../auth/services/auth';

 

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [CommonModule, IonContent, IonIcon],
})
export class HomePage implements OnInit {
  userName = '';

  constructor(private authService: AuthService) {
    addIcons({
      'eye-outline': eyeOutline,
      'search-outline': searchOutline,
      'location-outline': locationOutline,
      'map-outline': mapOutline,
      'compass-outline': compassOutline,
      'navigate-outline': navigateOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const session = await this.authService.getSession();
    this.userName = session?.nickName || session?.firstName || 'Jugador';
  }
}