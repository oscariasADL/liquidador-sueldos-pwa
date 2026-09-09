import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { AsyncState } from '../../../../core/models/async-state.model';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingSpinnerComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export default class LoginPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  state = signal<AsyncState>('idle');
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/dashboard']);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.state() === 'loading') {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.state.set('loading');
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.getRawValue();
    const { error } = await this.authService.signIn(email, password);

    if (error) {
      this.state.set('error');
      this.errorMessage.set(error);
    } else {
      this.state.set('success');
    }
  }

  get f() {
    return this.loginForm.controls;
  }
}
