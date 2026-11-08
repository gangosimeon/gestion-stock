import { Clipboard } from '@angular/cdk/clipboard';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PlatformApiService } from '../data/platform-api.service';
import {
  ALL_INTEGRATION_SCOPES,
  integrationClientStatusLabels,
  IntegrationClientListItem
} from '../data/platform.models';

/** Gestion des clients OAuth d'intégration (Super Admin, lot 2 ; G8). */
@Component({
  selector: 'app-integration-clients-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Clients d'intégration</h1>
      <div class="page-header__spacer"></div>
      @if (!showCreate()) {
        <button mat-flat-button color="primary" (click)="showCreate.set(true)">
          <mat-icon>add</mat-icon>
          Nouveau client
        </button>
      }
    </div>

    <!-- Formulaire de création ───────────────────────────────────────── -->
    @if (showCreate()) {
      <div class="create-panel">
        <h2>Nouveau client OAuth</h2>
        <form [formGroup]="createForm" (ngSubmit)="submitCreate()" class="create-form">

          <mat-form-field appearance="outline">
            <mat-label>Identifiant client (client_id)</mat-label>
            <input matInput formControlName="clientId" placeholder="mon-partenaire-prod" />
            <mat-hint>4–64 caractères : minuscules, chiffres, tirets</mat-hint>
            @if (createForm.controls.clientId.invalid && createForm.controls.clientId.touched) {
              <mat-error>Format invalide (ex : jecreemaboutique-prod)</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Nom affiché</mat-label>
            <input matInput formControlName="name" placeholder="JeCréeMaBoutique" />
            @if (createForm.controls.name.invalid && createForm.controls.name.touched) {
              <mat-error>Obligatoire (100 caractères max)</mat-error>
            }
          </mat-form-field>

          <!-- URIs de retour ─────────────────────────────────────────── -->
          <div class="field-group">
            <div class="field-group__label">URLs de retour OAuth *</div>
            @for (uri of uriControls.controls; track $index) {
              <div class="uri-row">
                <mat-form-field appearance="outline" class="uri-field">
                  <input matInput [formControl]="asControl(uri)" placeholder="https://exemple.com/callback" />
                  @if (uri.invalid && uri.touched) {
                    <mat-error>https:// ou http://localhost, sans fragment</mat-error>
                  }
                </mat-form-field>
                @if (uriControls.length > 1) {
                  <button mat-icon-button type="button" (click)="removeUri($index)" matTooltip="Supprimer">
                    <mat-icon>remove_circle_outline</mat-icon>
                  </button>
                }
              </div>
            }
            <button mat-button type="button" (click)="addUri()">
              <mat-icon>add</mat-icon>
              Ajouter une URL
            </button>
          </div>

          <!-- Portées ────────────────────────────────────────────────── -->
          <div class="field-group">
            <div class="field-group__label">Portées autorisées (toutes par défaut)</div>
            <div class="scopes-grid">
              @for (scope of allScopes; track scope) {
                <mat-checkbox [formControl]="scopeControl(scope)">{{ scope }}</mat-checkbox>
              }
            </div>
          </div>

          @if (createError()) {
            <div class="form-error">{{ createError() }}</div>
          }

          <div class="form-actions">
            <button mat-stroked-button type="button" (click)="cancelCreate()">Annuler</button>
            <button mat-flat-button color="primary" type="submit" [disabled]="creating()">
              @if (creating()) { Création… } @else { Créer }
            </button>
          </div>
        </form>
      </div>
    }

    <!-- Secret affiché après création ──────────────────────────────── -->
    @if (revealedSecret()) {
      <div class="secret-banner">
        <mat-icon class="secret-banner__icon">key</mat-icon>
        <div class="secret-banner__body">
          <strong>Secret affiché une seule fois — notez-le immédiatement.</strong>
          <code class="secret-banner__value">{{ revealedSecret() }}</code>
        </div>
        <button mat-stroked-button (click)="copySecret()">
          <mat-icon>content_copy</mat-icon>
          Copier
        </button>
        <button mat-icon-button (click)="revealedSecret.set(null)" matTooltip="Fermer">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }

    <!-- Tableau ─────────────────────────────────────────────────────── -->
    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    @if (loadError()) {
      <div class="form-error">{{ loadError() }}</div>
    }

    <div class="data-table">
      <table mat-table [dataSource]="clients()">

        <ng-container matColumnDef="clientId">
          <th mat-header-cell *matHeaderCellDef>Client ID</th>
          <td mat-cell *matCellDef="let c"><code>{{ c.clientId }}</code></td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Nom</th>
          <td mat-cell *matCellDef="let c">{{ c.name }}</td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Statut</th>
          <td mat-cell *matCellDef="let c">
            <span class="badge" [class.badge--success]="c.status === 'ACTIVE'" [class.badge--neutral]="c.status === 'DISABLED'">
              {{ statusLabels[c.status] ?? c.status }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef>Créé le</th>
          <td mat-cell *matCellDef="let c">{{ c.createdAt | date: 'dd/MM/yyyy' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let c">
            <div class="row-actions">
              <button mat-stroked-button (click)="resetSecret(c)" [disabled]="actionInProgress()">
                <mat-icon>refresh</mat-icon>
                Réinitialiser le secret
              </button>
              @if (c.status === 'ACTIVE') {
                <button mat-stroked-button color="warn" (click)="disable(c)" [disabled]="actionInProgress()">
                  <mat-icon>block</mat-icon>
                  Désactiver
                </button>
              } @else {
                <button mat-stroked-button (click)="enable(c)" [disabled]="actionInProgress()">
                  <mat-icon>check_circle_outline</mat-icon>
                  Réactiver
                </button>
              }
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
      @if (!loading() && clients().length === 0) {
        <div class="data-table-empty">Aucun client d'intégration.</div>
      }
    </div>
  `,
  styles: [`
    .create-panel {
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #e0e0e0);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .create-panel h2 { margin: 0 0 20px; font-size: 18px; }
    .create-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 600px;
    }
    .field-group { display: flex; flex-direction: column; gap: 8px; }
    .field-group__label { font-size: 14px; font-weight: 500; color: var(--color-text-secondary, #666); }
    .uri-row { display: flex; align-items: flex-start; gap: 8px; }
    .uri-field { flex: 1; }
    .scopes-grid { display: flex; flex-wrap: wrap; gap: 8px 24px; }
    .form-actions { display: flex; gap: 12px; margin-top: 8px; }
    .form-error { color: var(--color-danger, #d32f2f); font-size: 14px; }
    .secret-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #fff8e1;
      border: 1px solid #ffe082;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .secret-banner__icon { color: #f57c00; }
    .secret-banner__body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .secret-banner__value {
      font-family: monospace;
      font-size: 13px;
      background: #fff3e0;
      padding: 6px 10px;
      border-radius: 4px;
      word-break: break-all;
    }
    .row-actions { display: flex; gap: 8px; justify-content: flex-end; }
  `]
})
export class IntegrationClientsPageComponent {
  private readonly api = inject(PlatformApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly clipboard = inject(Clipboard);

  readonly allScopes = ALL_INTEGRATION_SCOPES;
  readonly statusLabels: Record<string, string> = integrationClientStatusLabels;
  readonly columns = ['clientId', 'name', 'status', 'createdAt', 'actions'] as const;

  // ── état ──────────────────────────────────────────────────────────────────
  readonly clients = signal<IntegrationClientListItem[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly showCreate = signal(false);
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly revealedSecret = signal<string | null>(null);
  readonly actionInProgress = signal(false);

  // ── formulaire création ───────────────────────────────────────────────────
  readonly createForm = new FormGroup({
    clientId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9-]{2,62}[a-z0-9]$/)]
    }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    uris: new FormArray([this.newUriControl()]),
    scopes: new FormGroup(
      Object.fromEntries(ALL_INTEGRATION_SCOPES.map((s) => [s, new FormControl(true, { nonNullable: true })]))
    )
  });

  get uriControls(): FormArray { return this.createForm.controls.uris; }

  scopeControl(scope: string): FormControl<boolean> {
    return this.createForm.controls.scopes.get(scope) as FormControl<boolean>;
  }

  asControl(c: unknown): FormControl<string> { return c as FormControl<string>; }

  constructor() { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api.integrationClients().subscribe({
      next: (list) => { this.clients.set(list); this.loading.set(false); },
      error: (e: Error) => { this.loadError.set(e.message); this.loading.set(false); }
    });
  }

  addUri(): void {
    this.uriControls.push(this.newUriControl());
  }

  removeUri(i: number): void {
    this.uriControls.removeAt(i);
  }

  cancelCreate(): void {
    this.showCreate.set(false);
    this.createForm.reset();
    this.createError.set(null);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.getRawValue();
    const selectedScopes = ALL_INTEGRATION_SCOPES.filter((s) => v.scopes[s]);
    this.creating.set(true);
    this.createError.set(null);
    this.api.createIntegrationClient({
      clientId: v.clientId,
      name: v.name,
      redirectUris: v.uris.filter((u) => u.trim()),
      allowedScopes: selectedScopes.length === ALL_INTEGRATION_SCOPES.length ? undefined : selectedScopes
    }).subscribe({
      next: (resp) => {
        this.creating.set(false);
        this.showCreate.set(false);
        this.createForm.reset();
        this.clients.update((list) => [resp.client, ...list]);
        this.revealedSecret.set(resp.secret);
      },
      error: (e: Error) => { this.creating.set(false); this.createError.set(e.message); }
    });
  }

  resetSecret(c: IntegrationClientListItem): void {
    if (!confirm(`Réinitialiser le secret de « ${c.name} » ? L'ancien secret cessera immédiatement de fonctionner.`)) return;
    this.actionInProgress.set(true);
    this.revealedSecret.set(null);
    this.api.resetIntegrationClientSecret(c.id).subscribe({
      next: (resp) => { this.actionInProgress.set(false); this.revealedSecret.set(resp.secret); },
      error: (e: Error) => { this.actionInProgress.set(false); this.snack.open(e.message, 'Fermer', { duration: 5000 }); }
    });
  }

  disable(c: IntegrationClientListItem): void {
    if (!confirm(`Désactiver « ${c.name} » ?`)) return;
    this.actionInProgress.set(true);
    this.api.disableIntegrationClient(c.id).subscribe({
      next: () => { this.actionInProgress.set(false); this.updateStatus(c.id, 'DISABLED'); },
      error: (e: Error) => { this.actionInProgress.set(false); this.snack.open(e.message, 'Fermer', { duration: 5000 }); }
    });
  }

  enable(c: IntegrationClientListItem): void {
    this.actionInProgress.set(true);
    this.api.enableIntegrationClient(c.id).subscribe({
      next: () => { this.actionInProgress.set(false); this.updateStatus(c.id, 'ACTIVE'); },
      error: (e: Error) => { this.actionInProgress.set(false); this.snack.open(e.message, 'Fermer', { duration: 5000 }); }
    });
  }

  copySecret(): void {
    const s = this.revealedSecret();
    if (s) {
      this.clipboard.copy(s);
      this.snack.open('Secret copié dans le presse-papier.', 'OK', { duration: 3000 });
    }
  }

  private newUriControl(): FormControl<string> {
    return new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^(https:\/\/[^#]+|http:\/\/localhost[^#]*)$/)]
    });
  }

  private updateStatus(id: string, status: 'ACTIVE' | 'DISABLED'): void {
    this.clients.update((list) => list.map((c) => (c.id === id ? { ...c, status } : c)));
  }
}
