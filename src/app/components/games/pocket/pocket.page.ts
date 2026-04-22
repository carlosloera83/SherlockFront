import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { PocketQuestion, PocketQuestionOption } from './class/IPocket';
import { PocketService } from './services/pocket';

const DEFAULT_GAME_SESSION_ID = 'DA0E239A-D9D4-45B9-92A4-FC6B1B69B2A0';

@Component({
  selector: 'app-pocket',
  standalone: true,
  templateUrl: './pocket.page.html',
  styleUrls: ['./pocket.page.scss'],
  imports: [CommonModule, IonContent, IonSpinner],
})
export class PocketPage implements OnInit, OnDestroy {
  readonly totalQuestionSeconds = 15;
  questions: PocketQuestion[] = [];
  options: PocketQuestionOption[] = [];
  activeQuestion: PocketQuestion | null = null;
  activeIndex = 0;
  timeLeft = this.totalQuestionSeconds;
  totalPoints = 0;
  streak = 0;
  isLoading = true;
  isLoadingOptions = false;
  isGameFinished = false;
  errorMessage: string | null = null;

  private selectedOptionByQuestionId: Record<string, string> = {};
  private timerHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private pocketService: PocketService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const gameSessionId = this.route.snapshot.queryParamMap.get('gameSessionId') ?? DEFAULT_GAME_SESSION_ID;
    this.loadQuestions(gameSessionId.toUpperCase());
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private loadQuestions(gameSessionId: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.isGameFinished = false;
    this.totalPoints = 0;
    this.streak = 0;
    this.timeLeft = this.totalQuestionSeconds;
    this.selectedOptionByQuestionId = {};

    this.pocketService.getQuestions(gameSessionId).subscribe({
      next: (response) => {
        if (!response.success) {
          this.errorMessage = response.message;
          this.isLoading = false;
          return;
        }

        this.questions = [...response.data].sort((a, b) => a.questionOrder - b.questionOrder);

        if (this.questions.length === 0) {
          this.activeQuestion = null;
          this.isLoading = false;
          return;
        }

        this.activeIndex = 0;
        this.activeQuestion = this.questions[0];
        this.loadOptionsForActiveQuestion();
        this.startTimer();
      },
      error: () => {
        this.errorMessage = 'No fue posible cargar las preguntas de Pocket.';
        this.isLoading = false;
      },
    });
  }

  private loadOptionsForActiveQuestion(): void {
    if (!this.activeQuestion) {
      this.options = [];
      this.isLoading = false;
      return;
    }

    this.isLoadingOptions = true;
    this.errorMessage = null;

    this.pocketService.getQuestionOptions(this.activeQuestion.gameQuestionId).subscribe({
      next: (response) => {
        if (!response.success) {
          this.errorMessage = response.message;
          this.options = [];
          this.isLoadingOptions = false;
          this.isLoading = false;
          return;
        }

        this.options = [...response.data].sort((a, b) => a.displayOrder - b.displayOrder);
        this.isLoadingOptions = false;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No fue posible cargar las respuestas de la pregunta.';
        this.options = [];
        this.isLoadingOptions = false;
        this.isLoading = false;
      },
    });
  }

  selectOption(optionId: string): void {
    if (!this.activeQuestion || this.isLoadingOptions || this.isGameFinished) {
      return;
    }

    const questionId = this.activeQuestion.gameQuestionId;
    if (this.selectedOptionByQuestionId[questionId]) {
      return;
    }

    this.selectedOptionByQuestionId[questionId] = optionId;
    this.totalPoints += this.activeQuestion.points;
    this.streak += 1;

    if (this.activeIndex >= this.questions.length - 1) {
      this.isGameFinished = true;
      this.clearTimer();
      return;
    }

    this.activeIndex += 1;
    this.activeQuestion = this.questions[this.activeIndex];
    this.timeLeft = this.totalQuestionSeconds;
    this.options = [];
    this.loadOptionsForActiveQuestion();
  }

  isOptionSelected(optionId: string): boolean {
    if (!this.activeQuestion) {
      return false;
    }

    const selected = this.selectedOptionByQuestionId[this.activeQuestion.gameQuestionId];
    return selected === optionId;
  }

  hasAnsweredCurrentQuestion(): boolean {
    if (!this.activeQuestion) {
      return false;
    }

    return !!this.selectedOptionByQuestionId[this.activeQuestion.gameQuestionId];
  }

  getTimerProgress(): number {
    return (this.timeLeft / this.totalQuestionSeconds) * 100;
  }

  getProgressStepClass(index: number): string {
    if (index < this.activeIndex) {
      return 'progress-step progress-step--done';
    }

    if (index === this.activeIndex) {
      return 'progress-step progress-step--active';
    }

    return 'progress-step';
  }

  private startTimer(): void {
    this.clearTimer();

    this.timerHandle = setInterval(() => {
      if (this.isGameFinished || this.isLoading) {
        return;
      }

      if (this.timeLeft > 0) {
        this.timeLeft -= 1;
        return;
      }

      // Simulacion visual: al terminar, vuelve a iniciar sin cambiar de pregunta.
      this.timeLeft = this.totalQuestionSeconds;
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
