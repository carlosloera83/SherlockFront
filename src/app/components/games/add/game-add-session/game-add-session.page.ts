import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, TimeoutError } from 'rxjs';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonLoading,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkOutline,
  checkmarkCircle,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  cloudUploadOutline,
  createOutline,
  documentTextOutline,
  helpCircleOutline,
  saveOutline,
  gameControllerOutline,
  globeOutline,
  sparklesOutline,
  calendarOutline,
  timeOutline,
  trophyOutline,
} from 'ionicons/icons';
import { GameSessionService } from './services/game-session.service';
import {
  AiSessionPreviewQuestion,
  ApiResponse,
  Category,
  CreateGameSessionAiPreviewRequest,
  CreateGameSessionAiPreviewResponse,
  CreateGameSessionFullOptionRequest,
  CreateGameSessionFullQuestionRequest,
  CreateGameSessionFullRequest,
  GameStatus,
  GameStatusCatalogOption,
  GameSummary,
  QuestionGenerationMode,
} from './models/game-session.model';
import { AuthService } from 'src/app/components/auth/services/auth';

interface GenerationModeOption {
  id: QuestionGenerationMode;
  title: string;
  subtitle: string;
  badge: string;
  icon: string;
  cssClass: string;
}

@Component({
  selector: 'app-game-add-session',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonButton,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonLoading,
    IonIcon,
    IonSpinner,
    IonInput,
    IonTextarea,
  ],
  templateUrl: './game-add-session.page.html',
  styleUrls: ['./game-add-session.page.scss'],
})
export class GameAddSessionPage implements OnInit {
  sessionForm!: FormGroup;
  isLoading = false;
  isGeneratingPreview = false;
  isLoadingGames = false;
  isLoadingStatuses = false;
  isLoadingCategories = false;
  showNotice = false;
  alertMessage = '';
  alertTitle = '';
  isSuccess = false;
  createdSessionId = '';
  selectedQuestionIndex = 0;
  games: GameSummary[] = [];
  categories: Category[] = [];
  gameStatusOptions: GameStatusCatalogOption[] = [];
  waitingStatusId = '';

  currentStep = signal(1);
  sourceMode = signal<QuestionGenerationMode>('prompt');
  selectedPdfFile = signal<File | null>(null);

  readonly generationModes: GenerationModeOption[] = [
    {
      id: 'prompt',
      title: 'Prompt IA',
      subtitle: 'Describe el tema y la IA inventa las preguntas por ti.',
      badge: 'Creativo',
      icon: 'sparkles-outline',
      cssClass: 'mode-prompt',
    },
    {
      id: 'pdf',
      title: 'Desde PDF',
      subtitle: 'Sube un documento y conviertelo en trivia al instante.',
      badge: 'Documento',
      icon: 'document-text-outline',
      cssClass: 'mode-pdf',
    },
    {
      id: 'url',
      title: 'Desde URL',
      subtitle: 'Pega un enlace y extrae preguntas de su contenido.',
      badge: 'Web',
      icon: 'globe-outline',
      cssClass: 'mode-url',
    },
  ];

  readonly wizardSteps = [
    { step: 1, label: 'Fuente' },
    { step: 2, label: 'Configuracion' },
    { step: 3, label: 'Revision' },
  ];

  constructor(
    private formBuilder: FormBuilder,
    private gameSessionService: GameSessionService,
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({
      'arrow-back-outline': arrowBackOutline,
      'checkmark-outline': checkmarkOutline,
      'checkmark-circle': checkmarkCircle,
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'close-outline': closeOutline,
      'cloud-upload-outline': cloudUploadOutline,
      'create-outline': createOutline,
      'document-text-outline': documentTextOutline,
      'help-circle-outline': helpCircleOutline,
      'save-outline': saveOutline,
      'game-controller-outline': gameControllerOutline,
      'globe-outline': globeOutline,
      'sparkles-outline': sparklesOutline,
      'calendar-outline': calendarOutline,
      'time-outline': timeOutline,
      'trophy-outline': trophyOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    this.initializeForm();
    this.applyModeValidators(this.sourceMode());
    await Promise.all([this.loadGames(), this.loadStatusCatalog(), this.loadCategories()]);
  }

  private initializeForm(): void {
    const now = new Date();
    now.setSeconds(0);

    const end = new Date(now);
    end.setHours(end.getHours() + 1);

    const pad = (n: number) => String(n).padStart(2, '0');
    const dateOnly = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const startTime = now.toTimeString().slice(0, 5);
    const endTime = end.toTimeString().slice(0, 5);

    this.sessionForm = this.formBuilder.group({
      gameId: ['', Validators.required],
      gameStatusId: ['', Validators.required],
      categoryId: ['', Validators.required],
      gameName: ['', [Validators.required, Validators.minLength(3)]],
      prompt: [''],
      sourceUrl: [''],
      numberOfQuestions: [10, [Validators.required, Validators.min(1), Validators.max(500)]],
      secondsPerQuestion: [30, [Validators.required, Validators.min(5), Validators.max(300)]],
      pointsPerQuestion: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
      costGems: [0, [Validators.required, Validators.min(0)]],
      totalGems: [0, [Validators.required, Validators.min(0)]],
      sessionDate: [dateOnly, Validators.required],
      startTime: [startTime, Validators.required],
      endTime: [endTime, Validators.required],
      questions: this.formBuilder.array([]),
    });
  }

  private get requiredSessionFields(): string[] {
    const fields = [
      'gameId',
      'gameStatusId',
      'categoryId',
      'gameName',
      'numberOfQuestions',
      'secondsPerQuestion',
      'pointsPerQuestion',
      'costGems',
      'totalGems',
      'sessionDate',
      'startTime',
      'endTime',
    ];

    if (this.sourceMode() === 'prompt') {
      fields.push('prompt');
    }

    if (this.sourceMode() === 'url') {
      fields.push('sourceUrl');
    }

    return fields;
  }

  get questionsFormArray(): FormArray {
    return this.sessionForm.get('questions') as FormArray;
  }

  get totalPossiblePoints(): number {
    const questionCount = Number(this.sessionForm.get('numberOfQuestions')?.value || 0);
    const points = Number(this.sessionForm.get('pointsPerQuestion')?.value || 0);
    return questionCount * points;
  }

  get hasPreview(): boolean {
    return this.questionsFormArray.length > 0;
  }

  get selectedModeOption(): GenerationModeOption {
    return this.generationModes.find((mode) => mode.id === this.sourceMode()) || this.generationModes[0];
  }

  selectMode(mode: QuestionGenerationMode): void {
    if (this.sourceMode() === mode) {
      return;
    }

    this.sourceMode.set(mode);
    this.applyModeValidators(mode);
    this.clearPreview();
  }

  private applyModeValidators(mode: QuestionGenerationMode): void {
    const promptControl = this.sessionForm.get('prompt');
    const urlControl = this.sessionForm.get('sourceUrl');

    if (mode === 'prompt') {
      promptControl?.setValidators([Validators.required, Validators.minLength(10)]);
      urlControl?.clearValidators();
    } else if (mode === 'url') {
      promptControl?.clearValidators();
      urlControl?.setValidators([Validators.required, Validators.pattern(/^https?:\/\/.+/i)]);
    } else {
      promptControl?.clearValidators();
      urlControl?.clearValidators();
    }

    promptControl?.updateValueAndValidity({ emitEvent: false });
    urlControl?.updateValueAndValidity({ emitEvent: false });
  }

  goToStep(step: number): void {
    if (step === this.currentStep()) {
      return;
    }

    // Solo se permite avanzar al paso 3 cuando ya existen preguntas generadas.
    if (step === 3 && !this.hasPreview) {
      return;
    }

    this.showNotice = false;
    this.currentStep.set(step);
  }

  goBackStep(): void {
    if (this.currentStep() > 1) {
      this.goToStep(this.currentStep() - 1);
    }
  }

  onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (file && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.showErrorAlert('Archivo invalido', 'Solo se permiten archivos PDF.');
      input.value = '';
      return;
    }

    this.selectedPdfFile.set(file);
    if (file) {
      this.showNotice = false;
      this.clearPreview();
    }
  }

  removePdfFile(event: Event): void {
    event.stopPropagation();
    this.selectedPdfFile.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getQuestionOptions(questionIndex: number): FormArray {
    return this.questionsFormArray.at(questionIndex).get('options') as FormArray;
  }

  getQuestionTempId(questionIndex: number): number {
    return Number(this.questionsFormArray.at(questionIndex).get('tempQuestionId')?.value || questionIndex + 1);
  }

  selectQuestion(questionIndex: number): void {
    this.selectedQuestionIndex = questionIndex;
  }

  getSelectedQuestion(): FormGroup | null {
    if (!this.hasPreview || this.selectedQuestionIndex < 0 || this.selectedQuestionIndex >= this.questionsFormArray.length) {
      return null;
    }

    return this.questionsFormArray.at(this.selectedQuestionIndex) as FormGroup;
  }

  getSelectedQuestionOptionsControls(): any[] {
    const selectedQuestion = this.getSelectedQuestion();
    if (!selectedQuestion) {
      return [];
    }

    return (selectedQuestion.get('options') as FormArray).controls;
  }

  toggleOptionCorrect(questionIndex: number, optionIndex: number): void {
    const options = this.getQuestionOptions(questionIndex);
    const optionControl = options.at(optionIndex);
    const currentValue = Boolean(optionControl.get('isCorrect')?.value);
    optionControl.get('isCorrect')?.setValue(!currentValue);
  }

  getDifficultyLabel(level: number): string {
    if (level <= 1) {
      return 'Facil';
    }

    if (level === 2) {
      return 'Media';
    }

    return 'Dificil';
  }

  private async loadGames(): Promise<void> {
    const session = await this.authService.getSession();
    if (!session) return;

    this.isLoadingGames = true;
    this.gameSessionService.getGames(session.userId).subscribe({
      next: (response) => {
        this.isLoadingGames = false;
        if (response.success) {
          this.games = response.data;
          if (this.games.length > 0) {
            this.sessionForm.get('gameId')?.setValue(this.games[0].id);
          }
        }
      },
      error: () => {
        this.isLoadingGames = false;
      },
    });
  }

  private async loadStatusCatalog(): Promise<void> {
    this.isLoadingStatuses = true;
    this.gameSessionService.getGameStatuses().subscribe({
      next: (response) => {
        this.isLoadingStatuses = false;
        if (!response.success) {
          return;
        }

        this.gameStatusOptions = this.buildStatusOptions(response.data);
        this.waitingStatusId = this.resolveWaitingStatusId(this.gameStatusOptions);

        if (this.gameStatusOptions.length > 0) {
          this.sessionForm
            .get('gameStatusId')
            ?.setValue(this.waitingStatusId || this.gameStatusOptions[0].value);
        }
      },
      error: () => {
        this.isLoadingStatuses = false;
      },
    });
  }

  private async loadCategories(): Promise<void> {
    this.isLoadingCategories = true;
    this.gameSessionService.getCategories().subscribe({
      next: (response) => {
        this.isLoadingCategories = false;
        if (response.success) {
          this.categories = response.data || [];
        }
      },
      error: () => {
        this.isLoadingCategories = false;
      },
    });
  }

  private buildStatusOptions(statuses: GameStatus[]): GameStatusCatalogOption[] {
    return statuses.map((status) => ({
      code: status.code,
      name: status.name,
      value: status.id,
    }));
  }

  private resolveWaitingStatusId(statuses: GameStatusCatalogOption[]): string {
    const waitingStatus = statuses.find(
      (status) =>
        status.code?.trim().toLowerCase() === 'waiting' ||
        status.name?.trim().toLowerCase() === 'waiting'
    );

    return waitingStatus?.value || '';
  }

  private validateSessionData(): boolean {
    this.requiredSessionFields.forEach((fieldName) => {
      this.sessionForm.get(fieldName)?.markAsTouched();
      this.sessionForm.get(fieldName)?.updateValueAndValidity({ emitEvent: false });
    });

    const invalidFields = this.requiredSessionFields
      .filter((fieldName) => !this.sessionForm.get(fieldName)?.valid)
      .map((fieldName) => ({
        field: fieldName,
        value: this.sessionForm.get(fieldName)?.value,
        errors: this.sessionForm.get(fieldName)?.errors,
      }));

    if (invalidFields.length > 0) {
      console.log('[validateSessionData] Campos inválidos:', invalidFields);
      return false;
    }

    if (this.sourceMode() === 'pdf' && !this.selectedPdfFile()) {
      return false;
    }

    const raw = this.sessionForm.getRawValue();
    const start = this.buildIsoDateTime(raw.sessionDate, raw.startTime);
    const end = this.buildIsoDateTime(raw.sessionDate, raw.endTime);

    return new Date(end).getTime() > new Date(start).getTime();
  }

  generatePreview(): void {
    this.showNotice = false;

    if (!this.validateSessionData()) {
      this.showErrorAlert(
        'Error de validacion',
        this.sourceMode() === 'pdf' && !this.selectedPdfFile()
          ? 'Sube un archivo PDF y completa el formulario antes de generar.'
          : 'Completa el formulario y verifica que la hora de fin sea mayor a la hora de inicio.'
      );
      return;
    }

    this.isGeneratingPreview = true;
    const raw = this.sessionForm.getRawValue();
    const numberOfQuestions = Number(raw.numberOfQuestions);
    const pointsPerQuestion = Number(raw.pointsPerQuestion);

    let request$: Observable<ApiResponse<CreateGameSessionAiPreviewResponse>>;

    switch (this.sourceMode()) {
      case 'pdf':
        request$ = this.gameSessionService.generateSessionPreviewFromPdf(
          this.selectedPdfFile()!,
          numberOfQuestions,
          pointsPerQuestion
        );
        break;
      case 'url':
        request$ = this.gameSessionService.generateSessionPreviewFromUrl({
          url: raw.sourceUrl,
          numberOfQuestions,
          pointsPerQuestion,
        });
        break;
      default: {
        const payload: CreateGameSessionAiPreviewRequest = {
          prompt: raw.prompt,
          numberOfQuestions,
          pointsPerQuestion,
        };
        request$ = this.gameSessionService.generateSessionPreview(payload);
      }
    }

    request$.subscribe({
      next: (response) => {
        this.isGeneratingPreview = false;
        if (!response.success) {
          this.showErrorAlert('Error', response.message || 'No fue posible generar la vista previa.');
          return;
        }

        const questions = response.data?.questions || [];
        this.replaceQuestionsFromPreview(questions);
        this.currentStep.set(3);
        this.showSuccessAlert('Vista previa lista', response.message || 'Preguntas generadas exitosamente.');
      },
      error: (error) => {
        this.isGeneratingPreview = false;

        if (error instanceof TimeoutError) {
          this.showErrorAlert(
            'Tiempo de espera agotado',
            'La generacion de preguntas tardo demasiado. Intenta con menos preguntas o vuelve a intentarlo.'
          );
          return;
        }

        this.showErrorAlert('Error', error.error?.message || 'Ocurrio un error al generar preguntas con IA.');
      },
    });
  }

  clearPreview(): void {
    this.selectedQuestionIndex = 0;
    this.questionsFormArray.clear();
  }

  onSubmit(): void {
    this.showNotice = false;

    if (!this.validateSessionData()) {
      this.showErrorAlert(
        'Error de validacion',
        'Completa el formulario y verifica que la hora de fin sea mayor a la hora de inicio.'
      );
      return;
    }

    if (!this.hasPreview || this.questionsFormArray.length === 0) {
      this.showErrorAlert('Error de validacion', 'Primero genera preguntas con IA para poder guardar la sesion.');
      return;
    }

    const questionValidationError = this.validateQuestions();
    if (questionValidationError) {
      this.showErrorAlert('Error de validación', questionValidationError);
      return;
    }

    this.isLoading = true;
    const raw = this.sessionForm.getRawValue();

    const questions: CreateGameSessionFullQuestionRequest[] = raw.questions.map(
      (question: {
        tempQuestionId: number;
        questionText: string;
        explanation: string;
        platformUrl?: string | null;
        difficultyLevel: number;
        questionOrder: number;
        points: number;
        isRequired: boolean;
      }) => ({
        tempQuestionId: Number(question.tempQuestionId),
        questionText: question.questionText,
        explanation: question.explanation,
        platformUrl: question.platformUrl?.trim() || null,
        difficultyLevel: Number(question.difficultyLevel),
        questionOrder: Number(question.questionOrder),
        points: Number(question.points),
        isRequired: Boolean(question.isRequired),
      })
    );

    const options: CreateGameSessionFullOptionRequest[] = raw.questions.flatMap(
      (question: { tempQuestionId: number; options: any[] }) =>
        question.options.map((option, index) => ({
          tempQuestionId: Number(question.tempQuestionId),
          optionText: option.optionText,
          isCorrect: Boolean(option.isCorrect),
          displayOrder: index + 1,
        }))
    );

    const payload: CreateGameSessionFullRequest = {
      gameId: raw.gameId,
      gameStatusId: this.waitingStatusId || raw.gameStatusId,
      name: raw.gameName,
      description: this.buildSessionDescription(raw),
      sessionDate: raw.sessionDate,
      scheduledStartTime: this.buildIsoDateTime(raw.sessionDate, raw.startTime),
      scheduledEndTime: this.buildIsoDateTime(raw.sessionDate, raw.endTime),
      costGems: Number(raw.costGems),
      totalGems: Number(raw.totalGems),
      categoryId: raw.categoryId,
      secondsPerQuestion: Number(raw.secondsPerQuestion),
      questions,
      options,
    };

    this.gameSessionService.createSessionFull(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.createdSessionId = response.data;
          this.showSuccessAlert(
            'Sesión creada',
            `La sesión completa fue creada correctamente. ID: ${response.data}`
          );
          this.resetAfterSuccess(raw.sessionDate, raw.startTime, raw.endTime);
        } else {
          this.showErrorAlert('Error', response.message || 'No se pudo crear la sesión.');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.showErrorAlert('Error', error.error?.message || 'Ocurrió un error al crear la sesión.');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/games/admin']);
  }

  private buildSessionDescription(raw: { prompt: string; sourceUrl: string }): string {
    switch (this.sourceMode()) {
      case 'pdf':
        return `Preguntas generadas desde PDF: ${this.selectedPdfFile()?.name || 'documento'}`;
      case 'url':
        return `Preguntas generadas desde URL: ${raw.sourceUrl}`;
      default:
        return raw.prompt;
    }
  }

  private replaceQuestionsFromPreview(questions: AiSessionPreviewQuestion[]): void {
    this.questionsFormArray.clear();

    questions.forEach((question, questionIndex) => {
      const options = question.options.map((option, optionIndex) =>
        this.createOptionGroup(optionIndex + 1, option.isCorrect, option.optionText)
      );

      this.questionsFormArray.push(
        this.formBuilder.group({
          tempQuestionId: [questionIndex + 1, [Validators.required, Validators.min(1)]],
          questionText: [question.questionText, [Validators.required, Validators.minLength(3)]],
          explanation: [question.explanation, [Validators.required, Validators.minLength(3)]],
          platformUrl: [question.platformUrl || '', [Validators.pattern(/^https?:\/\/.+/i)]],
          difficultyLevel: [question.difficultyLevel, [Validators.required, Validators.min(1)]],
          questionOrder: [questionIndex + 1, [Validators.required, Validators.min(1)]],
          points: [question.points, [Validators.required, Validators.min(1)]],
          isRequired: [true, Validators.required],
          options: this.formBuilder.array(options),
        })
      );
    });

    this.selectedQuestionIndex = 0;
  }

  private buildIsoDateTime(date: string, time: string): string {
    // Construye una cadena ISO con el offset de zona horaria local
    // Evita usar toISOString() porque convierte a UTC y puede cambiar
    // la fecha al día siguiente dependiendo del huso horario.
    const isoLocal = `${date}T${time}:00`;
    const dt = new Date(isoLocal);
    const offsetMinutes = -dt.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const pad = (n: number) => String(n).padStart(2, '0');
    const offsetHours = pad(Math.floor(absMinutes / 60));
    const offsetMins = pad(absMinutes % 60);
    return `${isoLocal}${sign}${offsetHours}:${offsetMins}`;
  }

  private createOptionGroup(displayOrder: number, isCorrect = false, optionText = ''): FormGroup {
    return this.formBuilder.group({
      optionText: [optionText, [Validators.required, Validators.minLength(1)]],
      isCorrect: [isCorrect],
      displayOrder: [displayOrder, [Validators.required, Validators.min(1)]],
    });
  }

  private validateQuestions(): string | null {
    for (let index = 0; index < this.questionsFormArray.length; index += 1) {
      const optionsArray = this.getQuestionOptions(index);
      if (optionsArray.length < 2) {
        return `La pregunta ${index + 1} debe tener al menos 2 respuestas.`;
      }

      const correctCount = optionsArray.controls.filter((option: any) => option.get('isCorrect')?.value).length;
      if (correctCount < 1) {
        return `La pregunta ${index + 1} debe tener al menos una respuesta correcta.`;
      }
    }

    return null;
  }

  private showSuccessAlert(title: string, message: string): void {
    this.alertTitle = title;
    this.alertMessage = message;
    this.isSuccess = true;
    this.showNotice = true;
  }

  private showErrorAlert(title: string, message: string): void {
    this.alertTitle = title;
    this.alertMessage = message;
    this.isSuccess = false;
    this.showNotice = true;
  }

  private resetAfterSuccess(sessionDate: string, startTime: string, endTime: string): void {
    this.sessionForm.reset({
      gameId: this.sessionForm.get('gameId')?.value,
      gameStatusId: this.sessionForm.get('gameStatusId')?.value,
      categoryId: this.sessionForm.get('categoryId')?.value,
      gameName: '',
      prompt: '',
      sourceUrl: '',
      numberOfQuestions: 10,
      secondsPerQuestion: 30,
      pointsPerQuestion: 10,
      costGems: 0,
      totalGems: 0,
      sessionDate,
      startTime,
      endTime,
    });

    this.clearPreview();
    this.selectedPdfFile.set(null);
    this.currentStep.set(1);
  }

  closeAlert(): void {
    this.showNotice = false;
  }
}
