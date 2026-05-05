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
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Subject, takeUntil } from 'rxjs';

import { Appointment, AppointmentFilter, AppointmentStatus } from '../../../core/models/appointment.model';
import { AppointmentsApiService } from '../../../core/services/appointments-api.service';
import { AppointmentDrawerComponent, AppointmentDrawerContext } from '../ui/appointment-drawer.component';
import { ConfirmDeleteDialogComponent } from '../ui/confirm-delete-dialog.component';

@Component({
  selector: 'app-appointments-page',
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
    MatSidenavModule,
    MatSnackBarModule,
    MatTableModule,
    MatToolbarModule,
    AppointmentDrawerComponent
  ],
  templateUrl: './appointments-page.component.html',
  styleUrl: './appointments-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppointmentsPageComponent implements OnInit {
  private readonly api = inject(AppointmentsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('drawer') drawer!: MatDrawer;

  drawerCtx: AppointmentDrawerContext | null = null;

  // État
  isLoading = false;
  errorMessage: string | null = null;
  total = 0;
  pageSize = 25;
  pageIndex = 0;

  // DataSource
  dataSource = new MatTableDataSource<Appointment>([]);
  readonly displayedColumns = ['dateTime', 'customerName', 'phone', 'status', 'note', 'actions'];

  // Options statut
  readonly statusOptions: AppointmentStatus[] = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];

  // Formulaire de filtres
  filtersForm = new FormGroup({
    search: new FormControl<string>(''),
    status: new FormControl<AppointmentStatus | ''>(''),
    date: new FormControl<string>('')
  });

  ngOnInit(): void {
    this.loadData();
  }

  // Charger les données
  loadData(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    const f = this.filtersForm.value;
    const filters: AppointmentFilter = {};
    if (f.search) filters.search = f.search;
    if (f.status) filters.status = f.status;
    if (f.date) {
      const d = new Date(f.date);
      filters.dateFrom = d.toISOString().split('T')[0];
      filters.dateTo = d.toISOString().split('T')[0];
    }

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
    this.filtersForm.reset({ search: '', status: '', date: '' });
    this.pageIndex = 0;
    this.loadData();
  }

  // Pagination
  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadData();
  }

  // Ouvrir drawer création
  openCreate(): void {
    this.drawerCtx = { mode: 'create' };
    this.cdr.markForCheck();
    void this.drawer.open();
  }

  // Ouvrir drawer édition
  openEdit(appointment: Appointment): void {
    this.drawerCtx = { mode: 'edit', appointment };
    this.cdr.markForCheck();
    void this.drawer.open();
  }

  // Fermer le drawer
  closeDrawer(): void {
    void this.drawer.close();
    this.drawerCtx = null;
    this.cdr.markForCheck();
  }

  // Sauvegarde réussie depuis le drawer
  onSaved(): void {
    const msg = this.drawerCtx?.mode === 'create'
      ? 'Rendez-vous créé avec succès'
      : 'Rendez-vous modifié avec succès';
    this.closeDrawer();
    this.snackbar.open(msg, 'OK', { duration: 3000, panelClass: 'snack-success' });
    this.loadData();
  }

  // Confirmer suppression
  confirmDelete(appointment: Appointment): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: { customerName: appointment.customerName }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((confirmed) => {
      if (confirmed) {
        this.api.delete(appointment.id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.snackbar.open('Rendez-vous supprimé', 'OK', { duration: 3000, panelClass: 'snack-success' });
            this.loadData();
          },
          error: () => {
            this.snackbar.open('Erreur lors de la suppression', 'OK', { duration: 3000, panelClass: 'snack-error' });
          }
        });
      }
    });
  }

  // Helper pour badge statut
  statusBadgeClass(status: AppointmentStatus): string {
    switch (status) {
      case 'SCHEDULED': return 'badge badge--info';
      case 'COMPLETED': return 'badge badge--success';
      case 'CANCELLED': return 'badge badge--danger';
      default: return 'badge badge--neutral';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
