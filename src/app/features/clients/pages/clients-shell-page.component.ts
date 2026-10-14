import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { RouterLink } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { CustomerSearchFilters } from '../../../core/services/customers-api.service';
import { ActiveStatusFilter } from '../../../core/services/products-api.service';
import { FilterResetComponent } from '../../../shared/table/filter-reset.component';
import { ServerTable } from '../../../shared/table/server-table';
import { ClientsFacade } from '../data/clients.facade';
import { ConfirmDeleteClientDialogComponent } from '../ui/confirm-delete-client-dialog.component';
import { ClientDrawerComponent, ClientDrawerContext } from '../ui/client-drawer.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-clients-shell-page',
  standalone: true,
  imports: [
    FilterResetComponent,
    MatTooltipModule,
    CommonModule,
    AsyncPipe,
    DecimalPipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSidenavModule,
    MatSelectModule,
    ClientDrawerComponent
  ],
  templateUrl: './clients-shell-page.component.html',
  styleUrl: './clients-shell-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsShellPageComponent implements AfterViewInit, OnDestroy {
  private readonly facade = inject(ClientsFacade);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  private readonly destroy$ = new Subject<void>();

  @ViewChild('drawer') drawer!: MatSidenav;

  readonly displayedColumns = ['name', 'phone', 'email', 'creditLimit', 'balance', 'actions'] as const;

  readonly statusOptions: { value: ActiveStatusFilter; label: string }[] = [
    { value: 'ACTIVE', label: 'Actifs' },
    { value: 'INACTIVE', label: 'Désactivés' },
    { value: 'ALL', label: 'Tous' }
  ];
  readonly typeOptions: { value: NonNullable<CustomerSearchFilters['type']>; label: string }[] = [
    { value: 'INDIVIDUAL', label: 'Particulier' },
    { value: 'COMPANY', label: 'Entreprise' }
  ];
  readonly priceCategoryOptions: { value: NonNullable<CustomerSearchFilters['priceCategory']>; label: string }[] = [
    { value: 'RETAIL', label: 'Prix de détail' },
    { value: 'WHOLESALE', label: 'Prix de gros' }
  ];

  /** Recherche, filtres, tri et pagination traités par le backend. */
  readonly table = new ServerTable((query) => this.facade.search(query, query.filters), {
    filters: new FormGroup({
      status: new FormControl<ActiveStatusFilter>('ACTIVE', { nonNullable: true }),
      type: new FormControl<CustomerSearchFilters['type']>(null),
      priceCategory: new FormControl<CustomerSearchFilters['priceCategory']>(null)
    }),
    sortFields: { name: 'name', creditLimit: 'creditLimit' },
    reload$: this.facade.refresh$
  });

  readonly vm$ = this.facade.vm$;

  /** Client en cours de modification (ligne de la page affichée). */
  private editing: Customer[] = [];
  drawerCtx: ClientDrawerContext = { mode: 'CREATE', customerId: null, customers: [], canCredit: false };

  ngAfterViewInit(): void {

    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      if (vm.drawer.opened) {
        this.drawerCtx = {
          mode: vm.drawer.mode,
          customerId: vm.drawer.customerId,
          customers: this.editing,
          canCredit: vm.canCredit
        };
        void this.drawer.open();
      } else {
        void this.drawer.close();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openCreate(): void {
    this.facade.openCreate();
  }

  openEdit(c: Customer): void {
    this.editing = [c];
    this.facade.openEdit(c.id);
  }

  closeDrawer(): void {
    this.facade.closeDrawer();
  }

  onSaved(): void {
    this.facade.closeDrawer();
    this.facade.refresh();
  }

  confirmDelete(c: Customer): void {
    this.dialog
      .open(ConfirmDeleteClientDialogComponent, { data: { name: c.name } })
      .afterClosed()
      .pipe(take(1))
      .subscribe((ok: boolean | undefined) => {
        if (!ok) return;

        this.facade
          .delete(c.id)
          .pipe(take(1))
          .subscribe({
            next: () => this.snackbar.open('Client désactivé (ventes et dette conservées)', 'OK', { duration: 2500 }),
            error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
          });
      });
  }
}
