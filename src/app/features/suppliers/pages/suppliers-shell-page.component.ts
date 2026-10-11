import { AsyncPipe, CommonModule } from '@angular/common';
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
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, take, takeUntil } from 'rxjs';

import { Supplier } from '../../../core/models/supplier.model';
import { SuppliersFacade } from '../data/suppliers.facade';
import { ConfirmDeleteSupplierDialogComponent } from '../ui/confirm-delete-supplier-dialog.component';
import { SupplierDrawerComponent, SupplierDrawerContext } from '../ui/supplier-drawer.component';

@Component({
  selector: 'app-suppliers-shell-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
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
    SupplierDrawerComponent
  ],
  templateUrl: './suppliers-shell-page.component.html',
  styleUrl: './suppliers-shell-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuppliersShellPageComponent implements AfterViewInit, OnDestroy {
  private readonly facade = inject(SuppliersFacade);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  private readonly destroy$ = new Subject<void>();

  // Pagination et tri vivent dans le bloc @if (vm$ | async) : ils n'existent qu'après la première
  // réponse du backend. On les rattache au tableau à leur apparition (ngAfterViewInit est trop tôt).
  @ViewChild(MatPaginator) set paginator(p: MatPaginator | undefined) {
    if (p && this.dataSource.paginator !== p) this.dataSource.paginator = p;
  }
  @ViewChild(MatSort) set sort(s: MatSort | undefined) {
    if (s && this.dataSource.sort !== s) this.dataSource.sort = s;
  }
  @ViewChild('drawer') drawer!: MatDrawer;

  readonly search = new FormControl<string>('', { nonNullable: true });

  readonly displayedColumns = ['name', 'phone', 'email', 'leadTime', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<Supplier>([]);

  readonly vm$ = this.facade.vm$;
  readonly drawer$ = this.facade.drawer$;

  vmSnapshot: { suppliers: Supplier[] } = { suppliers: [] };
  drawerCtx: SupplierDrawerContext = { mode: 'CREATE', supplier: null };

  constructor() {
    this.facade.refresh();

    this.search.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((v) => {
        this.dataSource.filter = v.trim().toLowerCase();
        if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
      });
  }

  ngAfterViewInit(): void {

    this.dataSource.filterPredicate = (data: Supplier, filter: string) => {
      const v = `${data.name} ${data.phone ?? ''} ${data.email ?? ''} ${data.address ?? ''}`.toLowerCase();
      return v.includes(filter);
    };

    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      this.vmSnapshot.suppliers = vm.suppliers;
      this.dataSource.data = vm.suppliers;
    });

    this.drawer$.pipe(takeUntil(this.destroy$)).subscribe((d) => {
      if (d.opened) {
        const supplier = this.facade.findSupplier(this.vmSnapshot.suppliers, d.supplierId);
        this.drawerCtx = { mode: d.mode, supplier };
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

  openEdit(s: Supplier): void {
    this.facade.openEdit(s.id);
  }

  openDetail(s: Supplier): void {
    void this.router.navigate(['/suppliers', s.id]);
  }

  closeDrawer(): void {
    this.facade.closeDrawer();
  }

  onSaved(): void {
    this.facade.closeDrawer();
  }

  confirmDelete(s: Supplier): void {
    this.dialog
      .open(ConfirmDeleteSupplierDialogComponent, {
        data: {
          title: 'Supprimer fournisseur',
          message: `Supprimer "${s.name}" ? Le fournisseur sera désactivé ; ses commandes et produits sont conservés.`
        }
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((ok) => {
        if (!ok) return;

        (this.facade.delete(s.id) as any)
          .pipe(take(1))
          .subscribe({
            next: () => this.snackbar.open('Fournisseur désactivé', 'OK', { duration: 2500 }),
            error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
          });
      });
  }
}
