import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
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
  IonToggle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  checkmarkOutline,
  closeOutline,
  trashOutline,
} from 'ionicons/icons';
import { GameSessionService } from './services/game-session.service';
import {
  CreateGameSessionFullOptionRequest,
  CreateGameSessionFullQuestionRequest,
  CreateGameSessionFullRequest,
  GameStatus,
  GameStatusCatalogOption,
  GameSummary,
} from './models/game-session.model';
import { AuthService } from 'src/app/components/auth/services/auth';

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
    IonCheckbox,
    IonLoading,
    IonIcon,
    IonSpinner,
    IonInput,
    IonTextarea,
    IonToggle,
  ],
  templateUrl: './game-add-session.page.html',
  styleUrls: ['./game-add-session.page.scss'],
})
export class GameAddSessionPage implements OnInit {
  sessionForm!: FormGroup;
  currentStep = 1;
  isLoading = false;
  isLoadingGames = false;
  isLoadingStatuses = false;
  showAlert = false;
  alertMessage = '';
  alertTitle = '';
  isSuccess = false;
  createdSessionId = '';
  games: GameSummary[] = [];
  gameStatusOptions: GameStatusCatalogOption[] = [];
  private readonly sessionStepFields = [
    'gameId',
    'gameStatusId',
    'name',
    'description',
    'sessionDate',
    'scheduledStartTime',
    'scheduledEndTime',
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
      'close-outline': closeOutline,
      'trash-outline': trashOutline,
      'add-outline': addOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    this.initializeForm();
    await Promise.all([this.loadGames(), this.loadStatusCatalog()]);
  }

  private initializeForm(): void {
    const now = new Date();
    now.setSeconds(0);

    const end = new Date(now);
    end.setHours(end.getHours() + 1);

    const dateOnly = now.toISOString().slice(0, 10);

    this.sessionForm = this.formBuilder.group({
      gameId: ['', Validators.required],
      gameStatusId: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(5)]],
      sessionDate: [dateOnly, Validators.required],
      scheduledStartTime: [now.toISOString().slice(0, 16), Validators.required],
      scheduledEndTime: [end.toISOString().slice(0, 16), Validators.required],
      questions: this.formBuilder.array([this.createQuestionGroup(1)]),
    });
  }

  get questionsFormArray(): FormArray {
    return this.sessionForm.get('questions') as FormArray;
  }

  getQuestionOptions(questionIndex: number): FormArray {
    return this.questionsFormArray.at(questionIndex).get('options') as FormArray;
  }

  addQuestion(): void {
    this.questionsFormArray.push(this.createQuestionGroup(this.questionsFormArray.length + 1));
  }

  removeQuestion(questionIndex: number): void {
    if (this.questionsFormArray.length <= 1) {
      return;
    }

    this.questionsFormArray.removeAt(questionIndex);
    this.reindexQuestions();
  }

  addOption(questionIndex: number): void {
    const options = this.getQuestionOptions(questionIndex);
    options.push(this.createOptionGroup(options.length + 1));
  }

  goToQuestionsStep(): void {
    if (!this.validateSessionStep()) {
      this.showErrorAlert('Error de validacion', 'Completa la configuracion de la sesion antes de continuar.');
      return;
    }

    this.currentStep = 2;
  }

  goToSessionStep(): void {
    this.currentStep = 1;
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    const options = this.getQuestionOptions(questionIndex);
    if (options.length <= 2) {
      return;
    }

    options.removeAt(optionIndex);
    options.controls.forEach((control, idx) => {
      control.get('displayOrder')?.setValue(idx + 1, { emitEvent: false });
    });
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
        if (this.gameStatusOptions.length > 0) {
          this.sessionForm.get('gameStatusId')?.setValue(this.gameStatusOptions[0].value);
        }
      },
      error: () => {
        this.isLoadingStatuses = false;
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

  private validateSessionStep(): boolean {
    this.sessionStepFields.forEach((fieldName) => {
      this.sessionForm.get(fieldName)?.markAsTouched();
      this.sessionForm.get(fieldName)?.updateValueAndValidity({ emitEvent: false });
    });

    return this.sessionStepFields.every((fieldName) => this.sessionForm.get(fieldName)?.valid);
  }

  onSubmit(): void {
    if (!this.validateSessionStep()) {
      this.currentStep = 1;
      this.showErrorAlert('Error de validacion', 'Completa la configuracion de la sesion antes de guardar.');
      return;
    }

    if (this.sessionForm.invalid) {
      this.sessionForm.markAllAsTouched();
      this.showErrorAlert('Error de validación', 'Por favor completa todos los campos requeridos.');
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
        difficultyLevel: number;
        questionOrder: number;
        points: number;
        isRequired: boolean;
      }) => ({
        tempQuestionId: Number(question.tempQuestionId),
        questionText: question.questionText,
        explanation: question.explanation,
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
      gameStatusId: raw.gameStatusId,
      name: raw.name,
      description: raw.description,
      sessionDate: raw.sessionDate,
      scheduledStartTime: new Date(raw.scheduledStartTime).toISOString(),
      scheduledEndTime: new Date(raw.scheduledEndTime).toISOString(),
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
          this.resetAfterSuccess(raw.sessionDate, raw.scheduledStartTime, raw.scheduledEndTime);
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

  private createQuestionGroup(tempQuestionId: number): FormGroup {
    return this.formBuilder.group({
      tempQuestionId: [tempQuestionId, [Validators.required, Validators.min(1)]],
      questionText: ['', [Validators.required, Validators.minLength(3)]],
      explanation: ['', [Validators.required, Validators.minLength(3)]],
      difficultyLevel: [1, [Validators.required, Validators.min(1)]],
      questionOrder: [tempQuestionId, [Validators.required, Validators.min(1)]],
      points: [10, [Validators.required, Validators.min(0)]],
      isRequired: [true, Validators.required],
      options: this.formBuilder.array([
        this.createOptionGroup(1, true),
        this.createOptionGroup(2, false),
      ]),
    });
  }

  private createOptionGroup(displayOrder: number, isCorrect = false): FormGroup {
    return this.formBuilder.group({
      optionText: ['', [Validators.required, Validators.minLength(1)]],
      isCorrect: [isCorrect],
      displayOrder: [displayOrder, [Validators.required, Validators.min(1)]],
    });
  }

  private reindexQuestions(): void {
    this.questionsFormArray.controls.forEach((control, index) => {
      const order = index + 1;
      control.get('tempQuestionId')?.setValue(order, { emitEvent: false });
      control.get('questionOrder')?.setValue(order, { emitEvent: false });
    });
  }

  private validateQuestions(): string | null {
    for (let index = 0; index < this.questionsFormArray.length; index += 1) {
      const optionsArray = this.getQuestionOptions(index);
      if (optionsArray.length < 2) {
        return `La pregunta ${index + 1} debe tener al menos 2 respuestas.`;
      }

      const correctCount = optionsArray.controls.filter((option) => option.get('isCorrect')?.value).length;
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
    this.showAlert = true;
  }

  private showErrorAlert(title: string, message: string): void {
    this.alertTitle = title;
    this.alertMessage = message;
    this.isSuccess = false;
    this.showAlert = true;
  }

  private resetAfterSuccess(sessionDate: string, startTime: string, endTime: string): void {
    this.sessionForm.reset({
      gameId: this.sessionForm.get('gameId')?.value,
      gameStatusId: this.sessionForm.get('gameStatusId')?.value,
      name: '',
      description: '',
      sessionDate,
      scheduledStartTime: startTime,
      scheduledEndTime: endTime,
    });

    this.questionsFormArray.clear();
    this.questionsFormArray.push(this.createQuestionGroup(1));
    this.currentStep = 1;
  }

  closeAlert(): void {
    this.showAlert = false;
    if (this.isSuccess) {
      this.router.navigate(['/games/admin']);
    }
  }
}
