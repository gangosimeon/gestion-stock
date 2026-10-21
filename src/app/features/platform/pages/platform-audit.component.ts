import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';

import { ServerTable } from '../../../shared/table/server-table';
import { PlatformApiService } from '../data/platform-api.service';
import { PlatformAuditEntry } from '../data/platform.models';

/** Journal des opérations d'administration (toute la plateforme, ou une entreprise). */
@Component({
  selector: 'app-platform-audit',
  standalone: true,
  imports: [AsyncPipe, DatePipe, RouterLink, MatPaginatorModule, MatProgressBarModule, MatTableModule],
  template: `
    @if (!companyId) {
      <div class="page-header">
        <h1 class="page-header__title">Journal de la plateforme</h1>
      </div>
    }
    @if (table?.state$ | async; as s) {
      @if (s.loading) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (s.error) {
        <div class="error">{{ s.error }}</div>
      }
      <div class="data-table">
        <table mat-table [dataSource]="s.rows">
          <ng-container matColumnDef="occurredAt">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let e">{{ e.occurredAt | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
          </ng-container>
          <ng-container matColumnDef="actor">
            <th mat-header-cell *matHeaderCellDef>Acteur</th>
            <td mat-cell *matCellDef="let e">{{ e.actorName ?? 'Système' }}</td>
          </ng-container>
          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef>Action</th>
            <td mat-cell *matCellDef="let e"><code>{{ e.action }}</code></td>
          </ng-container>
          <ng-container matColumnDef="company">
            <th mat-header-cell *matHeaderCellDef>Entreprise</th>
            <td mat-cell *matCellDef="let e">
              @if (e.companyId) {
                <a [routerLink]="['/platform/companies', e.companyId]">{{ e.companyCode ?? e.companyId }}</a>
              } @else { — }
            </td>
          </ng-container>
          <ng-container matColumnDef="details">
            <th mat-header-cell *matHeaderCellDef>Détails</th>
            <td mat-cell *matCellDef="let e">{{ e.details ?? '' }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
        @if (!s.loading && s.rows.length === 0) {
          <div class="data-table-empty">Aucun événement.</div>
        }
        <mat-paginator
          [length]="s.total"
          [pageIndex]="table!.pageIndex"
          [pageSize]="table!.pageSize"
          [pageSizeOptions]="table!.pageSizeOptions"
          (page)="table!.onPage($event)"
          showFirstLastButtons
        />
      </div>
    }
  `
})
export class PlatformAuditComponent implements OnInit {
  private readonly api = inject(PlatformApiService);

  /** Limite le journal à une entreprise (fiche entreprise). */
  @Input() companyId: string | null = null;

  readonly columns = ['occurredAt', 'actor', 'action', 'company', 'details'] as const;

  table: ServerTable<PlatformAuditEntry> | null = null;

  ngOnInit(): void {
    this.table = new ServerTable<PlatformAuditEntry>((query) => this.api.auditLog(query, this.companyId), {
      pageSize: 25
    });
  }
}
