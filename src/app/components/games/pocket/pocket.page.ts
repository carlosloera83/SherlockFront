import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
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
  streak?: number;
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
  private readonly defaultProfileAvatarUrl = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=180&q=80';
  private readonly localProfileAvatarFallback = 'assets/Images/avatares/Avatar_Blank.png';
  profileAvatarUrl = this.defaultProfileAvatarUrl;
  profileAvatarHasError = false;
  userDisplayName = 'Jugador';
  userInitial = 'J';
  isQuestionTimerEnabled = true;
  readonly totalQuestionSeconds = 20;
  questionTimerTotal = this.totalQuestionSeconds;
  readonly defaultQuestionPlatformUrl = 'assets/Images/BackGround_Create_user.png';
  readonly gemsPerPoint = 10;
  readonly confettiBurstDurationMs = 1200;
  readonly wrongAnswerBurstDurationMs = 900;
  questions: PocketQuestion[] = [];
  options: PocketQuestionOption[] = [];
  activeQuestion: PocketQuestion | null = null;
  activeIndex = 0;
  cantidadTotalPreguntas = 0;
  preguntasFaltantes = 0;
  numeroPreguntaActual = 0;
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
  showHappyConfettiBurst = false;
  showWrongAnswerBurst = false;
  answerFeedback: { isCorrect: boolean; message: string } | null = null;
  showExplanationModal = false;
  explanationText: string | null = null;
  explanationCorrectAnswers: string | null = null;
  explanationCountdown = 3;
  sessionTitle = 'Modo Pocket';
  private gameSessionId = '';
  private userId = '';
  private readonly backgroundMusicPath = 'assets/sounds/Pocket/SoundBackGround.mp3';
  private readonly answerSuccessSoundPath = 'assets/sounds/Pocket/Answer_Success.mp3';
  private readonly answerErrorSoundPath = 'assets/sounds/Pocket/Answer_Error.mp3';
  isBackgroundMusicEnabled = false;
  private backgroundMusic: HTMLAudioElement | null = null;
  private unlockMusicHandler: (() => void) | null = null;
  private hasTriedBackgroundMusic = false;
  private answerSuccessSound: HTMLAudioElement | null = null;
  private answerErrorSound: HTMLAudioElement | null = null;

  private pendingIsGameFinished = false;
  private pendingFinalScore = 0;
  private explanationHandle: ReturnType<typeof setTimeout> | null = null;
  private explanationCountdownHandle: ReturnType<typeof setInterval> | null = null;
  private selectedOptionByQuestionId: Record<string, string | null> = {};
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private localExpiresAt: number | null = null;
  private redirectHandle: ReturnType<typeof setTimeout> | null = null;
  private redirectCountdownHandle: ReturnType<typeof setInterval> | null = null;
  private intermissionHandle: ReturnType<typeof setTimeout> | null = null;
  private intermissionCountdownHandle: ReturnType<typeof setInterval> | null = null;
  private confettiBurstHandle: ReturnType<typeof setTimeout> | null = null;
  private wrongAnswerBurstHandle: ReturnType<typeof setTimeout> | null = null;
  private orientationLocked = false;
  private orientationRetryHandles: ReturnType<typeof setTimeout>[] = [];
  private visibilityOrientationHandler: (() => void) | null = null;
  private focusOrientationHandler: (() => void) | null = null;

  constructor(
    private pocketService: PocketService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    this.registerOrientationGuards();
    await this.ensureLandscapeLock();
    void this.ensureBackgroundMusicStarted();

    const session = await this.authService.getSession();
    if (!session) {
      this.errorMessage = 'No se encontro la sesion del usuario.';
      this.isLoading = false;
      return;
    }

    this.userId = session.userId.toUpperCase();
    const avatarSession = session as any;
    const resolvedAvatar = [
      avatarSession.avatarUrl,
      avatarSession.profileImageUrl,
      avatarSession.imageUrl,
      avatarSession.photoUrl,
      avatarSession.avatar,
    ].find((v) => typeof v === 'string' && v.trim().length > 0)?.trim();
    this.userDisplayName = (session as any).nickName || (session as any).firstName || (session as any).username || 'Jugador';
    this.userInitial = this.userDisplayName.slice(0, 1).toUpperCase() || 'J';
    this.profileAvatarUrl = resolvedAvatar ?? this.defaultProfileAvatarUrl;
    this.profileAvatarHasError = false;
    const gameSessionId = this.route.snapshot.queryParamMap.get('gameSessionId') ?? DEFAULT_GAME_SESSION_ID;
    this.gameSessionId = gameSessionId.toUpperCase();
    this.sessionTitle = this.route.snapshot.queryParamMap.get('sessionName') ?? 'Modo Pocket';
    this.loadQuestions(this.gameSessionId);
    this.loadRanking('intermission', this.totalPoints);
  }

  onProfileAvatarError(): void {
    if (this.profileAvatarUrl !== this.localProfileAvatarFallback) {
      this.profileAvatarUrl = this.localProfileAvatarFallback;
      return;
    }
    this.profileAvatarHasError = true;
  }

  ngOnDestroy(): void {
    this.unregisterOrientationGuards();
    this.stopBackgroundMusic();
    void this.releaseOrientationLock();
    this.clearTimer();
    this.clearRedirectTimers();
    this.clearIntermissionTimers();
    this.clearConfettiBurst();
    this.clearWrongAnswerBurst();
    this.clearExplanationTimers();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.ensureLandscapeLock();
    await this.ensureBackgroundMusicStarted();
  }

  async ionViewDidEnter(): Promise<void> {
    await this.ensureLandscapeLock();
  }

  async toggleBackgroundMusic(): Promise<void> {
    this.isBackgroundMusicEnabled = !this.isBackgroundMusicEnabled;

    if (this.isBackgroundMusicEnabled) {
      this.hasTriedBackgroundMusic = false;
      await this.ensureBackgroundMusicStarted();
      return;
    }

    this.stopBackgroundMusic();
  }

  async ionViewWillLeave(): Promise<void> {
    this.stopBackgroundMusic();
    this.clearOrientationRetries();
    await this.releaseOrientationLock();
  }

  private async ensureLandscapeLock(): Promise<void> {
    this.clearOrientationRetries();
    await this.forceLandscapeOrientation();

    // Retry lock a few times to handle devices that ignore the first orientation request.
    [200, 500, 900].forEach((delayMs) => {
      const timeoutHandle = setTimeout(() => {
        void this.forceLandscapeOrientation();
      }, delayMs);

      this.orientationRetryHandles.push(timeoutHandle);
    });
  }

  private clearOrientationRetries(): void {
    this.orientationRetryHandles.forEach((handle) => clearTimeout(handle));
    this.orientationRetryHandles = [];
  }

  private registerOrientationGuards(): void {
    if (!this.visibilityOrientationHandler) {
      this.visibilityOrientationHandler = () => {
        if (!document.hidden) {
          void this.ensureLandscapeLock();
        }
      };

      document.addEventListener('visibilitychange', this.visibilityOrientationHandler);
    }

    if (!this.focusOrientationHandler) {
      this.focusOrientationHandler = () => {
        void this.ensureLandscapeLock();
      };

      window.addEventListener('focus', this.focusOrientationHandler);
    }
  }

  private unregisterOrientationGuards(): void {
    this.clearOrientationRetries();

    if (this.visibilityOrientationHandler) {
      document.removeEventListener('visibilitychange', this.visibilityOrientationHandler);
      this.visibilityOrientationHandler = null;
    }

    if (this.focusOrientationHandler) {
      window.removeEventListener('focus', this.focusOrientationHandler);
      this.focusOrientationHandler = null;
    }
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
    this.answerFeedback = null;
    this.showExplanationModal = false;
    this.explanationText = null;
    this.explanationCorrectAnswers = null;
    this.cantidadTotalPreguntas = 0;
    this.preguntasFaltantes = 0;
    this.numeroPreguntaActual = 0;
    this.clearConfettiBurst();
    this.clearWrongAnswerBurst();
    this.clearExplanationTimers();
    this.clearRedirectTimers();
    this.clearIntermissionTimers();

    this.pocketService.getQuestions(gameSessionId, this.userId).subscribe({
      next: (response) => {
        if (!response.success) {
          this.errorMessage = response.message;
          this.isLoading = false;
          return;
        }

        const data = response.data;
        this.cantidadTotalPreguntas = data.cantidadTotalPreguntas;
        this.preguntasFaltantes = data.preguntasFaltantes;
        this.numeroPreguntaActual = data.numeroPreguntaActual;
        this.questions = [...data.questions].sort((a, b) => a.questionOrder - b.questionOrder);

        if (this.questions.length === 0) {
          this.activeQuestion = null;
          this.isLoading = false;
          return;
        }

        this.activeIndex = 0;
        this.activeQuestion = this.questions[0];
        this.loadOptionsForActiveQuestion();
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
        if (this.activeQuestion) {
          this.startQuestionTimer(this.activeQuestion);
        }
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

  skipExplanationModal(): void {
    this.clearExplanationTimers();
    this.autoAdvanceAfterAnswer();
  }

  get currentQuestionNumber(): number {
    return this.numeroPreguntaActual > 0 ? this.numeroPreguntaActual : 1;
  }

  get progressSteps(): number[] {
    return Array.from({ length: this.cantidadTotalPreguntas }, (_, i) => i);
  }

  getOptionLetter(index: number): string {
    return ['A', 'B', 'C', 'D', 'E', 'F'][index] ?? String(index + 1);
  }

  getMedalIcon(position: number): string {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  }

  getStreakFlames(streak: number): string {
    return '🔥'.repeat(Math.min(streak, 3));
  }

  getTimerProgress(): number {
    if (this.questionTimerTotal <= 0) return 0;
    return (this.timeLeft / this.questionTimerTotal) * 100;
  }

  getProgressStepClass(index: number): string {
    const currentIdx = this.currentQuestionNumber - 1;

    if (index < currentIdx) {
      return 'progress-step progress-step--done';
    }

    if (index === currentIdx) {
      return 'progress-step progress-step--active';
    }

    return 'progress-step';
  }

  get gemsCount(): number {
    return Math.floor(this.totalPoints / this.gemsPerPoint);
  }

  get worldRankingLabel(): string {
    const rankingSource = this.showFinalRankingModal && this.finalRankingPlayers.length > 0
      ? this.finalRankingPlayers
      : this.rankingPlayers;

    if (!rankingSource.length) {
      return '--';
    }

    const currentUser = rankingSource.find((player) => player.isCurrentUser);
    return currentUser ? `#${currentUser.position}` : '--';
  }

  getActiveQuestionPlatformUrl(): string | null {
    const rawUrl = this.activeQuestion?.platformUrl?.trim();
    if (!rawUrl) {
      return this.defaultQuestionPlatformUrl;
    }

    return /^https?:\/\//i.test(rawUrl) ? rawUrl : this.defaultQuestionPlatformUrl;
  }

  isPlatformImageUrl(url: string): boolean {
    return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
  }

  private startQuestionTimer(question: PocketQuestion): void {
    this.clearTimer();

    if (question.expiresAt && question.serverNow) {
      const msRemaining = new Date(question.expiresAt).getTime() - new Date(question.serverNow).getTime();
      this.timeLeft = Math.max(0, Math.ceil(msRemaining / 1000));
      this.questionTimerTotal = question.timeLimitSeconds ?? this.totalQuestionSeconds;
      // Anchor to local clock to avoid drift on each tick
      this.localExpiresAt = Date.now() + msRemaining;
    } else {
      this.timeLeft = question.timeLimitSeconds ?? this.totalQuestionSeconds;
      this.questionTimerTotal = this.timeLeft;
      this.localExpiresAt = Date.now() + this.timeLeft * 1000;
    }

    if (this.timeLeft <= 0) {
      this.handleQuestionTimeout();
      return;
    }

    this.timerHandle = setInterval(() => {
      if (this.isGameFinished || this.isLoading || this.showRankingModal) {
        return;
      }

      this.timeLeft = Math.max(0, Math.ceil((this.localExpiresAt! - Date.now()) / 1000));

      if (this.timeLeft <= 0) {
        this.clearTimer();
        this.handleQuestionTimeout();
      }
    }, 1000);
  }

  private handleQuestionTimeout(): void {
    this.clearTimer();

    if (!this.activeQuestion || this.isGameFinished) {
      return;
    }

    const questionId = this.activeQuestion.gameQuestionId;
    if (Object.prototype.hasOwnProperty.call(this.selectedOptionByQuestionId, questionId)) {
      return;
    }

    // Mark the question as timed-out without a selection
    this.selectedOptionByQuestionId[questionId] = null;
    this.playAnswerFeedbackSound(false);
    this.triggerWrongAnswerBurst(false);

    // Auto-advance after the error animation completes
    setTimeout(() => {
      this.loadNextQuestion();
    }, this.wrongAnswerBurstDurationMs + 100);
  }

  private submitCurrentAnswer(optionId: string | null): void {
    if (!this.activeQuestion || this.isLoadingOptions || this.isGameFinished || !this.gameSessionId || !this.userId) {
      return;
    }

    const questionId = this.activeQuestion.gameQuestionId;
    if (Object.prototype.hasOwnProperty.call(this.selectedOptionByQuestionId, questionId)) {
      return;
    }

    this.clearTimer();
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
        this.playAnswerFeedbackSound(response.data.isCorrect);
        this.triggerHappyConfettiBurst(response.data.isCorrect);
        this.triggerWrongAnswerBurst(response.data.isCorrect);
        this.answerFeedback = {
          isCorrect: response.data.isCorrect,
          message: response.data.mensaje || (response.data.isCorrect ? '¡Respuesta correcta!' : 'Respuesta incorrecta.'),
        };

        this.pendingIsGameFinished = response.data.isGameFinished;
        this.pendingFinalScore = response.data.totalScore;
        this.loadRanking('intermission', response.data.totalScore);

        if (response.data.isCorrect) {
          setTimeout(() => this.autoAdvanceAfterAnswer(), this.confettiBurstDurationMs + 300);
        } else {
          this.explanationText = response.data.explanation ?? null;
          this.explanationCorrectAnswers = response.data.correctAnswers ?? null;
          this.showExplanationModal = true;
          this.startExplanationCountdown();
        }
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

  private playAnswerFeedbackSound(isCorrect: boolean): void {
    try {
      const sound = isCorrect ? this.getAnswerSuccessSound() : this.getAnswerErrorSound();
      if (!sound) {
        return;
      }

      sound.currentTime = 0;
      void sound.play().catch(() => {
        // Ignore autoplay and runtime audio errors to avoid interrupting gameplay.
      });
    } catch {
      // Ignore audio initialization errors to keep game flow unaffected.
    }
  }

  private getAnswerSuccessSound(): HTMLAudioElement {
    if (!this.answerSuccessSound) {
      this.answerSuccessSound = new Audio(this.answerSuccessSoundPath);
      this.answerSuccessSound.preload = 'auto';
    }

    return this.answerSuccessSound;
  }

  private getAnswerErrorSound(): HTMLAudioElement {
    if (!this.answerErrorSound) {
      this.answerErrorSound = new Audio(this.answerErrorSoundPath);
      this.answerErrorSound.preload = 'auto';
    }

    return this.answerErrorSound;
  }

  private initBackgroundMusic(): void {
    if (this.backgroundMusic) {
      return;
    }

    this.backgroundMusic = new Audio(this.backgroundMusicPath);
    this.backgroundMusic.preload = 'auto';
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.45;
  }

  private async playBackgroundMusic(): Promise<void> {
    if (!this.isBackgroundMusicEnabled) {
      return;
    }

    this.initBackgroundMusic();

    if (!this.backgroundMusic) {
      return;
    }

    try {
      this.backgroundMusic.currentTime = 0;
      await this.backgroundMusic.play();
      this.removeMusicUnlockListeners();
    } catch {
      this.attachMusicUnlockListeners();
    }
  }

  private async ensureBackgroundMusicStarted(): Promise<void> {
    if (!this.isBackgroundMusicEnabled) {
      return;
    }

    if (this.hasTriedBackgroundMusic && this.backgroundMusic && !this.backgroundMusic.paused) {
      return;
    }

    this.hasTriedBackgroundMusic = true;
    await this.playBackgroundMusic();
  }

  private stopBackgroundMusic(): void {
    this.removeMusicUnlockListeners();

    if (!this.backgroundMusic) {
      return;
    }

    this.backgroundMusic.pause();
    this.backgroundMusic.currentTime = 0;
  }

  private attachMusicUnlockListeners(): void {
    if (!this.isBackgroundMusicEnabled) {
      return;
    }

    if (this.unlockMusicHandler) {
      return;
    }

    this.unlockMusicHandler = () => {
      if (!this.isBackgroundMusicEnabled) {
        return;
      }

      void this.playBackgroundMusic();
    };

    window.addEventListener('pointerdown', this.unlockMusicHandler, { once: true });
    window.addEventListener('touchstart', this.unlockMusicHandler, { once: true });
    window.addEventListener('click', this.unlockMusicHandler, { once: true });
    window.addEventListener('keydown', this.unlockMusicHandler, { once: true });
  }

  private removeMusicUnlockListeners(): void {
    if (!this.unlockMusicHandler) {
      return;
    }

    window.removeEventListener('pointerdown', this.unlockMusicHandler);
    window.removeEventListener('touchstart', this.unlockMusicHandler);
    window.removeEventListener('click', this.unlockMusicHandler);
    window.removeEventListener('keydown', this.unlockMusicHandler);
    this.unlockMusicHandler = null;
  }

  private finishGame(finalScore: number): void {
    this.totalPoints = finalScore;
    this.isGameFinished = true;
    this.showRankingModal = false;
    this.clearIntermissionTimers();
    this.clearTimer();

    void this.router.navigate(['/games/pocket/finalizar'], {
      queryParams: {
        gameSessionId: this.gameSessionId,
        score: finalScore,
        sessionName: this.sessionTitle,
      },
    });
  }

  navigateToGames(): void {
    this.clearRedirectTimers();
    this.router.navigate(['/games']);
  }

  private autoAdvanceAfterAnswer(): void {
    this.showExplanationModal = false;
    this.explanationText = null;
    this.explanationCorrectAnswers = null;
    this.answerFeedback = null;

    if (this.pendingIsGameFinished) {
      this.finishGame(this.pendingFinalScore);
      return;
    }

    this.loadNextQuestion();
  }

  private startExplanationCountdown(): void {
    this.clearExplanationTimers();
    this.explanationCountdown = 10;

    this.explanationCountdownHandle = setInterval(() => {
      if (this.explanationCountdown > 0) {
        this.explanationCountdown -= 1;
      }
    }, 1000);

    this.explanationHandle = setTimeout(() => {
      this.clearExplanationTimers();
      this.autoAdvanceAfterAnswer();
    }, 10000);
  }

  private clearExplanationTimers(): void {
    if (this.explanationHandle) {
      clearTimeout(this.explanationHandle);
      this.explanationHandle = null;
    }

    if (this.explanationCountdownHandle) {
      clearInterval(this.explanationCountdownHandle);
      this.explanationCountdownHandle = null;
    }
  }

  private loadNextQuestion(): void {
    this.clearTimer();
    this.options = [];
    this.activeQuestion = null;
    this.isLoading = true;
    this.errorMessage = null;

    this.pocketService.getQuestions(this.gameSessionId, this.userId).subscribe({
      next: (response) => {
        if (!response.success) {
          if (response.message === 'USER_ALREADY_ANSWERED_ALL_QUESTIONS') {
            this.isLoading = false;
            this.finishGame(this.totalPoints);
            return;
          }
          this.errorMessage = response.message;
          this.isLoading = false;
          return;
        }

        const data = response.data;
        this.cantidadTotalPreguntas = data.cantidadTotalPreguntas;
        this.preguntasFaltantes = data.preguntasFaltantes;
        this.numeroPreguntaActual = data.numeroPreguntaActual;

        if (data.questions.length === 0) {
          this.isLoading = false;
          this.finishGame(this.totalPoints);
          return;
        }

        this.questions = [...data.questions].sort((a, b) => a.questionOrder - b.questionOrder);
        this.activeIndex = 0;
        this.activeQuestion = this.questions[0];
        this.selectedOptionByQuestionId = {};
        this.loadOptionsForActiveQuestion();
      },
      error: (err) => {
        const serverMessage = err?.error?.message as string | undefined;
        if (serverMessage === 'USER_ALREADY_ANSWERED_ALL_QUESTIONS') {
          this.isLoading = false;
          this.finishGame(this.totalPoints);
          return;
        }
        this.errorMessage = 'No fue posible cargar la siguiente pregunta.';
        this.isLoading = false;
      },
    });
  }

  private loadRanking(target: 'intermission', fallbackScore: number): void {
    this.pocketService.getRanking(this.gameSessionId, this.userId).subscribe({
      next: (response) => {
        const players = response.success && response.data?.length > 0
          ? this.mapRankingEntries(response.data)
          : this.buildMockRanking(fallbackScore);

        this.rankingPlayers = players;
      },
      error: (error) => {
        console.error('Error loading ranking:', error);
        const fallbackPlayers = this.buildMockRanking(fallbackScore);

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
        streak: entry.correctAnswers ?? 0,
        isCurrentUser: entry.isCurrentUser,
      }));
  }

  private buildMockRanking(totalScore: number): RankingPlayer[] {
    const pool = [
      { name: 'NeonBlade', points: Math.max(totalScore + 16, 12), streak: 3, isCurrentUser: false },
      { name: 'CipherFox', points: Math.max(totalScore + 5, 8), streak: 1, isCurrentUser: false },
      { name: 'TurboLynx', points: Math.max(totalScore - 4, 0), streak: 2, isCurrentUser: false },
      { name: 'Tu', points: totalScore, streak: this.streak, isCurrentUser: true },
    ];

    const sorted = [...pool].sort((a, b) => b.points - a.points);
    return sorted.map((player, index) => ({
      position: index + 1,
      name: player.name,
      points: player.points,
      streak: player.streak,
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

  private triggerHappyConfettiBurst(isCorrect: boolean): void {
    this.clearConfettiBurst();

    if (!isCorrect) {
      return;
    }

    this.showHappyConfettiBurst = true;
    this.confettiBurstHandle = setTimeout(() => {
      this.showHappyConfettiBurst = false;
      this.confettiBurstHandle = null;
    }, this.confettiBurstDurationMs);
  }

  private triggerWrongAnswerBurst(isCorrect: boolean): void {
    this.clearWrongAnswerBurst();

    if (isCorrect) {
      return;
    }

    this.showWrongAnswerBurst = true;
    this.wrongAnswerBurstHandle = setTimeout(() => {
      this.showWrongAnswerBurst = false;
      this.wrongAnswerBurstHandle = null;
    }, this.wrongAnswerBurstDurationMs);
  }

  private clearConfettiBurst(): void {
    this.showHappyConfettiBurst = false;

    if (this.confettiBurstHandle) {
      clearTimeout(this.confettiBurstHandle);
      this.confettiBurstHandle = null;
    }
  }

  private clearWrongAnswerBurst(): void {
    this.showWrongAnswerBurst = false;

    if (this.wrongAnswerBurstHandle) {
      clearTimeout(this.wrongAnswerBurstHandle);
      this.wrongAnswerBurstHandle = null;
    }
  }

  private async forceLandscapeOrientation(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await ScreenOrientation.lock({ orientation: 'landscape' });
      } else {
        const orientationApi = (window.screen as Screen & { orientation?: { lock?: (type: string) => Promise<void> } }).orientation;
        if (orientationApi?.lock) {
          await orientationApi.lock('landscape');
        }
      }

      this.orientationLocked = true;
    } catch (error) {
      this.orientationLocked = false;
      console.warn('No se pudo bloquear orientacion horizontal en Pocket.', error);
    }
  }

  private async releaseOrientationLock(): Promise<void> {
    if (!this.orientationLocked) {
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await ScreenOrientation.unlock();
      } else {
        const orientationApi = (window.screen as Screen & { orientation?: { unlock?: () => void } }).orientation;
        orientationApi?.unlock?.();
      }
    } catch (error) {
      console.warn('No se pudo liberar orientacion en Pocket.', error);
    } finally {
      this.orientationLocked = false;
    }
  }
}
