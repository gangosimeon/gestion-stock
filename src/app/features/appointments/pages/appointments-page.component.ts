import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, Subject, filter, switchMap, take, takeUntil } from 'rxjs';

import {
  Appointment,
  AppointmentFilter,
  AppointmentStatus,
  appointmentStatusLabels
} from '../../../core/models/appointment.model';
import { AppointmentsApiService } from '../../../core/services/appointments-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentDrawerComponent, AppointmentDrawerContext } from '../ui/appointment-drawer.component';
import { CancelAppointmentDialogComponent, CancelAppointmentDialogData } from '../ui/cancel-appointment-dialog.component';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';
import { DatePickerDirective } from '../../../shared/date/date-picker.directive';

function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

@Component({
  selector: 'app-appointments-page',
  standalone: true,
  imports: [
    DatePickerDirective,
    SelectSearchComponent,
    CommonModule,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    AppointmentDrawerComponent
  ],
  templateUrl: './appointments-page.component.html',
  styleUrl: './appointments-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppointmentsPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(AppointmentsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('drawer') drawer!: MatDrawer;

  /** Interface seulement : le backend contrôle appointment:manage à chaque appel. */
  readonly canManage$: Observable<boolean> = inject(AuthService).hasPermission$('appointment:manage');

  drawerCtx: AppointmentDrawerContext | null = null;

  // État
  isLoading = false;
  errorMessage: string | null = null;
  total = 0;
  pageSize = 10;
  pageIndex = 0;

  dataSource = new MatTableDataSource<Appointment>([]);
  readonly displayedColumns = ['dateTime', 'customerName', 'phone', 'status', 'note', 'actions'];

  readonly statusOptions = Object.keys(appointmentStatusLabels) as AppointmentStatus[];
  readonly statusLabels = appointmentStatusLabels;

  // Agenda : à partir d'aujourd'hui par défaut.
  filtersForm = new FormGroup({
    search: new FormControl<string>(''),
    status: new FormControl<AppointmentStatus | ''>(''),
    dateFrom: new FormControl<string>(isoDate(new Date())),
    dateTo: new FormControl<string>('')
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    const f = this.filtersForm.value;
    const filters: AppointmentFilter = {};
    if (f.search?.trim()) filters.search = f.search.trim();
    if (f.status) filters.status = f.status;
    // Valeurs AAAA-MM-JJ des champs date : jours locaux, envoyés tels quels.
    if (f.dateFrom) filters.dateFrom = f.dateFrom;
    if (f.dateTo) filters.dateTo = f.dateTo;

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

  applyFilters(): void {
    this.pageIndex = 0;
    this.loadData();
  }

  resetFilters(): void {
    this.filtersForm.reset({ search: '', status: '', dateFrom: isoDate(new Date()), dateTo: '' });
    this.pageIndex = 0;
    this.loadData();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadData();
  }

  openCreate(): void {
    this.drawerCtx = { mode: 'create' };
    this.cdr.markForCheck();
    void this.drawer.open();
  }

  openEdit(appointment: Appointment): void {
    this.drawerCtx = { mode: 'edit', appointment };
    this.cdr.markForCheck();
    void this.drawer.open();
  }

  closeDrawer(): void {
    void this.drawer.close();
    this.drawerCtx = null;
    this.cdr.markForCheck();
  }

  onSaved(): void {
    const msg = this.drawerCtx?.mode === 'create' ? 'Rendez-vous planifié' : 'Rendez-vous modifié';
    this.closeDrawer();
    this.snackbar.open(msg, 'OK', { duration: 3000, panelClass: 'snack-success' });
    this.loadData();
  }

  /** Honoré ou absent : possible à partir du jour du rendez-vous (règle du backend). */
  isDue(a: Appointment): boolean {
    return a.dateTime.substring(0, 10) <= isoDate(new Date());
  }

  markAs(a: Appointment, status: 'COMPLETED' | 'NO_SHOW'): void {
    this.api.updateStatus(a.id, status).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackbar.open(`Rendez-vous ${this.statusLabels[status].toLowerCase()}`, 'OK', { duration: 3000, panelClass: 'snack-success' });
        this.loadData();
      },
      error: (e: Error) => this.snackbar.open(e.message, 'OK', { duration: 4000, panelClass: 'snack-error' })
    });
  }

  cancel(a: Appointment): void {
    const data: CancelAppointmentDialogData = { appointment: a };
    this.dialog
      .open(CancelAppointmentDialogComponent, { data, width: '460px' })
      .afterClosed()
      .pipe(
        take(1),
        filter((reason: string | undefined): reason is string => !!reason),
        switchMap((reason) => this.api.updateStatus(a.id, 'CANCELLED', reason)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.snackbar.open('Rendez-vous annulé', 'OK', { duration: 3000, panelClass: 'snack-success' });
          this.loadData();
        },
        error: (e: Error) => this.snackbar.open(e.message, 'OK', { duration: 4000, panelClass: 'snack-error' })
      });
  }

  statusLabel(status: string): string {
    return (appointmentStatusLabels as Record<string, string>)[status] ?? status;
  }

  statusBadgeClass(status: AppointmentStatus): string {
    switch (status) {
      case 'SCHEDULED': return 'badge badge--info';
      case 'COMPLETED': return 'badge badge--success';
      case 'NO_SHOW': return 'badge badge--warning';
      case 'CANCELLED': return 'badge badge--danger';
      default: return 'badge badge--neutral';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
