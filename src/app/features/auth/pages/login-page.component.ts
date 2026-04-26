import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  isSubmitting = false;
  errorMessage: string | null = null;

  submit(): void {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = null;

    const { username, password } = this.form.getRawValue();

    this.auth
      .login({ username, password })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          void this.router.navigateByUrl('/');
        },
        error: (err: unknown) => {
          this.isSubmitting = false;
          this.errorMessage = this.auth.toHumanError(err);
        }
      });
  }
}
