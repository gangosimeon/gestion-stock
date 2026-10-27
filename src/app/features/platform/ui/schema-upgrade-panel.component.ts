import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { PlatformApiService } from '../data/platform-api.service';
import { SchemaState, SchemaUpgradeStatus, schemaStateLabels } from '../data/platform.models';

/** Intervalle de rafraîchissement pendant une mise à jour en cours. */
export const SCHEMA_POLL_MS = 2000;

/**
 * Mise à jour des bases des entreprises après un déploiement : état de chaque base (à jour, en cours,
 * en échec avec sa cause) et relance. Une entreprise en cours de mise à jour ou en échec est refusée
 * (503) par le serveur.
 */
@Component({
  selector: 'app-schema-upgrade-panel',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <section class="schema card" aria-labelledby="schema-title">
      <div class="schema__header">
        <div>
          <h2 id="schema-title" class="section-title">Mise à jour des bases</h2>
          <p class="schema__hint">
            @if (status()?.automatic) {
              Après chaque démarrage du serveur, les bases sont vérifiées et mises à jour automatiquement.
            } @else {
              Les bases sont mises à jour au démarrage du serveur.
            }
            Une entreprise est inaccessible pendant sa mise à jour, ou tant qu'elle est en échec.
          </p>
        </div>
        <button
          mat-stroked-button
          type="button"
          (click)="restart()"
          [disabled]="starting() || !!status()?.running"
        >
          <mat-icon>sync</mat-icon>
          Relancer la mise à jour
        </button>
      </div>

      @if (status()?.running || starting()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error()) {
        <div class="error" role="alert">{{ error() }}</div>
      }
      @if (status(); as s) {
        <p class="schema__meta" aria-live="polite">
          @if (s.running) {
            Mise à jour en cours…
          } @else if (s.finishedAt) {
            Dernière vérification terminée le {{ s.finishedAt | date: 'dd/MM/yyyy HH:mm:ss' }}.
          } @else {
            Aucune vérification lancée depuis le démarrage du serveur.
          }
          @if (failedCount() > 0) {
            <strong class="schema__alert">{{ failedCount() }} base(s) en échec.</strong>
          }
        </p>
        @if (s.companies.length > 0) {
          <div class="data-table">
            <table class="simple-table">
              <thead>
                <tr><th>Entreprise</th><th>État</th><th>Migrations</th><th>Détail</th><th>Vérifiée le</th></tr>
              </thead>
              <tbody>
                @for (c of s.companies; track c.companyId) {
                  <tr>
                    <td>{{ c.code }}</td>
                    <td><span class="status-badge" [class]="'status-badge status-badge--' + badge(c.state)">{{ labels[c.state] }}</span></td>
                    <td>{{ c.applied }} appliquée(s) / {{ c.pending }} en attente</td>
                    <td class="schema__message">{{ c.message ?? '' }}</td>
                    <td>{{ c.updatedAt | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </section>
  `,
  styles: [
    `
      .schema {
        margin-top: var(--spacing-6);
        padding: var(--spacing-4);
        display: grid;
        gap: var(--spacing-3);
      }
      .schema__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--spacing-4);
        flex-wrap: wrap;
      }
      .schema__hint,
      .schema__meta {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: 13px;
      }
      .schema__alert {
        margin-left: 8px;
        color: var(--color-danger-text);
      }
      .schema__message {
        max-width: 420px;
        overflow-wrap: anywhere;
        color: var(--color-text-secondary);
        font-size: 12px;
      }
      .simple-table {
        width: 100%;
        border-collapse: collapse;
      }
      .simple-table th,
      .simple-table td {
        text-align: left;
        padding: 10px 16px;
        border-bottom: 1px solid var(--color-border-light);
      }
      .simple-table th {
        color: var(--color-text-secondary);
        font-weight: 600;
        font-size: 12px;
      }
    `
  ]
})
export class SchemaUpgradePanelComponent {
  private readonly api = inject(PlatformApiService);

  readonly labels = schemaStateLabels;
  readonly status = signal<SchemaUpgradeStatus | null>(null);
  readonly error = signal<string | null>(null);
  readonly starting = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      if (this.timer) clearTimeout(this.timer);
    });
    this.refresh();
  }

  failedCount(): number {
    return this.status()?.companies.filter((c) => c.state === 'FAILED').length ?? 0;
  }

  badge(state: SchemaState): string {
    return state === 'UP_TO_DATE' ? 'success' : state === 'FAILED' ? 'danger' : 'info';
  }

  restart(): void {
    this.starting.set(true);
    this.error.set(null);
    this.api.startSchemaUpgrade().subscribe({
      next: (status) => {
        this.starting.set(false);
        this.apply(status);
      },
      // Déjà en cours (409) ou refus : l'état réel est relu.
      error: (e: unknown) => {
        this.starting.set(false);
        this.error.set(e instanceof Error ? e.message : 'Relance impossible.');
        this.refresh();
      }
    });
  }

  private refresh(): void {
    this.api.schemaUpgrades().subscribe({
      next: (status) => this.apply(status),
      error: (e: unknown) => this.error.set(e instanceof Error ? e.message : 'État des bases indisponible.')
    });
  }

  /** Rafraîchissement automatique tant que la mise à jour est en cours. */
  private apply(status: SchemaUpgradeStatus): void {
    this.status.set(status);
    if (this.timer) clearTimeout(this.timer);
    if (status.running && !this.destroyed) {
      this.timer = setTimeout(() => this.refresh(), SCHEMA_POLL_MS);
    }
  }
}
