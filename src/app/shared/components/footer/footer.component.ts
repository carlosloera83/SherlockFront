import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  gameControllerOutline,
  homeOutline,
  personOutline,
  trophyOutline,
} from 'ionicons/icons';
import {
  IonFooter,
  IonIcon,
  IonTabBar,
  IonTabButton,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonFooter,
    IonTabBar,
    IonTabButton,
    IonIcon,
  ],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {
  constructor() {
    addIcons({
      homeOutline,
      gameControllerOutline,
      trophyOutline,
      personOutline,
    });
  }
}