import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { gameControllerOutline, menuOutline, homeOutline, trophyOutline, personOutline, logOutOutline, chevronForwardOutline, closeOutline } from 'ionicons/icons';
import { AuthService } from 'src/app/components/auth/services/auth';

interface MenuItem {
  title: string;
  route?: string;
  icon: string;
  children?: MenuItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonIcon,
  ],
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss'],
})
export class SidebarMenuComponent implements OnInit {
  @Input() userName: string = 'Jugador';
  @Output() menuClose = new EventEmitter<void>();

  menuItems: MenuItem[] = [
    {
      title: 'Home',
      route: '/home',
      icon: 'home-outline',
    },
    {
      title: 'Games',
      icon: 'game-controller-outline',
      children: [
        {
          title: 'Games',
          route: '/games',
          icon: 'game-controller-outline',
        },
        {
          title: 'Games Admin',
          route: '/games/admin',
          icon: 'game-controller-outline',
        },
      ],
    },
    {
      title: 'Ranking',
      route: '/ranking',
      icon: 'trophy-outline',
    },
    {
      title: 'Profile',
      route: '/profile',
      icon: 'person-outline',
    },
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({
      'home-outline': homeOutline,
      'game-controller-outline': gameControllerOutline,
      'trophy-outline': trophyOutline,
      'person-outline': personOutline,
      'log-out-outline': logOutOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'close-outline': closeOutline,
      'menu-outline': menuOutline,
    });
  }

  ngOnInit(): void {
    this.expandMenuForCurrentRoute();
  }

  toggleSubmenu(item: MenuItem): void {
    if (!item.children || item.children.length === 0) {
      return;
    }
    item.expanded = !item.expanded;
  }

  private expandMenuForCurrentRoute(): void {
    const currentUrl = this.router.url;
    this.menuItems.forEach((item) => {
      if (!item.children || item.children.length === 0) {
        return;
      }
      item.expanded = item.children.some((child) => child.route && currentUrl.startsWith(child.route));
    });
  }

  onCloseMenu(): void {
    this.menuClose.emit();
  }

  onMenuItemClick(): void {
    // Close menu after navigation
    setTimeout(() => {
      this.menuClose.emit();
    }, 100);
  }

  async onLogout(): Promise<void> {
    await this.authService.clearSession();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
    this.menuClose.emit();
  }
}
