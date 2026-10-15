import { AsyncPipe, CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Subject, map, startWith, switchMap, take, takeUntil } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { PaymentMethod } from '../../../core/models/sale.model';
import { AuthService } from '../../../auth/services/auth.service';
import { SalesFacade } from '../data/sales.facade';
import { CartRow, matchingCustomers, paymentMethodLabels, saleTypeLabels } from '../data/sales-vm.model';
import { InvoiceDrawerComponent } from '../ui/invoice-drawer.component';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';

@Component({
  selector: 'app-sales-shell-page',
  standalone: true,
  imports: [
    RouterLink,
    SelectSearchComponent,
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatTableModule,
    MatCardModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
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

  /** Lien vers l'historique des ventes (sale:read). */
  readonly canSeeHistory = inject(AuthService).hasPermission('sale:read');

  @ViewChild('invoiceDrawer') invoiceDrawer!: MatSidenav;

  readonly displayedColumns = ['product', 'qty', 'unit', 'total', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<CartRow>([]);

  readonly productSearch = new FormControl<string>('', { nonNullable: true });
  readonly selectedProductId = new FormControl<string | null>(null);

  readonly customerId = new FormControl<string | null>(null);
  readonly paidAmount = new FormControl<number>(0, { nonNullable: true, validators: [Validators.min(0)] });

  /** Client absent de la base : mêmes règles que le serveur (nom obligatoire, téléphone libre). */
  readonly newCustomerForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30), Validators.pattern(/^[0-9+() .-]*$/)]
    })
  });

  readonly matchingCustomers = matchingCustomers;

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

  /** Vente dont le ticket a déjà été ouvert : le panneau ne s'ouvre qu'une fois par vente. */
  private shownSale: unknown = null;

  constructor() {
    this.facade.refresh();

    this.customerId.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((v) => this.facade.setCustomer(v));
    this.paidAmount.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((v) => this.facade.setPaidAmount(v));
    this.newCustomerForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.facade.setNewCustomer(this.newCustomerForm.getRawValue()));
  }

  ngAfterViewInit(): void {
    this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
      this.vmSnapshot = vm;
      this.dataSource.data = vm.cart;

      this.customerId.setValue(vm.form.customerId, { emitEvent: false });
      this.paidAmount.setValue(vm.form.paidAmount, { emitEvent: false });

      if (vm.lastSale && vm.lastSale !== this.shownSale) {
        this.shownSale = vm.lastSale;
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

  /** Aperçu du reste dû en paiement partiel (le backend calcule la part à crédit). */
  dueAmount(): number {
    if (!this.vmSnapshot) return 0;
    const total = Number(this.vmSnapshot.totals?.total ?? 0);
    const paid = Number(this.vmSnapshot.form?.paidAmount ?? 0);
    return Math.max(0, total - paid);
  }

  startNewCustomer(): void {
    this.newCustomerForm.reset();
    this.facade.startNewCustomer();
  }

  cancelNewCustomer(): void {
    this.facade.cancelNewCustomer();
  }

  /** Le client saisi existe déjà : on le sélectionne au lieu de le recréer. */
  chooseExisting(customerId: string): void {
    this.facade.setCustomer(customerId);
  }

  onPartialChange(partial: boolean): void {
    this.facade.setPartialPayment(partial);
  }

  checkout(): void {
    if (!this.vmSnapshot) return;
    if (this.vmSnapshot.cart.length === 0) {
      this.snackbar.open('Panier vide', 'OK', { duration: 2500 });
      return;
    }

    // Aide à la saisie : le backend refuse aussi un reste dû sans client.
    const customerId = this.vmSnapshot.form.customerId as string | null;
    const newCustomer = this.vmSnapshot.form.newCustomer;

    if (newCustomer && this.newCustomerForm.invalid) {
      this.newCustomerForm.markAllAsTouched();
      this.snackbar.open('Saisis le nom du client (et un téléphone valide) ou choisis « Comptoir ».', 'OK', {
        duration: 3500
      });
      return;
    }

    if (this.vmSnapshot.form.partialPayment && !customerId && !newCustomer) {
      this.snackbar.open('Sélectionne un client pour enregistrer une vente à crédit.', 'OK', { duration: 3500 });
      return;
    }

    this.facade
      .createSale()
      .pipe(take(1))
      .subscribe({
        next: (sale) => this.snackbar.open(`Vente ${sale.number ?? ''} enregistrée`, 'OK', { duration: 2500 }),
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 3500 })
      });
  }

  closeInvoice(): void {
    void this.invoiceDrawer.close();
  }

  /** Panneau fermé (bouton, clic à côté ou Échap) : le ticket est retiré de l'écran. */
  onInvoiceClosed(): void {
    this.shownSale = null;
    this.facade.dismissLastSale();
  }
}
