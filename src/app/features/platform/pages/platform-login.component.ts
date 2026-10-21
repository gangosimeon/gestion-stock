import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PlatformAuthService } from '../data/platform-auth.service';

/** Connexion Super Admin GestStock (aucune inscription publique). */
@Component({
  selector: 'app-platform-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <div class="forgot-layout">
      <div class="forgot-panel">
        <div class="forgot-content">
          <div class="forgot-icon"><mat-icon>admin_panel_settings</mat-icon></div>
          <h1>Espace Super Admin</h1>
          <p class="forgot-desc">Administration de la plateforme GestStock. Accès réservé.</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="form">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Identifiant</mat-label>
              <mat-icon matPrefix>person</mat-icon>
              <input matInput formControlName="username" autocomplete="username" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Mot de passe</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput [type]="showPwd ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
              <button mat-icon-button matSuffix type="button" (click)="showPwd = !showPwd"
                      [attr.aria-label]="showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'">
                <mat-icon>{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
            @if (errorMessage) {
              <div class="error" role="alert">{{ errorMessage }}</div>
            }
            <button mat-flat-button color="primary" class="form__submit" type="submit" [disabled]="form.invalid || isLoading">
              @if (isLoading) { <mat-spinner diameter="20"></mat-spinner> } @else { <mat-icon>login</mat-icon> }
              <span>Se connecter</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styleUrl: '../../../auth/pages/forgot-password/forgot-password.component.scss'
})
export class PlatformLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(PlatformAuthService);
  private readonly router = inject(Router);
  /** Application sans zone.js : rendu demandé après chaque réponse asynchrone. */
  private readonly cdr = inject(ChangeDetectorRef);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  showPwd = false;
  isLoading = false;
  errorMessage: string | null = null;

  submit(): void {
    if (this.form.invalid || this.isLoading) return;
    this.isLoading = true;
    this.errorMessage = null;
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: (admin) => {
        this.isLoading = false;
        void this.router.navigateByUrl(admin.mustChangePassword ? '/platform/change-password' : '/platform');
      },
      error: (err: unknown) => {
        this.isLoading = false;
        this.errorMessage =
          err instanceof HttpErrorResponse && err.status === 0
            ? 'Impossible de joindre le serveur.'
            : ((err as HttpErrorResponse)?.error?.message ?? 'Connexion impossible.');
        this.cdr.markForCheck();
      }
    });
  }
}
