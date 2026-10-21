import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { CompanyBranding } from '../../../core/branding/branding.model';
import { BrandingService } from '../../../core/branding/branding.service';

/**
 * Entreprise suspendue : explication claire plutôt qu'une erreur technique. Les données de l'entreprise
 * sont conservées ; seul GestStock peut rétablir l'accès.
 */
@Component({
  selector: 'app-company-suspended',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="forgot-layout">
      <div class="forgot-panel">
        <div class="forgot-content">
          @if (logo) {
            <img class="suspended-logo" [src]="logo" [alt]="'Logo ' + (branding?.companyName ?? '')" />
          } @else {
            <div class="forgot-icon"><mat-icon>pause_circle</mat-icon></div>
          }
          <h1>Accès suspendu</h1>
          <p class="forgot-desc">
            L'accès de {{ branding?.companyName ?? 'votre entreprise' }} à GestStock est momentanément suspendu.
            Vos données sont conservées. Contactez le support GestStock ou le responsable de votre entreprise pour le
            rétablir.
          </p>
          <a mat-stroked-button routerLink="/login" [queryParams]="company ? { company } : {}">
            <mat-icon>arrow_back</mat-icon>
            Retour à la connexion
          </a>
        </div>
      </div>
    </div>
  `,
  styleUrl: '../forgot-password/forgot-password.component.scss',
  styles: [
    `
      .suspended-logo {
        width: 72px;
        height: 72px;
        object-fit: contain;
        margin: 0 auto 16px;
        display: block;
      }
    `
  ]
})
export class CompanySuspendedComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly brandingService = inject(BrandingService);
  /** Application sans zone.js : rendu demandé après chaque réponse asynchrone. */
  private readonly cdr = inject(ChangeDetectorRef);

  company: string | null = null;
  branding: CompanyBranding | null = null;
  logo: string | null = null;

  ngOnInit(): void {
    this.company = this.route.snapshot.queryParamMap.get('company');
    if (this.company) {
      this.brandingService.loadPublic(this.company).subscribe((b) => {
        this.branding = b;
        this.logo = this.brandingService.logoSrc(b);
        this.cdr.markForCheck();
      });
    }
  }
}
