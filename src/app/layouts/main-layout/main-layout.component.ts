import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonMenu, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';

import { AuthService } from 'src/app/components/auth/services/auth';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { SidebarMenuComponent } from '../../shared/components/sidebar-menu/sidebar-menu.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    SidebarMenuComponent,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent implements OnInit {
  @ViewChild(IonMenu) menu!: IonMenu;
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

  toggleMenu(): void {
    if (this.menu) {
      this.menu.toggle();
    }
  }

  closeMenu(): void {
    if (this.menu) {
      this.menu.close();
    }
  }
}