import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, ViewChild, inject, signal } from '@angular/core';
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
import { customersToRows, fetchAllCustomers } from '../data/customers-export';
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

  readonly debtOptions: { value: boolean; label: string }[] = [
    { value: true, label: 'Avec dette impayée' },
    { value: false, label: 'Sans dette' }
  ];

  /** Export Excel en cours (bouton désactivé, une seule génération à la fois). */
  readonly exporting = signal(false);

  /** Recherche, filtres, tri et pagination traités par le backend. */
  readonly table = new ServerTable((query) => this.facade.search(query, query.filters), {
    filters: new FormGroup({
      status: new FormControl<ActiveStatusFilter>('ACTIVE', { nonNullable: true }),
      type: new FormControl<CustomerSearchFilters['type']>(null),
      priceCategory: new FormControl<CustomerSearchFilters['priceCategory']>(null),
      withDebt: new FormControl<boolean | null>(null)
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

  /**
   * Exporte en Excel tous les clients correspondant à la recherche, aux filtres (dont la dette)
   * et au tri affichés, pas seulement la page à l'écran.
   */
  async exportExcel(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const filters = this.table.filters.getRawValue();
      const customers = await fetchAllCustomers(
        (page) => this.facade.search(page, filters),
        this.table.search.value.trim(),
        this.table.currentSort
      );
      if (customers.length === 0) {
        this.snackbar.open('Aucun client à exporter avec ces filtres.', 'OK', { duration: 3000 });
        return;
      }
      const XLSX = await import('xlsx');
      const sheet = XLSX.utils.json_to_sheet(customersToRows(customers));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'Clients');
      const suffix = filters.withDebt === true ? '_avec_dette' : '';
      XLSX.writeFile(book, `clients${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e: unknown) {
      this.snackbar.open(e instanceof Error ? e.message : "Échec de l'export.", 'OK', { duration: 4000 });
    } finally {
      this.exporting.set(false);
    }
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
