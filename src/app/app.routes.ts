import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/auth/register/register.page').then( m => m.RegisterPage)
  },
   {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./components/home/home/home.page').then(m => m.HomePage),
      },
      {
        path: 'games',
        loadComponent: () =>
          import('./components/games/games/games.page').then(m => m.GamesPage),
      },
      {
        path: 'games/pocket',
        loadComponent: () =>
          import('./components/games/pocket/pocket.page').then(m => m.PocketPage),
      },
      {
        path: 'games/admin',
        loadComponent: () =>
          import('./components/games/games-admin/games-admin.page').then(m => m.GamesAdminPage),
      },
      {
        path: 'games/admin/add-session',
        loadComponent: () =>
          import('./components/games/add/game-add-session/game-add-session.page').then(m => m.GameAddSessionPage),
      },
      {
        path: 'ranking',
        loadComponent: () =>
          import('./components/features/ranking/ranking.page').then(m => m.RankingPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./components/features/profile/profile.page').then(m => m.ProfilePage),
      },
    ],
  },
];
