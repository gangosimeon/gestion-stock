import { AsyncPipe, CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, filter, map, startWith, switchMap, take, takeUntil } from 'rxjs';
import { QuotesApiService } from '../../../core/services/quotes-api.service';

import { Product } from '../../../core/models/product.model';
import { PaymentMethod } from '../../../core/models/sale.model';
import { AuthService } from '../../../auth/services/auth.service';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { SalesFacade } from '../data/sales.facade';
import {
  CartRow,
  CashTender,
  SalesVm,
  cashTender,
  matchingCustomers,
  paymentMethodLabels,
  quickCashAmounts,
  saleTypeLabels
} from '../data/sales-vm.model';
import { rememberSalesMode } from '../data/quick-sale.model';
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
    MatButtonToggleModule,
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
    InvoiceDrawerComponent
  ],
  templateUrl: './sales-shell-page.component.html',
  styleUrl: './sales-shell-page.component.scss'
})
export class SalesShellPageComponent implements AfterViewInit, OnDestroy {
  private readonly facade = inject(SalesFacade);
  private readonly snackbar = inject(MatSnackBar);
  private readonly warehouseCtx = inject(WarehouseContextService);
  private readonly destroy$ = new Subject<void>();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quotesApi = inject(QuotesApiService);

  /** Lien vers l'historique des ventes (sale:read). */
  readonly canSeeHistory = inject(AuthService).hasPermission('sale:read');

  @ViewChild('invoiceDrawer') invoiceDrawer!: MatSidenav;

  readonly displayedColumns = ['product', 'qty', 'unit', 'total', 'actions'] as const;
  readonly dataSource = new MatTableDataSource<CartRow>([]);

  readonly productSearch = new FormControl<string>('', { nonNullable: true });
  readonly selectedProductId = new FormControl<string | null>(null);

  readonly customerId = new FormControl<string | null>(null);

  /** Espèces remises par le client (calcul de la monnaie à l'écran ; jamais envoyé au serveur). */
  readonly received = new FormControl<number | null>(null, [Validators.min(0)]);

  /** Moyens de paiement proposés à l'encaissement. */
  readonly paymentOptions: { value: PaymentMethod; label: string; icon: string }[] = [
    { value: 'CASH', label: 'Espèces', icon: 'payments' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: 'phone_android' },
    { value: 'BANK_TRANSFER', label: 'Virement', icon: 'account_balance' }
  ];
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
    rememberSalesMode('full');
    this.facade.refresh();
    // Autre magasin : catalogue et stock rechargés (le panier a été vidé par la facade).
    this.warehouseCtx.warehouseChanged$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.selectedProductId.setValue(null);
      this.facade.refresh();
    });

    this.customerId.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((v) => this.facade.setCustomer(v));
    this.paidAmount.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((v) => this.facade.setPaidAmount(v));
    this.newCustomerForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.facade.setNewCustomer(this.newCustomerForm.getRawValue()));

    this.loadQuoteFromUrl();
  }

  /**
   * « Générer la facture » d'un devis (/sales/new?quote=…) : une fois le catalogue du dépôt
   * chargé, le panier reprend le client, les produits et les quantités du devis.
   */
  private loadQuoteFromUrl(): void {
    const quoteId = this.route.snapshot.queryParamMap.get('quote');
    if (!quoteId) return;
    this.quotesApi
      .get(quoteId)
      .pipe(
        switchMap((quote) =>
          this.vm$.pipe(
            filter((vm) => !vm.isLoading && vm.products.length > 0),
            take(1),
            map(() => quote)
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (quote) => {
          this.facade.loadQuote(quote);
          // Le lien ne recharge pas le devis si l'utilisateur actualise la page après la vente.
          void this.router.navigate([], { queryParams: { quote: null }, queryParamsHandling: 'merge', replaceUrl: true });
        },
        error: () => this.snackbar.open('Devis introuvable : la vente repart d’un panier vide.', 'OK', { duration: 4000 })
      });
  }

  retryQuoteLink(): void {
    this.facade.retryQuoteLink();
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
    this.received.setValue(null);
  }

  /** Montant à encaisser maintenant : le total, ou le montant payé en paiement partiel. */
  amountDue(vm: SalesVm): number {
    return vm.form.partialPayment ? Math.max(0, Number(vm.form.paidAmount) || 0) : vm.totals.total;
  }

  /** Monnaie à rendre ou somme manquante (espèces seulement, dès qu'un montant reçu est saisi). */
  tender(vm: SalesVm): CashTender | null {
    if (vm.form.paymentMethod !== 'CASH' || vm.cart.length === 0) return null;
    return cashTender(this.received.value, this.amountDue(vm));
  }

  quickAmounts(vm: SalesVm): number[] {
    return vm.form.paymentMethod === 'CASH' ? quickCashAmounts(this.amountDue(vm)) : [];
  }

  /** Montant au format français (espace des milliers), sans décimale : 7 300. */
  fcfa(value: number | null | undefined): string {
    return Math.round(Number(value) || 0).toLocaleString('fr-FR');
  }

  setReceived(amount: number): void {
    this.received.setValue(amount);
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

    // Espèces : le montant reçu doit couvrir le montant à payer (sinon : paiement partiel / à crédit).
    const tender = this.tender(this.vmSnapshot as SalesVm);
    if (tender && tender.missing > 0) {
      this.snackbar.open(
        `Montant reçu insuffisant : il manque ${tender.missing.toLocaleString('fr-FR')} FCFA. ` +
          'Complétez le montant ou cochez « Paiement partiel / à crédit ».',
        'OK',
        { duration: 5000 }
      );
      return;
    }
    const received = tender ? tender.received : null;

    this.facade
      .createSale(received)
      .pipe(take(1))
      .subscribe({
        next: (sale) => {
          this.received.setValue(null);
          // Monnaie calculée sur le montant réellement encaissé par le serveur.
          // Monnaie conservée et calculée par le serveur (sur le montant réellement encaissé).
          const change =
            sale.changeGiven != null
              ? Number(sale.changeGiven)
              : received !== null
                ? Math.max(0, received - Number(sale.paidAmount ?? 0))
                : null;
          this.snackbar.open(
            `Vente ${sale.number ?? ''} enregistrée` +
              (change !== null ? ` · Monnaie à rendre : ${change.toLocaleString('fr-FR')} FCFA` : ''),
            'OK',
            { duration: change ? 8000 : 2500 }
          );
        },
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
