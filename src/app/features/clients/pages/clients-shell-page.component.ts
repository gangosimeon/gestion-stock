import { AsyncPipe, CommonModule, DecimalPipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, take, takeUntil } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { ClientsFacade } from '../data/clients.facade';
import { ConfirmDeleteClientDialogComponent } from '../ui/confirm-delete-client-dialog.component';
import { ClientDrawerComponent, ClientDrawerContext } from '../ui/client-drawer.component';

@Component({
  selector: 'app-clients-shell-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    DecimalPipe,
    RouterLink,
    ReactiveFormsModule,
    MatToolbarModule,
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('drawer') drawer!: MatSidenav;

  readonly search = new FormControl<string>('', { nonNullable: true });

  readonly displayedColumns = ['name', 'phone', 'email', 'creditLimit', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<Customer>([]);

  readonly vm$ = this.facade.vm$;

  vmSnapshot = { customers: [] as Customer[] };
  drawerCtx: ClientDrawerContext = { mode: 'CREATE', customerId: null, customers: [] };

  constructor() {
    this.facade.refresh();

    this.search.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((v) => {
        this.dataSource.filter = v.trim().toLowerCase();
        if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
      });

    this.dataSource.filterPredicate = (data: Customer, filter: string) => {
      const f = filter.trim().toLowerCase();
      if (!f) return true;
      return `${data.name} ${data.phone ?? ''} ${data.email ?? ''}`.toLowerCase().includes(f);
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      this.vmSnapshot = { customers: vm.customers };
      this.dataSource.data = vm.customers;

      if (vm.drawer.opened) {
        this.drawerCtx = {
          mode: vm.drawer.mode,
          customerId: vm.drawer.customerId,
          customers: vm.customers
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

        (this.facade.delete(c.id) as any)
          .pipe(take(1))
          .subscribe({
            next: () => this.snackbar.open('Client supprimé', 'OK', { duration: 2500 }),
            error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
          });
      });
  }
}
