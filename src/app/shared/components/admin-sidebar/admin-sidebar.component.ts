import { Component, Input, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  albumsOutline,
  calendarOutline,
  chevronBackOutline,
  chevronForwardOutline,
  gameControllerOutline,
  logOutOutline,
  menuOutline,
  peopleOutline,
  shieldOutline,
} from 'ionicons/icons';
import { filter } from 'rxjs/operators';
import { AuthService } from 'src/app/components/auth/services/auth';

interface NavChild {
  label: string;
  route: string;
  icon: string;
}

interface NavItem {
  label: string;
  icon: string;
  open: boolean;
  children: NavChild[];
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IonIcon],
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.scss'],
})
export class AdminSidebarComponent implements OnInit {
  @Input() userName = 'Admin';

  collapsed = signal(false);

  menuItems: NavItem[] = [
    {
      label: 'Games',
      icon: 'game-controller-outline',
      open: true,
      children: [
        { label: 'Games', route: '/games/admin', icon: 'game-controller-outline' },
      ],
    },
    {
      label: 'Catálogos',
      icon: 'albums-outline',
      open: false,
      children: [
        { label: 'Temporadas', route: '/admin/catalogos/temporadas', icon: 'calendar-outline' },
      ],
    },
    {
      label: 'Seguridad',
      icon: 'shield-outline',
      open: false,
      children: [
        { label: 'Usuarios', route: '/admin/seguridad/usuarios', icon: 'people-outline' },
      ],
    },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    addIcons({
      albumsOutline, calendarOutline, chevronBackOutline, chevronForwardOutline,
      gameControllerOutline, logOutOutline, menuOutline, peopleOutline, shieldOutline,
    });
  }

  ngOnInit(): void {
    this.expandActiveSection(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.expandActiveSection(e.urlAfterRedirects));
  }

  get userInitials(): string {
    return this.userName
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
    if (this.collapsed()) {
      this.menuItems.forEach(i => (i.open = false));
    }
  }

  toggleSection(item: NavItem): void {
    if (this.collapsed()) {
      this.collapsed.set(false);
      setTimeout(() => (item.open = true), 30);
      return;
    }
    item.open = !item.open;
  }

  async logout(): Promise<void> {
    await this.authService.clearSession();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private expandActiveSection(url: string): void {
    this.menuItems.forEach(item => {
      if (item.children.some(c => url.startsWith(c.route))) {
        item.open = true;
      }
    });
  }
}
