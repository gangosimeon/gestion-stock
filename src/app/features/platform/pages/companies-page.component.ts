import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { ServerTable } from '../../../shared/table/server-table';
import { PlatformApiService } from '../data/platform-api.service';
import { CompanyStatus, companyStatusLabels, planLabels } from '../data/platform.models';

/** Liste des entreprises : recherche, filtre de statut, tri et pagination côté serveur. */
@Component({
  selector: 'app-companies-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSortModule,
    MatTableModule
  ],
  template: `
    <div class="page-header">
      <h1 class="page-header__title">Entreprises</h1>
      <div class="page-header__spacer"></div>
      <a mat-flat-button color="primary" routerLink="/platform/companies/new">
        <mat-icon>add_business</mat-icon>
        Nouvelle entreprise
      </a>
    </div>

    @if (table.state$ | async; as s) {
      @if (s.loading) {
        <mat-progress-bar mode="indeterminate" />
      }
      <div class="data-table-toolbar" [formGroup]="table.filters">
        <mat-form-field appearance="outline" class="search filter-bar__wide" subscriptSizing="dynamic">
          <mat-label>Rechercher</mat-label>
          <input matInput [formControl]="table.search" placeholder="Code, nom, ville, propriétaire" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Statut</mat-label>
          <mat-select formControlName="status">
            <mat-option [value]="null">Tous</mat-option>
            @for (o of statusOptions; track o.value) {
              <mat-option [value]="o.value">{{ o.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (s.error) {
          <div class="error">{{ s.error }}</div>
        }
      </div>

      <div class="data-table">
        <table mat-table [dataSource]="s.rows" matSort (matSortChange)="table.onSort($event)">
          <ng-container matColumnDef="number">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>N°</th>
            <td mat-cell *matCellDef="let c">{{ c.number }}</td>
          </ng-container>
          <ng-container matColumnDef="tradeName">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Entreprise</th>
            <td mat-cell *matCellDef="let c">
              <a [routerLink]="['/platform/companies', c.id]"><strong>{{ c.tradeName }}</strong></a>
              <div class="sub">{{ c.legalName }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Code</th>
            <td mat-cell *matCellDef="let c">{{ c.code }}</td>
          </ng-container>
          <ng-container matColumnDef="plan">
            <th mat-header-cell *matHeaderCellDef>Formule</th>
            <td mat-cell *matCellDef="let c">{{ plans[c.plan] ?? c.plan }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Statut</th>
            <td mat-cell *matCellDef="let c">
              <span class="badge" [class.badge--success]="c.status === 'ACTIVE'" [class.badge--danger]="c.status === 'FAILED'"
                    [class.badge--neutral]="c.status === 'SUSPENDED'" [class.badge--info]="c.status === 'PENDING' || c.status === 'PROVISIONING'">
                {{ statusLabels[c.status] }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="subscriptionEndsOn">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Fin d'abonnement</th>
            <td mat-cell *matCellDef="let c">{{ c.subscriptionEndsOn ? (c.subscriptionEndsOn | date: 'dd/MM/yyyy') : '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Créée le</th>
            <td mat-cell *matCellDef="let c">{{ c.createdAt | date: 'dd/MM/yyyy' }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
        @if (!s.loading && s.rows.length === 0) {
          <div class="data-table-empty">Aucune entreprise.</div>
        }
        <mat-paginator
          [length]="s.total"
          [pageIndex]="table.pageIndex"
          [pageSize]="table.pageSize"
          [pageSizeOptions]="table.pageSizeOptions"
          (page)="table.onPage($event)"
          showFirstLastButtons
        />
      </div>
    }
  `,
  styles: ['.sub { font-size: 12px; color: var(--color-text-secondary); }']
})
export class CompaniesPageComponent {
  private readonly api = inject(PlatformApiService);

  readonly columns = ['number', 'tradeName', 'code', 'plan', 'status', 'subscriptionEndsOn', 'createdAt'] as const;
  readonly statusLabels: Record<string, string> = companyStatusLabels;
  readonly plans: Partial<Record<string, string>> = planLabels;
  readonly statusOptions = Object.entries(companyStatusLabels).map(([value, label]) => ({ value: value as CompanyStatus, label }));

  readonly table = new ServerTable((query) => this.api.companies(query, query.filters), {
    filters: new FormGroup({ status: new FormControl<CompanyStatus | null>(null) }),
    sortFields: {
      number: 'number',
      tradeName: 'tradeName',
      code: 'code',
      status: 'status',
      subscriptionEndsOn: 'subscriptionEndsOn',
      createdAt: 'createdAt'
    }
  });
}
