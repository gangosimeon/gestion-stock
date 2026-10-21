import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../services/auth.service';

/** Mot de passe et confirmation identiques. */
function samePasswords(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

/**
 * Définition du mot de passe par lien d'accès (`/activate?company=…&token=…`) : activation du compte
 * initial d'une entreprise ou réinitialisation demandée par un administrateur. Lien à usage unique ;
 * le backend applique la politique de mot de passe.
 */
@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './activate.component.html',
  styleUrl: '../forgot-password/forgot-password.component.scss'
})
export class ActivateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  /** Application sans zone.js : rendu demandé après chaque réponse asynchrone. */
  private readonly cdr = inject(ChangeDetectorRef);

  company = '';
  private token = '';

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required]
    },
    { validators: samePasswords }
  );

  showPwd = false;
  isLoading = false;
  done = false;
  errorMessage: string | null = null;

  get linkIsComplete(): boolean {
    return !!this.company && !!this.token;
  }

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.company = (params.get('company') ?? '').trim().toLowerCase();
    this.token = params.get('token') ?? '';
  }

  submit(): void {
    if (this.form.invalid || this.isLoading || !this.linkIsComplete) return;
    this.isLoading = true;
    this.errorMessage = null;
    this.auth.activate(this.company, this.token, this.form.controls.password.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.done = true;
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.isLoading = false;
        this.errorMessage =
          err instanceof HttpErrorResponse && err.error?.message
            ? (err.error.message as string)
            : 'Impossible de définir le mot de passe. Réessayez.';
        this.cdr.markForCheck();
      }
    });
  }

  goToLogin(): void {
    void this.router.navigate(['/login'], { queryParams: { company: this.company } });
  }
}
