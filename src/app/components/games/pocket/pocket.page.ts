import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { PocketQuestion, PocketQuestionOption } from './class/IPocket';
import { PocketService } from './services/pocket';
import { AuthService } from '../../auth/services/auth';

const DEFAULT_GAME_SESSION_ID = 'DA0E239A-D9D4-45B9-92A4-FC6B1B69B2A0';
const DEFAULT_REDIRECT_SECONDS = 15;

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
  redirectSecondsLeft = 0;
  private gameSessionId = '';
  private userId = '';

  private selectedOptionByQuestionId: Record<string, string> = {};
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private redirectHandle: ReturnType<typeof setTimeout> | null = null;
  private redirectCountdownHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private pocketService: PocketService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const session = await this.authService.getSession();
    if (!session) {
      this.errorMessage = 'No se encontro la sesion del usuario.';
      this.isLoading = false;
      return;
    }

    this.userId = session.userId.toUpperCase();
    const gameSessionId = this.route.snapshot.queryParamMap.get('gameSessionId') ?? DEFAULT_GAME_SESSION_ID;
    this.gameSessionId = gameSessionId.toUpperCase();
    this.loadQuestions(this.gameSessionId);
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.clearRedirectTimers();
  }

  private loadQuestions(gameSessionId: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.isGameFinished = false;
    this.totalPoints = 0;
    this.streak = 0;
    this.redirectSecondsLeft = 0;
    this.timeLeft = this.totalQuestionSeconds;
    this.selectedOptionByQuestionId = {};
    this.clearRedirectTimers();

    this.pocketService.getQuestions(gameSessionId, this.userId).subscribe({
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
      error: (error) => {
        console.error('Error loading questions for Pocket game session:', error);
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
    if (!this.activeQuestion || this.isLoadingOptions || this.isGameFinished || !this.gameSessionId || !this.userId) {
      return;
    }

    const question = this.activeQuestion;
    const questionId = question.gameQuestionId;
    if (this.selectedOptionByQuestionId[questionId]) {
      return;
    }

    this.selectedOptionByQuestionId[questionId] = optionId;
    this.isLoadingOptions = true;

    this.pocketService.submitAnswer({
      gameSessionId: this.gameSessionId,
      userId: this.userId,
      gameQuestionId: questionId,
      selectedOptions: [optionId],
    }).subscribe({
      next: (response) => {
        this.isLoadingOptions = false;

        if (!response.success || !response.data) {
          this.errorMessage = response.message || 'No fue posible enviar la respuesta.';
          delete this.selectedOptionByQuestionId[questionId];
          return;
        }

        this.errorMessage = null;
        this.totalPoints = response.data.totalScore;
        this.streak = response.data.isCorrect ? this.streak + 1 : 0;

        if (response.data.isGameFinished) {
          this.finishGame(response.data.totalScore);
          return;
        }

        const nextQuestionId = response.data.nextQuestionId;
        let nextIndex = -1;

        if (nextQuestionId) {
          nextIndex = this.questions.findIndex((item) => item.gameQuestionId === nextQuestionId);
        }

        if (nextIndex === -1 && this.activeIndex < this.questions.length - 1) {
          nextIndex = this.activeIndex + 1;
        }

        if (nextIndex === -1) {
          this.finishGame(response.data.totalScore);
          return;
        }

        this.activeIndex = nextIndex;
        this.activeQuestion = this.questions[this.activeIndex];
        this.timeLeft = this.totalQuestionSeconds;
        this.options = [];
        this.loadOptionsForActiveQuestion();
      },
      error: () => {
        this.isLoadingOptions = false;
        delete this.selectedOptionByQuestionId[questionId];
        this.errorMessage = 'No fue posible enviar tu respuesta.';
      },
    });
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

  private finishGame(finalScore: number): void {
    this.totalPoints = finalScore;
    this.isGameFinished = true;
    this.clearTimer();
    this.startFinalCountdownAndRedirect();
  }

  private startFinalCountdownAndRedirect(): void {
    this.clearRedirectTimers();
    this.redirectSecondsLeft = DEFAULT_REDIRECT_SECONDS;

    this.redirectCountdownHandle = setInterval(() => {
      if (this.redirectSecondsLeft > 0) {
        this.redirectSecondsLeft -= 1;
      }
    }, 1000);

    this.redirectHandle = setTimeout(() => {
      this.router.navigate(['/games']);
    }, DEFAULT_REDIRECT_SECONDS * 1000);
  }

  private clearRedirectTimers(): void {
    if (this.redirectHandle) {
      clearTimeout(this.redirectHandle);
      this.redirectHandle = null;
    }

    if (this.redirectCountdownHandle) {
      clearInterval(this.redirectCountdownHandle);
      this.redirectCountdownHandle = null;
    }
  }
}
