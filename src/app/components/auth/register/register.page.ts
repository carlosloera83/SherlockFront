import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonAlert,
  IonText,
  IonSpinner,
} from '@ionic/angular/standalone';
import { AuthService } from '../services/auth';
import { RegisterRequest } from '../class/IRegister';

function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  };
}

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonAlert,
    IonText,
    IonSpinner,
  ],
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly isSubmitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly showAlert = signal(false);
  protected readonly alertHeader = signal('');
  protected readonly alertMessage = signal('');
  protected readonly registrationSucceeded = signal(false);

  protected readonly registerForm = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      nickName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(50),
          Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator() }
  );

  protected readonly passwordRules = computed(() => {
    const value = this.passwordControl.value ?? '';

    return {
      minLength: value.length >= 8,
      hasUpper: /[A-Z]/.test(value),
      hasLower: /[a-z]/.test(value),
      hasNumber: /\d/.test(value),
    };
  });

  protected get firstNameControl() {
    return this.registerForm.controls.firstName;
  }

  protected get lastNameControl() {
    return this.registerForm.controls.lastName;
  }

  protected get nickNameControl() {
    return this.registerForm.controls.nickName;
  }

  protected get emailControl() {
    return this.registerForm.controls.email;
  }

  protected get passwordControl() {
    return this.registerForm.controls.password;
  }

  protected get confirmPasswordControl() {
    return this.registerForm.controls.confirmPassword;
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update(value => !value);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(value => !value);
  }

  protected onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const formValue = this.registerForm.getRawValue();

    const payload: RegisterRequest = {
      firstName: formValue.firstName.trim(),
      lastName: formValue.lastName.trim(),
      nickName: formValue.nickName.trim(),
      email: formValue.email.trim().toLowerCase(),
      password: formValue.password,
    };

    this.authService.register(payload).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);

        if (response.success) {
          this.registrationSucceeded.set(true);
          this.alertHeader.set('Registro exitoso');
          this.alertMessage.set(
            response.data?.mensaje || response.message || 'Tu cuenta fue creada correctamente.'
          );
          this.registerForm.reset();
          this.showAlert.set(true);
          return;
        }

        this.showResultAlert(
          'No se pudo registrar',
          response.message || response.errors?.[0] || 'No fue posible completar el registro.'
        );
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.showResultAlert('No se pudo registrar', this.getErrorMessage(error));
      },
    });
  }

  protected handleAlertDismiss(): void {
    this.showAlert.set(false);

    if (this.registrationSucceeded()) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  private showResultAlert(header: string, message: string): void {
    this.registrationSucceeded.set(false);
    this.alertHeader.set(header);
    this.alertMessage.set(message);
    this.showAlert.set(true);
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }

    if (error.error) {
      if (typeof error.error === 'string') {
        return error.error;
      }

      if (error.error.message) {
        return error.error.message;
      }

      if (Array.isArray(error.error.errors) && error.error.errors.length > 0) {
        return error.error.errors[0];
      }
    }

    if (error.status === 400) {
      return 'La solicitud de registro es inválida.';
    }

    if (error.status === 409) {
      return 'Ya existe una cuenta con ese correo o nickname.';
    }

    return 'Ocurrió un error inesperado al registrar el usuario.';
  }
}