import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { accessibilityOutline, arrowUndoOutline, menuOutline } from 'ionicons/icons';
import {
  IonAvatar,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  IonToolbar, IonIcon } from '@ionic/angular/standalone';
import { AuthService } from 'src/app/components/auth/services/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IonIcon, 
    CommonModule,
    IonHeader,
    IonToolbar,
    IonAvatar,
    IonPopover,
    IonList,
    IonItem,
    IonLabel,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  @Input() title = 'SHERLOCK';
  @Input() userName = 'Jugador';
  @Input() profileImage = 'assets/images/default-avatar.png';
  @Input() logo = 'assets/icon/favicon.png';
  @Output() menuClick = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({
      'accessibility-outline': accessibilityOutline,
      'arrow-undo-outline': arrowUndoOutline,
      'menu-outline': menuOutline,
    });
  }

  onMenuClick(): void {
    this.menuClick.emit();
  }

  async logout(): Promise<void> {
    await this.authService.clearSession();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}