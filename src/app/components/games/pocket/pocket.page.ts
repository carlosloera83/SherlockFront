import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { PocketQuestion, PocketQuestionOption, RankingEntry } from './class/IPocket';
import { PocketService } from './services/pocket';
import { AuthService } from '../../auth/services/auth';

const DEFAULT_GAME_SESSION_ID = 'DA0E239A-D9D4-45B9-92A4-FC6B1B69B2A0';
const DEFAULT_REDIRECT_SECONDS = 15;
const INTERMISSION_SECONDS = 5;

interface RankingPlayer {
  position: number;
  name: string;
  points: number;
  avatar: string;
  isCurrentUser?: boolean;
}

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
  showRankingModal = false;
  showFinalRankingModal = false;
  rankingCountdown = 0;
  rankingPlayers: RankingPlayer[] = [];
  finalRankingPlayers: RankingPlayer[] = [];
  private gameSessionId = '';
  private userId = '';

  private selectedOptionByQuestionId: Record<string, string | null> = {};
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private redirectHandle: ReturnType<typeof setTimeout> | null = null;
  private redirectCountdownHandle: ReturnType<typeof setInterval> | null = null;
  private intermissionHandle: ReturnType<typeof setTimeout> | null = null;
  private intermissionCountdownHandle: ReturnType<typeof setInterval> | null = null;

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
    this.clearIntermissionTimers();
  }

  private loadQuestions(gameSessionId: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.isGameFinished = false;
    this.totalPoints = 0;
    this.streak = 0;
    this.redirectSecondsLeft = 0;
    this.showRankingModal = false;
    this.showFinalRankingModal = false;
    this.rankingCountdown = 0;
    this.rankingPlayers = [];
    this.finalRankingPlayers = [];
    this.timeLeft = this.totalQuestionSeconds;
    this.selectedOptionByQuestionId = {};
    this.clearRedirectTimers();
    this.clearIntermissionTimers();

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

    this.submitCurrentAnswer(optionId);
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

    return Object.prototype.hasOwnProperty.call(
      this.selectedOptionByQuestionId,
      this.activeQuestion.gameQuestionId
    );
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
      if (this.isGameFinished || this.isLoading || this.showRankingModal) {
        return;
      }

      if (this.timeLeft > 0) {
        this.timeLeft -= 1;
        return;
      }

      this.handleQuestionTimeout();
    }, 1000);
  }

  private handleQuestionTimeout(): void {
    if (!this.activeQuestion || this.isLoadingOptions || this.isGameFinished || !this.gameSessionId || !this.userId) {
      return;
    }

    const questionId = this.activeQuestion.gameQuestionId;
    if (Object.prototype.hasOwnProperty.call(this.selectedOptionByQuestionId, questionId)) {
      return;
    }

    this.submitCurrentAnswer(null);
  }

  private submitCurrentAnswer(optionId: string | null): void {
    if (!this.activeQuestion || this.isLoadingOptions || this.isGameFinished || !this.gameSessionId || !this.userId) {
      return;
    }

    const questionId = this.activeQuestion.gameQuestionId;
    if (Object.prototype.hasOwnProperty.call(this.selectedOptionByQuestionId, questionId)) {
      return;
    }

    this.selectedOptionByQuestionId[questionId] = optionId;
    this.isLoadingOptions = true;

    this.pocketService.submitAnswer({
      gameSessionId: this.gameSessionId,
      userId: this.userId,
      gameQuestionId: questionId,
      selectedOptions: optionId ? [optionId] : [],
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

        this.startInterQuestionModal(nextIndex, response.data.totalScore);
      },
      error: () => {
        this.isLoadingOptions = false;
        delete this.selectedOptionByQuestionId[questionId];
        this.errorMessage = 'No fue posible enviar tu respuesta.';
      },
    });
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
    this.showRankingModal = false;
    this.clearIntermissionTimers();
    this.clearTimer();
    this.finalRankingPlayers = [];
    this.showFinalRankingModal = true;
    this.loadRanking('final', finalScore);
    this.startFinalCountdownAndRedirect();
  }

  navigateToGames(): void {
    this.clearRedirectTimers();
    this.router.navigate(['/games']);
  }

  private startInterQuestionModal(nextIndex: number, totalScore: number): void {
    this.clearIntermissionTimers();
    this.rankingPlayers = [];
    this.rankingCountdown = INTERMISSION_SECONDS;
    this.showRankingModal = true;
    this.loadRanking('intermission', totalScore);

    this.intermissionCountdownHandle = setInterval(() => {
      if (this.rankingCountdown > 0) {
        this.rankingCountdown -= 1;
      }
    }, 1000);

    this.intermissionHandle = setTimeout(() => {
      this.showRankingModal = false;
      this.clearIntermissionTimers();
      this.goToNextQuestion(nextIndex);
    }, INTERMISSION_SECONDS * 1000);
  }

  private goToNextQuestion(nextIndex: number): void {
    this.activeIndex = nextIndex;
    this.activeQuestion = this.questions[this.activeIndex];
    this.timeLeft = this.totalQuestionSeconds;
    this.options = [];
    this.loadOptionsForActiveQuestion();
  }

  private loadRanking(target: 'intermission' | 'final', fallbackScore: number): void {
    this.pocketService.getRanking(this.gameSessionId, this.userId).subscribe({
      next: (response) => {
        const players = response.success && response.data?.length > 0
          ? this.mapRankingEntries(response.data)
          : this.buildMockRanking(fallbackScore);

        if (target === 'final') {
          this.finalRankingPlayers = players;
          return;
        }

        this.rankingPlayers = players;
      },
      error: (error) => {
        console.error('Error loading ranking:', error);
        const fallbackPlayers = this.buildMockRanking(fallbackScore);

        if (target === 'final') {
          this.finalRankingPlayers = fallbackPlayers;
          return;
        }

        this.rankingPlayers = fallbackPlayers;
      },
    });
  }

  private mapRankingEntries(entries: RankingEntry[]): RankingPlayer[] {
    return [...entries]
      .sort((a, b) => a.position - b.position)
      .map((entry) => ({
        position: entry.position,
        name: entry.playerName,
        points: entry.scorePoints,
        avatar: (entry.avatarInitial || this.getAvatarInitials(entry.playerName)).toUpperCase(),
        isCurrentUser: entry.isCurrentUser,
      }));
  }

  private buildMockRanking(totalScore: number): RankingPlayer[] {
    const pool = [
      { name: 'NeonBlade', points: Math.max(totalScore + 16, 12), isCurrentUser: false },
      { name: 'CipherFox', points: Math.max(totalScore + 5, 8), isCurrentUser: false },
      { name: 'TurboLynx', points: Math.max(totalScore - 4, 0), isCurrentUser: false },
      { name: 'Tu', points: totalScore, isCurrentUser: true },
    ];

    const sorted = [...pool].sort((a, b) => b.points - a.points);
    return sorted.map((player, index) => ({
      position: index + 1,
      name: player.name,
      points: player.points,
      avatar: this.getAvatarInitials(player.name),
      isCurrentUser: player.isCurrentUser,
    }));
  }

  private getAvatarInitials(name: string): string {
    const initials = name
      .trim()
      .split(' ')
      .filter((part) => part.length > 0)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return initials || 'PL';
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

  private clearIntermissionTimers(): void {
    if (this.intermissionHandle) {
      clearTimeout(this.intermissionHandle);
      this.intermissionHandle = null;
    }

    if (this.intermissionCountdownHandle) {
      clearInterval(this.intermissionCountdownHandle);
      this.intermissionCountdownHandle = null;
    }
  }
}
