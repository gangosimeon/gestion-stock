import { AsyncPipe, CommonModule } from '@angular/common';
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
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { Router } from '@angular/router';
import { Observable, Subject, take, takeUntil } from 'rxjs';

import { Supplier } from '../../../core/models/supplier.model';
import { ActiveStatusFilter } from '../../../core/services/products-api.service';
import { ServerTable } from '../../../shared/table/server-table';
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

  @ViewChild('drawer') drawer!: MatDrawer;

  readonly displayedColumns = ['name', 'phone', 'email', 'leadTime', 'actions'] as const;

  readonly statusOptions: { value: ActiveStatusFilter; label: string }[] = [
    { value: 'ACTIVE', label: 'Actifs' },
    { value: 'INACTIVE', label: 'Désactivés' },
    { value: 'ALL', label: 'Tous' }
  ];

  /** Recherche, filtres, tri et pagination traités par le backend. */
  readonly table = new ServerTable((query) => this.facade.search(query, query.filters), {
    filters: new FormGroup({ status: new FormControl<ActiveStatusFilter>('ACTIVE', { nonNullable: true }) }),
    sortFields: { name: 'name', leadTime: 'deliveryLeadTimeDays' },
    reload$: this.facade.refresh$
  });

  readonly vm$ = this.facade.vm$;
  readonly drawer$ = this.facade.drawer$;

  /** Fournisseur en cours de modification (ligne de la page affichée). */
  private editing: Supplier[] = [];
  drawerCtx: SupplierDrawerContext = { mode: 'CREATE', supplier: null };

  ngAfterViewInit(): void {
    this.drawer$.pipe(takeUntil(this.destroy$)).subscribe((d) => {
      if (d.opened) {
        const supplier = this.facade.findSupplier(this.editing, d.supplierId);
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
    this.editing = [s];
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

        (this.facade.delete(s.id) as Observable<unknown>)
          .pipe(take(1))
          .subscribe({
            next: () => this.snackbar.open('Fournisseur désactivé', 'OK', { duration: 2500 }),
            error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
          });
      });
  }
}
