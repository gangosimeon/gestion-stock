import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { PlatformAuthService } from '../data/platform-auth.service';

/** Changement du mot de passe Super Admin (obligatoire après l'amorçage). */
@Component({
  selector: 'app-platform-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="forgot-layout">
      <div class="forgot-panel">
        <div class="forgot-content">
          <div class="forgot-icon"><mat-icon>password</mat-icon></div>
          <h1>Changer le mot de passe</h1>
          <p class="forgot-desc">
            @if (auth.admin?.mustChangePassword) { Mot de passe initial : choisissez le vôtre avant de continuer. }
            12 caractères au moins, avec une minuscule, une majuscule et un chiffre.
          </p>
          <form [formGroup]="form" (ngSubmit)="submit()" class="form">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Mot de passe actuel</mat-label>
              <input matInput type="password" formControlName="current" autocomplete="current-password" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Nouveau mot de passe</mat-label>
              <input matInput [type]="showPwd ? 'text' : 'password'" formControlName="next" autocomplete="new-password" />
              <button mat-icon-button matSuffix type="button" (click)="showPwd = !showPwd"
                      [attr.aria-label]="showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
                <mat-icon>{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
            @if (errorMessage) {
              <div class="error" role="alert">{{ errorMessage }}</div>
            }
            <button mat-flat-button color="primary" class="form__submit" type="submit" [disabled]="form.invalid || isLoading">
              <mat-icon>check</mat-icon>
              <span>Enregistrer</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styleUrl: '../../../auth/pages/forgot-password/forgot-password.component.scss'
})
export class PlatformChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(PlatformAuthService);
  private readonly router = inject(Router);
  /** Application sans zone.js : rendu demandé après chaque réponse asynchrone. */
  private readonly cdr = inject(ChangeDetectorRef);

  readonly form = this.fb.nonNullable.group({
    current: ['', Validators.required],
    next: ['', [Validators.required, Validators.minLength(12)]]
  });

  showPwd = false;
  isLoading = false;
  errorMessage: string | null = null;

  submit(): void {
    if (this.form.invalid || this.isLoading) return;
    this.isLoading = true;
    this.errorMessage = null;
    const { current, next } = this.form.getRawValue();
    this.auth.changePassword(current, next).subscribe({
      next: () => {
        this.isLoading = false;
        void this.router.navigateByUrl('/platform');
      },
      error: (err: unknown) => {
        this.isLoading = false;
        this.errorMessage = (err as HttpErrorResponse)?.error?.message ?? 'Mot de passe refusé.';
        this.cdr.markForCheck();
      }
    });
  }
}
