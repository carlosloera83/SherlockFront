import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { IonMenu, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

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
    
    
    IonContent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  @ViewChild(IonMenu) menu!: IonMenu;
  userName = 'Jugador';
  isLandscape = false;
  isGamesRoute = false;
  isPocketRankingRoute = false;
  private readonly subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    this.updateOrientationState();
    this.updateRouteState(this.router.url);

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => {
          this.updateRouteState(event.urlAfterRedirects);
        })
    );

    window.addEventListener('resize', this.onWindowResize);

    const session = await this.authService.getSession();

    this.userName =
      session?.nickName ||
      session?.firstName ||
      session?.username ||
      'Jugador';
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    window.removeEventListener('resize', this.onWindowResize);
  }

  shouldHideLayoutChrome(): boolean {
    return this.isPocketRankingRoute || (this.isLandscape && this.isGamesRoute);
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

  private readonly onWindowResize = (): void => {
    this.updateOrientationState();
  };

  private updateOrientationState(): void {
    this.isLandscape = window.matchMedia('(orientation: landscape)').matches;
  }

  private updateRouteState(url: string): void {
    this.isGamesRoute = url.startsWith('/games');
    this.isPocketRankingRoute = url.startsWith('/games/pocket/ranking');
  }
}