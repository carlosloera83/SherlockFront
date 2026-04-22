import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from '../../components/auth/services/auth';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent implements OnInit {
  userName = 'Jugador';

  constructor(private authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    const session = await this.authService.getSession();

    this.userName =
      session?.nickName ||
      session?.firstName ||
      session?.username ||
      'Jugador';
  }
}