import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
  AuditLogEntry,
  AuditLogFilter,
  AuditLogSort,
  AuditLogStats,
  AuditModule,
  AuditStatus,
  auditActionLabels,
  auditEntityTypeLabels,
  auditLabel,
  auditModuleLabels,
  auditStatusLabels
} from '../../../core/models/audit-log.model';
import { AuditLogsApiService } from '../../../core/services/audit-logs-api.service';
import { AuditLogDetailsDialogComponent } from '../ui/audit-log-details-dialog.component';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';

@Component({
  selector: 'app-audit-logs-page',
  standalone: true,
  imports: [
    SelectSearchComponent,
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
export class AuditLogsPageComponent implements OnInit, OnDestroy {
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
  pageSize = 10;
  pageIndex = 0;
  stats: AuditLogStats | null = null;
  /** Tri demandé au backend (aucun : plus récent d'abord). */
  sortBy: AuditLogSort | undefined;

  // DataSource
  dataSource = new MatTableDataSource<AuditLogEntry>([]);
  readonly displayedColumns = ['date', 'user', 'action', 'entity', 'status', 'details'];

  // Options filtres : valeurs tracées par le backend
  readonly actionOptions = Object.keys(auditActionLabels) as AuditAction[];
  readonly moduleOptions = Object.keys(auditModuleLabels) as AuditModule[];
  readonly statusOptions: AuditStatus[] = ['SUCCESS', 'FAILURE'];

  readonly actionLabel = (code: string | null | undefined) => auditLabel(auditActionLabels, code);
  readonly moduleLabel = (code: string | null | undefined) => auditLabel(auditModuleLabels, code);
  readonly entityTypeLabel = (code: string | null | undefined) => auditLabel(auditEntityTypeLabels, code);
  readonly statusLabel = (code: string | null | undefined) => auditLabel(auditStatusLabels, code);

  // Formulaire de filtres
  filtersForm = new FormGroup({
    dateFrom: new FormControl<string>(''),
    dateTo: new FormControl<string>(''),
    actions: new FormControl<AuditAction[]>([]),
    modules: new FormControl<AuditModule[]>([]),
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

    this.api.list(this.currentFilters(), this.pageIndex, this.pageSize, this.sortBy).pipe(takeUntil(this.destroy$)).subscribe({
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

  /** Critères du formulaire, transmis tels quels au backend (recherche comme export). */
  private currentFilters(): AuditLogFilter {
    const f = this.filtersForm.value;
    const filters: AuditLogFilter = {};
    if (f.dateFrom) filters.dateFrom = f.dateFrom;
    if (f.dateTo) filters.dateTo = f.dateTo;
    if (f.actions?.length) filters.actions = f.actions;
    if (f.modules?.length) filters.modules = f.modules;
    if (f.status) filters.status = f.status;
    if (f.search?.trim()) filters.search = f.search.trim();
    return filters;
  }

  // Tri : demandé au backend, sur tout le journal (pas seulement la page affichée)
  onSort(sort: Sort): void {
    const fields: Record<string, AuditLogSort['field']> = {
      date: 'createdAt',
      user: 'username',
      action: 'action',
      entity: 'module',
      status: 'status'
    };
    const field = fields[sort.active];
    this.sortBy = field && sort.direction ? { field, direction: sort.direction } : undefined;
    this.pageIndex = 0;
    this.loadData();
  }

  // Réinitialiser les filtres
  resetFilters(): void {
    this.filtersForm.reset({ actions: [], modules: [], status: '', search: '', dateFrom: '', dateTo: '' });
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
    this.api.exportCsv(this.currentFilters()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.snackbar.open('Export CSV téléchargé', 'OK', { duration: 3000, panelClass: 'snack-success' });
      },
      error: (e: Error) => {
        this.snackbar.open(e.message || 'Erreur lors de l\'export', 'OK', { duration: 3000, panelClass: 'snack-error' });
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
      case 'DELETE': case 'CANCEL': case 'DEACTIVATE': return 'badge badge--danger';
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
