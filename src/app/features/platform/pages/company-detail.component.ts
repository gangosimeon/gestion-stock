import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Observable, Subscription, filter, switchMap, takeWhile, timer } from 'rxjs';

import { CompanyBranding } from '../../../core/branding/branding.model';
import { BrandingService } from '../../../core/branding/branding.service';
import { PlatformApiService } from '../data/platform-api.service';
import {
  ActivationLink,
  BrandingRequest,
  Company,
  CompanyRequest,
  companyStatusLabels,
  planLabels,
  provisioningStepLabels
} from '../data/platform.models';
import { BrandingEditorComponent } from '../ui/branding-editor.component';
import { CompanyFormComponent } from '../ui/company-form.component';
import { PlatformAuditComponent } from './platform-audit.component';

/** Fiche d'une entreprise : informations, création de la base, accès, personnalisation, journal. */
@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatTabsModule,
    BrandingEditorComponent,
    CompanyFormComponent,
    PlatformAuditComponent
  ],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.scss'
})
export class CompanyDetailComponent implements OnInit {
  private readonly api = inject(PlatformApiService);
  private readonly brandingService = inject(BrandingService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackbar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  /** Application sans zone.js : rendu demandé après chaque réponse asynchrone. */
  private readonly cdr = inject(ChangeDetectorRef);

  readonly statusLabels: Record<string, string> = companyStatusLabels;
  readonly plans: Partial<Record<string, string>> = planLabels;
  readonly stepLabels: Partial<Record<string, string>> = provisioningStepLabels;

  company: Company | null = null;
  branding: CompanyBranding | null = null;
  loading = true;
  busy = false;
  error: string | null = null;

  /** Lien d'activation : affiché une seule fois, jamais conservé. */
  activationLink: ActivationLink | null = null;
  /** Onglet affiché (fixé dès la création du groupe d’onglets : premier rendu stable). */
  selectedTab = 0;
  confirmSuspend = false;
  confirmReactivate = false;
  readonly suspendReason = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(300)] });

  private poll: Subscription | null = null;

  get id(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
  }

  get activationUrl(): string | null {
    const link = this.activationLink;
    if (!link) return null;
    const params = new URLSearchParams({ company: link.companyCode, token: link.token });
    return `${window.location.origin}/activate?${params.toString()}`;
  }

  get logoSrc(): string | null {
    return this.brandingService.logoSrc(this.branding);
  }

  get creating(): boolean {
    return this.company?.status === 'PENDING' || this.company?.status === 'PROVISIONING';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.company(this.id).subscribe({
      next: (company) => this.setCompany(company),
      error: (e: unknown) => {
        this.loading = false;
        this.error = e instanceof Error ? e.message : 'Entreprise introuvable.';
        this.cdr.markForCheck();
      }
    });
    this.api.branding(this.id).subscribe({
      next: (b) => {
        this.branding = b;
        this.cdr.markForCheck();
      },
      error: () => {
        this.branding = null;
        this.cdr.markForCheck();
      }
    });
  }

  update(request: CompanyRequest): void {
    this.run(this.api.update(this.id, request), 'Informations enregistrées');
  }

  retry(): void {
    this.run(this.api.retryProvisioning(this.id), 'Création relancée');
  }

  suspend(): void {
    if (this.suspendReason.invalid) return;
    this.run(this.api.suspend(this.id, this.suspendReason.value.trim()), 'Entreprise suspendue', () => {
      this.confirmSuspend = false;
      this.suspendReason.reset('');
    });
  }

  reactivate(): void {
    this.run(this.api.reactivate(this.id), 'Entreprise réactivée', () => (this.confirmReactivate = false));
  }

  generateLink(): void {
    this.busy = true;
    this.api.adminAccessLink(this.id).subscribe({
      next: (link) => {
        this.busy = false;
        this.activationLink = link;
        this.cdr.markForCheck();
      },
      error: (e: unknown) => this.fail(e)
    });
  }

  copyLink(): void {
    const url = this.activationUrl;
    if (!url) return;
    navigator.clipboard?.writeText(url).then(
      () => this.snackbar.open('Lien copié', 'OK', { duration: 2000 }),
      () => this.snackbar.open('Copie impossible : sélectionnez le lien manuellement.', 'OK', { duration: 3000 })
    );
  }

  saveBranding(request: BrandingRequest): void {
    this.busy = true;
    this.api.updateBranding(this.id, request).subscribe({
      next: (b) => this.brandingSaved(b, 'Personnalisation enregistrée'),
      error: (e: unknown) => this.fail(e)
    });
  }

  uploadLogo(file: File): void {
    this.busy = true;
    this.api.uploadLogo(this.id, file).subscribe({
      next: (b) => this.brandingSaved(b, 'Logo enregistré'),
      error: (e: unknown) => this.fail(e)
    });
  }

  deleteLogo(): void {
    this.busy = true;
    this.api.deleteLogo(this.id).subscribe({
      next: (b) => this.brandingSaved(b, 'Logo retiré'),
      error: (e: unknown) => this.fail(e)
    });
  }

  setPermission(allowed: boolean): void {
    this.api.setBrandingPermission(this.id, allowed).subscribe({
      next: (b) => this.brandingSaved(b, allowed ? 'Personnalisation ouverte à l’entreprise' : 'Personnalisation réservée à GestStock'),
      error: (e: unknown) => this.fail(e)
    });
  }

  private brandingSaved(branding: CompanyBranding, message: string): void {
    this.busy = false;
    this.branding = branding;
    this.cdr.markForCheck();
    this.snackbar.open(message, 'OK', { duration: 2500 });
  }

  private run(request: Observable<Company>, message: string, after?: () => void): void {
    this.busy = true;
    this.error = null;
    request.subscribe({
      next: (company) => {
        this.busy = false;
        this.setCompany(company);
        after?.();
        this.snackbar.open(message, 'OK', { duration: 2500 });
      },
      error: (e: unknown) => this.fail(e)
    });
  }

  private fail(e: unknown): void {
    this.busy = false;
    this.cdr.markForCheck();
    this.snackbar.open(e instanceof Error ? e.message : 'Opération impossible.', 'OK', { duration: 4000 });
  }

  /** Pendant la création, la fiche est relue toutes les 2 s jusqu'au résultat. */
  private setCompany(company: Company): void {
    this.loading = false;
    this.company = company;
    this.cdr.markForCheck();
    if (this.creating && !this.poll) {
      this.poll = timer(2000, 2000)
        .pipe(
          switchMap(() => this.api.company(this.id)),
          takeWhile((c) => c.status === 'PENDING' || c.status === 'PROVISIONING', true),
          filter(Boolean),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (c) => {
            this.company = c;
            this.cdr.markForCheck();
          },
          complete: () => (this.poll = null)
        });
    }
  }
}
