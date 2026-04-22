import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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
  IonText,
  IonSpinner, IonHeader, IonToolbar, IonTitle } from '@ionic/angular/standalone';

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
  imports: [IonTitle, IonToolbar, IonHeader, 
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonText,
    IonSpinner,
  ],
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

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

    const payload = {
      firstName: formValue.firstName.trim(),
      lastName: formValue.lastName.trim(),
      nickName: formValue.nickName.trim(),
      email: formValue.email.trim().toLowerCase(),
      password: formValue.password,
    };

    console.log('Register payload:', payload);

    setTimeout(() => {
      this.isSubmitting.set(false);
      this.router.navigateByUrl('/login');
    }, 1000);
  }
}