import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  // Steps: 1 = request code, 2 = verify code, 3 = reset password
  step = signal<number>(1);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  contactForm: FormGroup = this.fb.group({
    email_or_phone: ['', [Validators.required]]
  });

  verifyForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6)]]
  });

  resetForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', [Validators.required, Validators.minLength(8)]]
  });

  showPassword = signal(false);
  showPasswordConfirmation = signal(false);

  togglePassword() {
    this.showPassword.update(s => !s);
  }

  togglePasswordConfirmation() {
    this.showPasswordConfirmation.update(s => !s);
  }

  onRequestCode() {
    if (this.contactForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = this.contactForm.value;

    this.http.post(`${environment.apiUrl}/auth/forgot-password`, payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'Code sent successfully!');
        this.step.set(2);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to send code. Please try again.');
      }
    });
  }

  onVerifyCode() {
    if (this.verifyForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      email_or_phone: this.contactForm.value.email_or_phone,
      code: this.verifyForm.value.code
    };

    this.http.post(`${environment.apiUrl}/auth/verify-code`, payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'Code verified successfully!');
        this.step.set(3);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Invalid or expired code.');
      }
    });
  }

  onResetPassword() {
    if (this.resetForm.invalid) return;

    if (this.resetForm.value.password !== this.resetForm.value.password_confirmation) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = {
      email_or_phone: this.contactForm.value.email_or_phone,
      code: this.verifyForm.value.code,
      password: this.resetForm.value.password,
      password_confirmation: this.resetForm.value.password_confirmation
    };

    this.http.post(`${environment.apiUrl}/auth/reset-password`, payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.successMessage.set(res.message || 'Password reset successfully! Redirecting...');
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to reset password.');
      }
    });
  }
}
