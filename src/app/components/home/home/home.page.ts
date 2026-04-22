import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonContent, IonHeader, IonToolbar, IonTitle } from '@ionic/angular/standalone';
import { AuthService } from '../../auth/services/auth';

 

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [IonTitle, IonToolbar, IonHeader, CommonModule, IonContent],
})
export class HomePage implements OnInit {
  userName = '';

  constructor(private authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    const session = await this.authService.getSession();
    this.userName = session?.nickName || session?.firstName || 'Jugador';
  }
}