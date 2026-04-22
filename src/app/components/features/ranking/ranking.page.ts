import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-ranking',
  standalone: true,
  templateUrl: './ranking.page.html',
  styleUrls: ['./ranking.page.scss'],
  imports: [CommonModule, IonContent],
})
export class RankingPage {}
