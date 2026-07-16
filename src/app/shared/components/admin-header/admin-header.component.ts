import { Component, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDownOutline, logOutOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { filter } from 'rxjs/operators';
import { AuthService } from 'src/app/components/auth/services/auth';

interface NavChild {
  label: string;
  route: string;
}

interface NavItem {
  label: string;
  open: boolean;
  children: NavChild[];
}

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [RouterLink, IonIcon],
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.scss'],
})
export class AdminHeaderComponent implements OnInit {
  @Input() userName = 'Admin';

  get userInitials(): string {
    return this.userName
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  menuItems: NavItem[] = [
    {
      label: 'Games',
      open: false,
      children: [{ label: 'Games', route: '/games/admin' }],
    },
    {
      label: 'Catálogos',
      open: false,
      children: [{ label: 'Temporadas', route: '/admin/catalogos/temporadas' }],
    },
    {
      label: 'Seguridad',
      open: false,
      children: [{ label: 'Usuarios', route: '/admin/seguridad/usuarios' }],
    },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef,
  ) {
    addIcons({ chevronDownOutline, logOutOutline, shieldCheckmarkOutline });
  }

  ngOnInit(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.closeAll());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!(this.elementRef.nativeElement as HTMLElement).contains(event.target as Node)) {
      this.closeAll();
    }
  }

  toggleMenu(item: NavItem): void {
    const wasOpen = item.open;
    this.closeAll();
    item.open = !wasOpen;
  }

  closeAll(): void {
    this.menuItems.forEach(i => (i.open = false));
  }

  async logout(): Promise<void> {
    await this.authService.clearSession();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
