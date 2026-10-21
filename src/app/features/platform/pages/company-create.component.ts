import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PlatformApiService } from '../data/platform-api.service';
import { CompanyRequest } from '../data/platform.models';
import { CompanyFormComponent } from '../ui/company-form.component';

/**
 * Création d'une entreprise. Une clé d'idempotence est tirée à l'ouverture du formulaire : un double clic
 * ou une nouvelle tentative après une coupure réseau renvoie l'entreprise déjà créée, jamais un doublon.
 */
@Component({
  selector: 'app-company-create',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, CompanyFormComponent],
  template: `
    <div class="page-header">
      <a mat-icon-button routerLink="/platform/companies" aria-label="Retour à la liste"><mat-icon>arrow_back</mat-icon></a>
      <div>
        <h1 class="page-header__title">Nouvelle entreprise</h1>
        <p class="page-header__subtitle">
          La base dédiée, le schéma et le compte administrateur sont créés automatiquement.
        </p>
      </div>
    </div>
    <app-company-form [busy]="busy" [error]="error" (submitted)="create($event)" />
  `
})
export class CompanyCreateComponent {
  private readonly api = inject(PlatformApiService);
  private readonly router = inject(Router);
  /** Application sans zone.js : rendu demandé après chaque réponse asynchrone. */
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly idempotencyKey = `ui-${crypto.randomUUID()}`;

  busy = false;
  error: string | null = null;

  create(request: CompanyRequest): void {
    this.busy = true;
    this.error = null;
    this.api.create(request, this.idempotencyKey).subscribe({
      next: (company) => void this.router.navigate(['/platform/companies', company.id]),
      error: (e: unknown) => {
        this.busy = false;
        this.error = e instanceof Error ? e.message : 'Création impossible.';
        this.cdr.markForCheck();
      }
    });
  }
}
