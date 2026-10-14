import { AsyncPipe, CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
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
import { Subject, takeUntil } from 'rxjs';

import { StockAlertType } from '../../../core/models/alert.model';
import { Product } from '../../../core/models/product.model';
import { Supplier } from '../../../core/models/supplier.model';
import { ActiveStatusFilter } from '../../../core/services/products-api.service';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';
import { FilterResetComponent } from '../../../shared/table/filter-reset.component';
import { ServerTable } from '../../../shared/table/server-table';
import { AuthService } from '../../../auth/services/auth.service';
import { ProductsFacade } from '../data/products.facade';
import { ConfirmDeleteDialogComponent } from '../ui/confirm-delete-dialog.component';
import { ProductDrawerComponent } from '../ui/product-drawer.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-products-shell-page',
  standalone: true,
  imports: [
    FilterResetComponent,
    RouterLink,
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
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSidenavModule,
    MatSelectModule,
    SelectSearchComponent,
    ProductDrawerComponent
  ],
  templateUrl: './products-shell-page.component.html',
  styleUrl: './products-shell-page.component.scss'
})
export class ProductsShellPageComponent implements AfterViewInit, OnDestroy {
  private readonly facade = inject(ProductsFacade);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  /** Raccourci vers les catégories : seulement si l'écran est accessible (même règle que le menu). */
  readonly canViewCategories = inject(AuthService).hasPermission('category:read');

  private readonly destroy$ = new Subject<void>();

  @ViewChild('drawer') drawer!: MatSidenav;

  readonly displayedColumns = ['sku', 'name', 'category', 'supplier', 'stock', 'prices', 'actions'] as const;

  readonly statusOptions: { value: ActiveStatusFilter; label: string }[] = [
    { value: 'ACTIVE', label: 'Actifs' },
    { value: 'INACTIVE', label: 'Désactivés' },
    { value: 'ALL', label: 'Tous' }
  ];

  /** Recherche, filtres, tri et pagination traités par le backend. */
  readonly table = new ServerTable((query) => this.facade.search(query, query.filters), {
    filters: new FormGroup({
      categoryId: new FormControl<string | null>(null),
      supplierId: new FormControl<string | null>(null),
      status: new FormControl<ActiveStatusFilter>('ACTIVE', { nonNullable: true })
    }),
    sortFields: { sku: 'sku', name: 'name', category: 'categoryName' },
    reload$: this.facade.refresh$
  });

  readonly vm$ = this.facade.vm$;
  readonly drawer$ = this.facade.drawer$;

  vmSnapshot: {
    categories: { id: string; name: string }[];
    suppliers: Supplier[];
    stockLevels: ReadonlyMap<string, StockAlertType>;
    canUpdate: boolean;
  } = {
    categories: [],
    suppliers: [],
    stockLevels: new Map(),
    canUpdate: false
  };

  constructor() {
    this.facade.refresh();
  }

  ngAfterViewInit(): void {
    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      this.vmSnapshot.categories = vm.categories;
      this.vmSnapshot.suppliers = vm.suppliers;
      this.vmSnapshot.stockLevels = vm.stockLevels;
      this.vmSnapshot.canUpdate = vm.canUpdate;
    });

    this.drawer$.pipe(takeUntil(this.destroy$)).subscribe((d) => {
      if (d.opened) void this.drawer.open();
      else void this.drawer.close();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openCreate(): void {
    this.facade.openDrawer('create', null);
  }

  openDetail(p: Product): void {
    this.facade.openDrawer('detail', p.id);
  }

  openEdit(p: Product): void {
    this.facade.openDrawer('edit', p.id);
  }

  closeDrawer(): void {
    this.facade.closeDrawer();
  }

  onSaved(): void {
    this.facade.closeDrawer();
    this.snackbar.open('Produit enregistré', 'OK');
  }

  confirmDelete(p: Product): void {
    const ref = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Supprimer le produit',
        message: `Confirmer la suppression de "${p.name}" ? Le produit sera désactivé ; son historique est conservé.`
      }
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.facade.delete(p.id).subscribe({
        next: () => this.snackbar.open('Produit désactivé', 'OK'),
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK')
      });
    });
  }

  categoryName(p: Product): string {
    return this.facade.resolveCategoryName(p, this.vmSnapshot.categories);
  }

  supplierName(p: Product): string {
    return this.facade.resolveSupplierName(p, this.vmSnapshot.suppliers);
  }

  lowStock(p: Product): boolean {
    return this.facade.isLowStock(p, this.vmSnapshot.stockLevels);
  }

  availability(p: Product): string {
    return this.facade.availabilityLabel(p, this.vmSnapshot.stockLevels);
  }
}
