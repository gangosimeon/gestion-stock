import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';

import { CompanyBranding } from '../../core/branding/branding.model';
import { BrandingService } from '../../core/branding/branding.service';
import { BrandingRequest, planLabels } from '../platform/data/platform.models';
import { BrandingEditorComponent } from '../platform/ui/branding-editor.component';
import { CompanyApiService, CompanyProfile } from './company-api.service';

/**
 * « Mon entreprise » (company:manage) : coordonnées modifiables par l'administrateur ; raison sociale,
 * identifiant fiscal et formule restent gérés par GestStock. Couleurs et logo modifiables seulement si
 * GestStock l'autorise (contrôlé aussi par le backend).
 */
@Component({
  selector: 'app-company-profile-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    BrandingEditorComponent
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Mon entreprise</h1>
          <p class="page-header__subtitle">Coordonnées et identité visuelle</p>
        </div>
      </div>
      @if (loading) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error) {
        <div class="error" role="alert">{{ error }}</div>
      }
      @if (profile; as p) {
        <section class="card profile-card">
          <h2 class="section-title">Informations gérées par GestStock</h2>
          <dl class="profile-facts">
            <div><dt>Raison sociale</dt><dd>{{ p.legalName }}</dd></div>
            <div><dt>Code entreprise</dt><dd>{{ p.code }}</dd></div>
            <div><dt>Identifiant fiscal</dt><dd>{{ p.taxId || '—' }}</dd></div>
            <div><dt>Formule</dt><dd>{{ plans[p.plan] ?? p.plan }}</dd></div>
            <div><dt>Fin d'abonnement</dt><dd>{{ p.subscriptionEndsOn ? (p.subscriptionEndsOn | date: 'dd/MM/yyyy') : '—' }}</dd></div>
          </dl>
        </section>

        <form class="card profile-card" [formGroup]="form" (ngSubmit)="save()">
          <h2 class="section-title">Coordonnées</h2>
          <div class="profile-grid">
            <mat-form-field appearance="outline">
              <mat-label>Nom commercial *</mat-label>
              <input matInput formControlName="tradeName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Téléphone</mat-label>
              <input matInput formControlName="phone" type="tel" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>E-mail</mat-label>
              <input matInput formControlName="email" type="email" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Site web</mat-label>
              <input matInput formControlName="website" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="profile-wide">
              <mat-label>Adresse</mat-label>
              <input matInput formControlName="address" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Ville</mat-label>
              <input matInput formControlName="city" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Pays</mat-label>
              <input matInput formControlName="country" />
            </mat-form-field>
          </div>
          <div class="profile-actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || busy">
              <mat-icon>save</mat-icon>
              Enregistrer
            </button>
          </div>
        </form>

        @if (p.branding.companyCanEdit) {
          <app-branding-editor
            [branding]="p.branding"
            [logoSrc]="logoSrc"
            [busy]="busy"
            (save)="saveBranding($event)"
            (uploadLogo)="uploadLogo($event)"
            (deleteLogo)="deleteLogo()"
          />
        } @else {
          <section class="card profile-card">
            <h2 class="section-title">Identité visuelle</h2>
            <p class="profile-help">
              Les couleurs et le logo de votre entreprise sont gérés par GestStock. Contactez le support pour les modifier.
            </p>
          </section>
        }
      }
    </div>
  `,
  styles: [
    `
      .page {
        display: grid;
        gap: 16px;
        padding: var(--page-padding);
      }
      .profile-card {
        padding: 16px;
      }
      .profile-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
        gap: 4px 16px;
      }
      .profile-wide {
        grid-column: 1 / -1;
      }
      .profile-actions {
        display: flex;
        justify-content: flex-end;
      }
      .profile-facts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin: 0;
      }
      .profile-facts dt {
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .profile-facts dd {
        margin: 2px 0 0;
        font-weight: 600;
      }
      .profile-help {
        color: var(--color-text-secondary);
        margin: 0;
      }
    `
  ]
})
export class CompanyProfilePageComponent implements OnInit {
  private readonly api = inject(CompanyApiService);
  private readonly brandingService = inject(BrandingService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  /** Application sans zone.js : rendu demandé après chaque réponse asynchrone. */
  private readonly cdr = inject(ChangeDetectorRef);

  readonly plans: Partial<Record<string, string>> = planLabels;

  profile: CompanyProfile | null = null;
  loading = true;
  busy = false;
  error: string | null = null;

  readonly form = this.fb.nonNullable.group({
    tradeName: ['', [Validators.required, Validators.maxLength(150)]],
    phone: ['', [Validators.maxLength(30), Validators.pattern(/^[0-9+() .-]*$/)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    website: ['', Validators.maxLength(200)],
    address: ['', Validators.maxLength(255)],
    city: ['', Validators.maxLength(100)],
    country: ['', Validators.maxLength(100)]
  });

  get logoSrc(): string | null {
    return this.brandingService.logoSrc(this.profile?.branding ?? null);
  }

  ngOnInit(): void {
    this.api.profile().subscribe({
      next: (p) => this.setProfile(p),
      error: (e: unknown) => {
        this.loading = false;
        this.error = e instanceof Error ? e.message : 'Chargement impossible.';
        this.cdr.markForCheck();
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const blank = (s: string) => (s.trim() ? s.trim() : null);
    this.busy = true;
    this.api
      .updateProfile({
        tradeName: v.tradeName.trim(),
        phone: blank(v.phone),
        email: blank(v.email),
        website: blank(v.website),
        address: blank(v.address),
        city: blank(v.city),
        country: blank(v.country)
      })
      .subscribe({
        next: (p) => {
          this.setProfile(p);
          this.done('Coordonnées enregistrées');
          // Nom affiché dans la barre latérale.
          this.brandingService.load().subscribe();
        },
        error: (e: unknown) => this.fail(e)
      });
  }

  saveBranding(request: BrandingRequest): void {
    this.applyBranding(this.api.updateBranding(request), 'Personnalisation enregistrée');
  }

  uploadLogo(file: File): void {
    this.applyBranding(this.api.uploadLogo(file), 'Logo enregistré');
  }

  deleteLogo(): void {
    this.applyBranding(this.api.deleteLogo(), 'Logo retiré');
  }

  /** Nouveau thème appliqué tout de suite à l'interface (et à son cache). */
  private applyBranding(request: Observable<CompanyBranding>, message: string): void {
    this.busy = true;
    request.subscribe({
      next: (branding) => {
        if (this.profile) this.profile = { ...this.profile, branding };
        this.cdr.markForCheck();
        this.brandingService.load().subscribe();
        this.done(message);
      },
      error: (e: unknown) => this.fail(e)
    });
  }

  private setProfile(p: CompanyProfile): void {
    this.loading = false;
    this.busy = false;
    this.profile = p;
    this.cdr.markForCheck();
    this.form.patchValue({
      tradeName: p.tradeName,
      phone: p.phone ?? '',
      email: p.email ?? '',
      website: p.website ?? '',
      address: p.address ?? '',
      city: p.city ?? '',
      country: p.country ?? ''
    });
  }

  private done(message: string): void {
    this.busy = false;
    this.cdr.markForCheck();
    this.snackbar.open(message, 'OK', { duration: 2500 });
  }

  private fail(e: unknown): void {
    this.busy = false;
    this.cdr.markForCheck();
    this.snackbar.open(e instanceof Error ? e.message : 'Opération impossible.', 'OK', { duration: 4000 });
  }
}
