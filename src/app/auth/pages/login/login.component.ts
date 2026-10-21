import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CompanyBranding } from '../../../core/branding/branding.model';
import { BrandingService } from '../../../core/branding/branding.service';
import { AuthService, isCompanySuspended } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly brandingService = inject(BrandingService);
  private readonly destroyRef = inject(DestroyRef);
  /** Application sans zone.js : rendu demandé après chaque réponse asynchrone. */
  private readonly cdr = inject(ChangeDetectorRef);

  /** Comptes de démonstration : affichés hors production uniquement. */
  readonly showDemoHint = !environment.production;

  /** Marque de l'entreprise saisie (aperçu ; ne donne aucun droit). */
  preview: CompanyBranding | null = null;
  previewLogo: string | null = null;

  readonly form = this.fb.nonNullable.group({
    company: ['', [Validators.pattern(/^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/)]],
    username: ['', Validators.required],
    password: ['', Validators.required],
    rememberMe: [false]
  });

  isLoading = false;
  showPwd = false;
  errorMessage: string | null = null;

  get f() { return this.form.controls; }

  ngOnInit(): void {
    // Lien reçu (?company=…), sinon dernière entreprise utilisée sur ce navigateur.
    const code = this.route.snapshot.queryParamMap.get('company') ?? this.auth.lastCompanyCode ?? '';
    this.form.controls.company.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) => {
          const c = value.trim().toLowerCase();
          return c && this.form.controls.company.valid ? this.brandingService.loadPublic(c) : of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((branding) => {
        this.preview = branding;
        this.previewLogo = this.brandingService.logoSrc(branding);
        this.cdr.markForCheck();
      });
    this.form.controls.company.setValue(code.trim().toLowerCase());
  }

  submit(): void {
    if (this.form.invalid || this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = null;

    const { company, username, password, rememberMe } = this.form.getRawValue();

    this.auth.login(username, password, rememberMe, company).subscribe({
      next: () => {
        this.isLoading = false;
        void this.router.navigateByUrl('/dashboard');
      },
      error: (err: unknown) => {
        this.isLoading = false;
        if (isCompanySuspended(err)) {
          void this.router.navigate(['/company-suspended'], { queryParams: { company } });
          return;
        }
        this.errorMessage = this.auth.loginErrorMessage(err);
      }
    });
  }
}
