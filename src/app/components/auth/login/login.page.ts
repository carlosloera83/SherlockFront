import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonText,
  IonIcon,
  IonSpinner, IonHeader, IonToolbar, IonTitle } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth';
import { LoginRequest } from '../class/ILogin';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonTitle, IonToolbar, IonHeader, 
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonText,
    IonIcon,
    IonSpinner,
  ],
})
export class LoginPage {
 

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

 isSubmitting = false;
  showPassword = false;
  errorMessage = '';

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected get emailControl() {
    return this.loginForm.controls.email;
  }

  protected get passwordControl() {
    return this.loginForm.controls.password;
  }

  protected togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const payload: LoginRequest = {
      email: this.loginForm.value.email?.trim() || '',
      password: this.loginForm.value.password || '',
    };

    this.authService.login(payload).subscribe({
      next: async (response) => {
        this.isSubmitting = false;

        if (response.success && response.data) {
          await this.authService.saveSession(response.data);

          const session = await this.authService.getSession();
          console.log('SESSION GUARDADA:', session);
          this.router.navigateByUrl('/home', { replaceUrl: true });
          return;
        }

        this.errorMessage =
          response.message ||
          response.errors?.[0] ||
          'No fue posible iniciar sesión.';
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.errorMessage = this.getErrorMessage(error);
      },
    });
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

    if (error.status === 401) {
      return 'Correo o contraseña incorrectos.';
    }

    if (error.status === 400) {
      return 'La solicitud es inválida.';
    }

    return 'Ocurrió un error inesperado al iniciar sesión.';
  }
}