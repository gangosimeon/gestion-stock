import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(MatSnackBar);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  step: 1 | 2 = 1;
  isLoading = false;
  errorMessage: string | null = null;
  emailSent = '';

  get f() { return this.form.controls; }

  submit(): void {
    if (this.form.invalid || this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = null;
    const email = this.form.getRawValue().email;

    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.emailSent = email;
        this.step = 2;
      },
      error: (err: unknown) => {
        this.isLoading = false;
        const msg =
          err instanceof Error ? err.message : 'Une erreur est survenue.';
        if (msg.toLowerCase().includes('trouvé') || msg.toLowerCase().includes('found')) {
          this.errorMessage = 'Aucun compte associé à cet email.';
        } else {
          this.snackbar.open(msg, 'Fermer', {
            duration: 4000,
            panelClass: 'snack-error'
          });
        }
      }
    });
  }
}
