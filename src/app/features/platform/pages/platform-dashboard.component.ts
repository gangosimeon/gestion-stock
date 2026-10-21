import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { catchError, map, of, startWith } from 'rxjs';

import { PlatformApiService } from '../data/platform-api.service';
import { PlatformStats, companyStatusLabels } from '../data/platform.models';

/** Tableau de bord global de la plateforme. */
@Component({
  selector: 'app-platform-dashboard',
  standalone: true,
  imports: [AsyncPipe, DatePipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-header__title">Tableau de bord</h1>
        <p class="page-header__subtitle">Vue d'ensemble des entreprises de la plateforme</p>
      </div>
      <div class="page-header__spacer"></div>
      <a mat-flat-button color="primary" routerLink="/platform/companies/new">
        <mat-icon>add_business</mat-icon>
        Nouvelle entreprise
      </a>
    </div>

    @if (vm$ | async; as vm) {
      @if (vm.loading) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (vm.error) {
        <div class="error" role="alert">{{ vm.error }}</div>
      }
      @if (vm.stats; as s) {
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--blue"><mat-icon>apartment</mat-icon></div>
            <span class="kpi-card__label">Entreprises</span>
            <span class="kpi-card__value">{{ s.total }}</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--green"><mat-icon>check_circle</mat-icon></div>
            <span class="kpi-card__label">Actives</span>
            <span class="kpi-card__value">{{ s.active }}</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--purple"><mat-icon>pause_circle</mat-icon></div>
            <span class="kpi-card__label">Suspendues</span>
            <span class="kpi-card__value">{{ s.suspended }}</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--red"><mat-icon>error_outline</mat-icon></div>
            <span class="kpi-card__label">Création en échec</span>
            <span class="kpi-card__value">{{ s.failed }}</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--blue"><mat-icon>hourglass_top</mat-icon></div>
            <span class="kpi-card__label">En cours de création</span>
            <span class="kpi-card__value">{{ s.provisioning }}</span>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--purple"><mat-icon>event_busy</mat-icon></div>
            <span class="kpi-card__label">Abonnements expirant sous 30 jours</span>
            <span class="kpi-card__value">{{ s.expiringWithin30Days }}</span>
          </div>
        </div>

        <h2 class="section-title">Dernières entreprises</h2>
        <div class="data-table card">
          <table class="simple-table">
            <thead>
              <tr><th>Entreprise</th><th>Code</th><th>Statut</th><th>Créée le</th></tr>
            </thead>
            <tbody>
              @for (c of s.recent; track c.id) {
                <tr>
                  <td><a [routerLink]="['/platform/companies', c.id]">{{ c.tradeName }}</a></td>
                  <td>{{ c.code }}</td>
                  <td>{{ statusLabels[c.status] }}</td>
                  <td>{{ c.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="data-table-empty">Aucune entreprise.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: [
    `
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
export class PlatformDashboardComponent {
  private readonly api = inject(PlatformApiService);

  readonly statusLabels: Record<string, string> = companyStatusLabels;

  readonly vm$ = this.api.stats().pipe(
    map((stats) => ({ loading: false, error: null as string | null, stats: stats as PlatformStats | null })),
    startWith({ loading: true, error: null, stats: null }),
    catchError((e: unknown) => of({ loading: false, error: e instanceof Error ? e.message : 'Erreur', stats: null }))
  );
}
