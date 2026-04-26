import { AsyncPipe, CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
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
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { Supplier } from '../../../core/models/supplier.model';
import { ProductsFacade } from '../data/products.facade';
import { ConfirmDeleteDialogComponent } from '../ui/confirm-delete-dialog.component';
import { ProductDrawerComponent } from '../ui/product-drawer.component';

@Component({
  selector: 'app-products-shell-page',
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
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSidenavModule,
    ProductDrawerComponent
  ],
  templateUrl: './products-shell-page.component.html',
  styleUrl: './products-shell-page.component.scss'
})
export class ProductsShellPageComponent implements AfterViewInit, OnDestroy {
  private readonly facade = inject(ProductsFacade);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  private readonly destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('drawer') drawer!: MatSidenav;

  readonly search = new FormControl<string>('', { nonNullable: true });

  readonly displayedColumns = ['sku', 'name', 'category', 'supplier', 'stock', 'prices', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<Product>([]);

  readonly vm$ = this.facade.vm$;
  readonly drawer$ = this.facade.drawer$;

  vmSnapshot: { categories: { id: string; name: string }[]; suppliers: Supplier[] } = {
    categories: [],
    suppliers: []
  };

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
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.dataSource.filterPredicate = (data: Product, filter: string) => {
      const v = `${data.sku} ${data.name} ${data.categoryName ?? ''} ${(data as any).supplierName ?? ''}`.toLowerCase();
      return v.includes(filter);
    };

    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      this.vmSnapshot.categories = vm.categories;
      this.vmSnapshot.suppliers = vm.suppliers;
      this.dataSource.data = vm.products.map((p) => ({
        ...p,
        categoryName: this.facade.resolveCategoryName(p, vm.categories),
        supplierName: this.facade.resolveSupplierName(p, vm.suppliers)
      }));
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
        message: `Confirmer la suppression de "${p.name}" ?`
      }
    });

    ref.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      (this.facade.delete(p.id) as any).subscribe({
        next: () => this.snackbar.open('Produit supprimé', 'OK'),
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK')
      });
    });
  }

  lowStock(p: Product): boolean {
    return this.facade.isLowStock(p);
  }

  availability(p: Product): string {
    return this.facade.availabilityLabel(p);
  }
}
