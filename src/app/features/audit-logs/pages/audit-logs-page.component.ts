import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';

import {
  AuditAction,
  AuditEntityType,
  AuditLogEntry,
  AuditLogFilter,
  AuditLogStats,
  AuditStatus
} from '../../../core/models/audit-log.model';
import { AuditLogsApiService } from '../../../core/services/audit-logs-api.service';
import { AuditLogDetailsDialogComponent } from '../ui/audit-log-details-dialog.component';

@Component({
  selector: 'app-audit-logs-page',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './audit-logs-page.component.html',
  styleUrl: './audit-logs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditLogsPageComponent implements OnInit {
  private readonly api = inject(AuditLogsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // État
  isLoading = false;
  errorMessage: string | null = null;
  total = 0;
  pageSize = 25;
  pageIndex = 0;
  stats: AuditLogStats | null = null;

  // DataSource
  dataSource = new MatTableDataSource<AuditLogEntry>([]);
  readonly displayedColumns = ['date', 'user', 'action', 'entity', 'status', 'details'];

  // Options filtres
  readonly actionOptions: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'RECEIVE', 'PAY', 'TRANSFER', 'OPEN', 'CLOSE'];
  readonly entityTypeOptions: AuditEntityType[] = ['PRODUCT', 'SALE', 'SUPPLIER', 'PURCHASE_ORDER', 'EXPENSE', 'INVENTORY_SESSION', 'CASH_REGISTER_SESSION', 'WAREHOUSE_TRANSFER', 'CUSTOMER', 'USER', 'SYSTEM'];
  readonly statusOptions: AuditStatus[] = ['SUCCESS', 'FAILURE'];

  // Formulaire de filtres
  filtersForm = new FormGroup({
    dateFrom: new FormControl<string>(''),
    dateTo: new FormControl<string>(''),
    actions: new FormControl<AuditAction[]>([]),
    entityTypes: new FormControl<AuditEntityType[]>([]),
    status: new FormControl<AuditStatus | ''>(''),
    search: new FormControl<string>('')
  });

  ngOnInit(): void {
    this.loadStats();
    this.loadData();
  }

  // Charger les statistiques
  loadStats(): void {
    this.api.getStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.stats = s; this.cdr.markForCheck(); },
      error: () => { /* silencieux */ }
    });
  }

  // Charger les données
  loadData(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    const f = this.filtersForm.value;
    const filters: AuditLogFilter = {};
    if (f.dateFrom) filters.dateFrom = f.dateFrom;
    if (f.dateTo) filters.dateTo = f.dateTo;
    if (f.actions?.length) filters.actions = f.actions;
    if (f.entityTypes?.length) filters.entityTypes = f.entityTypes;
    if (f.status) filters.status = f.status;
    if (f.search) filters.search = f.search;

    this.api.list(filters, this.pageIndex, this.pageSize).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.dataSource.data = r.items;
        this.total = r.total;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (e: Error) => {
        this.errorMessage = e.message;
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Appliquer les filtres
  applyFilters(): void {
    this.pageIndex = 0;
    this.loadData();
  }

  // Réinitialiser les filtres
  resetFilters(): void {
    this.filtersForm.reset({ actions: [], entityTypes: [], status: '', search: '', dateFrom: '', dateTo: '' });
    this.pageIndex = 0;
    this.loadData();
  }

  // Pagination
  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadData();
  }

  // Export CSV
  exportCsv(): void {
    const f = this.filtersForm.value;
    const filters: AuditLogFilter = {};
    if (f.dateFrom) filters.dateFrom = f.dateFrom;
    if (f.dateTo) filters.dateTo = f.dateTo;
    if (f.actions?.length) filters.actions = f.actions;
    if (f.entityTypes?.length) filters.entityTypes = f.entityTypes;
    if (f.status) filters.status = f.status;

    this.api.exportCsv(filters).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.snackbar.open('Export CSV téléchargé', 'OK', { duration: 3000, panelClass: 'snack-success' });
      },
      error: () => {
        this.snackbar.open('Erreur lors de l\'export', 'OK', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }

  // Ouvrir détail
  openDetails(log: AuditLogEntry): void {
    this.dialog.open(AuditLogDetailsDialogComponent, {
      data: { log },
      width: '600px',
      maxHeight: '80vh'
    });
  }

  // Helpers pour badges
  actionBadgeClass(action: AuditAction): string {
    switch (action) {
      case 'CREATE': return 'badge badge--success';
      case 'UPDATE': return 'badge badge--info';
      case 'DELETE': return 'badge badge--danger';
      case 'LOGIN': case 'LOGOUT': return 'badge badge--neutral';
      case 'EXPORT': return 'badge badge--warning';
      default: return 'badge badge--neutral';
    }
  }

  statusBadgeClass(status: AuditStatus): string {
    return status === 'SUCCESS' ? 'badge badge--success' : 'badge badge--danger';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
