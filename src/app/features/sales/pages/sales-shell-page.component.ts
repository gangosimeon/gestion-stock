import { AsyncPipe, CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, finalize, map, startWith, switchMap, take, takeUntil } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { PaymentMethod } from '../../../core/models/sale.model';
import { SalesFacade } from '../data/sales.facade';
import { CartRow, paymentMethodLabels, saleTypeLabels } from '../data/sales-vm.model';
import { InvoiceDrawerComponent } from '../ui/invoice-drawer.component';

@Component({
  selector: 'app-sales-shell-page',
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
    MatAutocompleteModule,
    MatTableModule,
    MatCardModule,
    MatSelectModule,
    MatRadioModule,
    MatDividerModule,
    MatProgressBarModule,
    MatSidenavModule,
    MatSnackBarModule,
    InvoiceDrawerComponent
  ],
  templateUrl: './sales-shell-page.component.html',
  styleUrl: './sales-shell-page.component.scss'
})
export class SalesShellPageComponent implements AfterViewInit, OnDestroy {
  private readonly facade = inject(SalesFacade);
  private readonly snackbar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('invoiceDrawer') invoiceDrawer!: MatSidenav;

  readonly displayedColumns = ['product', 'qty', 'unit', 'total', 'profit', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<CartRow>([]);

  readonly productSearch = new FormControl<string>('', { nonNullable: true });
  readonly selectedProductId = new FormControl<string | null>(null);

  readonly customerId = new FormControl<string | null>(null);
  readonly paidAmount = new FormControl<number>(0, { nonNullable: true, validators: [Validators.min(0)] });

  readonly vm$ = this.facade.vm$;

  readonly paymentLabels = paymentMethodLabels;
  readonly typeLabels = saleTypeLabels;

  readonly filteredProducts$ = this.vm$.pipe(
    map((vm) => vm.products),
    switchMap((products) =>
      this.productSearch.valueChanges.pipe(
        startWith(this.productSearch.value),
        map((term) => {
          const t = term.trim().toLowerCase();
          if (!t) return products.slice(0, 20);
          return products
            .filter((p) => `${p.sku} ${p.name}`.toLowerCase().includes(t))
            .slice(0, 20);
        })
      )
    )
  );

  vmSnapshot: any = null;

  constructor() {
    this.facade.refresh();

    this.customerId.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((v) => this.facade.setCustomer(v));
    this.paidAmount.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((v) => this.facade.setPaidAmount(v));
  }

  ngAfterViewInit(): void {
    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      this.vmSnapshot = vm;
      this.dataSource.data = vm.cart;

      this.customerId.setValue(vm.form.customerId, { emitEvent: false });
      this.paidAmount.setValue(vm.form.paidAmount, { emitEvent: false });

      if (vm.lastSale) {
        void this.invoiceDrawer.open();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTypeChange(type: 'RETAIL' | 'WHOLESALE'): void {
    this.facade.setSaleType(type);
  }

  onPaymentChange(method: PaymentMethod): void {
    this.facade.setPaymentMethod(method);
  }

  displayProduct(p: Product): string {
    return `${p.sku} — ${p.name}`;
  }

  selectProduct(productId: string): void {
    this.facade.addProductToCart(productId);
    this.productSearch.setValue('');
  }

  inc(row: CartRow): void {
    this.facade.updateQuantity(row.productId, row.quantity + 1);
  }

  dec(row: CartRow): void {
    this.facade.updateQuantity(row.productId, row.quantity - 1);
  }

  setQty(row: CartRow, v: string): void {
    const q = Number(v);
    this.facade.updateQuantity(row.productId, q);
  }

  remove(row: CartRow): void {
    this.facade.removeLine(row.productId);
  }

  clear(): void {
    this.facade.clearCart();
  }

  dueAmount(): number {
    if (!this.vmSnapshot) return 0;
    const total = Number(this.vmSnapshot.totals?.total ?? 0);
    const paid = Number(this.vmSnapshot.form?.paidAmount ?? 0);
    return Math.max(0, total - paid);
  }

  changeAmount(): number {
    if (!this.vmSnapshot) return 0;
    const total = Number(this.vmSnapshot.totals?.total ?? 0);
    const paid = Number(this.vmSnapshot.form?.paidAmount ?? 0);
    return Math.max(0, paid - total);
  }

  checkout(): void {
    if (!this.vmSnapshot) return;
    if (this.vmSnapshot.cart.length === 0) {
      this.snackbar.open('Panier vide', 'OK', { duration: 2500 });
      return;
    }

    const total = Number(this.vmSnapshot.totals.total ?? 0);
    const paid = Number(this.vmSnapshot.form.paidAmount ?? 0);
    const due = Math.max(0, total - paid);
    const customerId = this.vmSnapshot.form.customerId as string | null;

    if (due > 0 && !customerId) {
      this.snackbar.open('Sélectionne un client pour enregistrer une vente à crédit.', 'OK', { duration: 3500 });
      return;
    }

    (this.facade.createSale() as any)
      .pipe(
        take(1),
        finalize(() => {})
      )
      .subscribe({
        next: () => this.snackbar.open('Vente enregistrée', 'OK', { duration: 2500 }),
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }

  closeInvoice(): void {
    if (!this.vmSnapshot?.lastSale) return;
    void this.invoiceDrawer.close();
  }
}
