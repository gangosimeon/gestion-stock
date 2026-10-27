import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { PaymentMethod, SaleType } from '../../../core/models/sale.model';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { SelectSearchComponent } from '../../../shared/select/select-search.component';
import { SalesFacade } from '../data/sales.facade';
import { CartRow, SalesVm, cashTender, quickCashAmounts } from '../data/sales-vm.model';
import {
  KeyValueStore,
  browserStore,
  exactProduct,
  favoriteProducts,
  recordSoldProducts,
  rememberSalesMode,
  searchProducts
} from '../data/quick-sale.model';
import { InvoiceDrawerComponent } from '../ui/invoice-drawer.component';

/** Stockage des favoris et du mode (remplaçable dans les tests). */
export const QUICK_SALE_STORE = { current: browserStore as KeyValueStore };

/**
 * Caisse rapide : vente au comptoir en quelques gestes, pensée pour un téléphone tenu d'une main
 * (grandes zones tactiles, action principale en bas d'écran) et utilisable au clavier sur ordinateur
 * (F2 : rechercher, F9 : encaisser ; lecteur de codes-barres : saisie + Entrée).
 *
 * Même panier et mêmes règles que la caisse complète (SalesFacade) : le serveur fixe les prix,
 * vérifie le stock et le crédit, encaisse dans la caisse ouverte. Seule la saisie change.
 */
@Component({
  selector: 'app-quick-sale-page',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSidenavModule,
    SelectSearchComponent,
    InvoiceDrawerComponent
  ],
  templateUrl: './quick-sale-page.component.html',
  styleUrl: './quick-sale-page.component.scss'
})
export class QuickSalePageComponent {
  private readonly facade = inject(SalesFacade);
  private readonly snackbar = inject(MatSnackBar);
  private readonly warehouseCtx = inject(WarehouseContextService);
  private readonly store = QUICK_SALE_STORE.current;

  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('invoiceDrawer') private invoiceDrawer?: MatSidenav;

  readonly vm = toSignal(this.facade.vm$);
  private readonly warehouseId = toSignal(this.warehouseCtx.warehouseId$, { initialValue: '' });

  readonly search = signal('');
  /** Espèces remises par le client (vérification ; la monnaie est calculée et conservée par le serveur). */
  readonly received = signal<number | null>(null);
  readonly showOptions = signal(false);
  /** Incrémenté après chaque vente : les favoris appris sont relus. */
  private readonly favoritesVersion = signal(0);

  readonly paymentOptions: { value: PaymentMethod; label: string; icon: string }[] = [
    { value: 'CASH', label: 'Espèces', icon: 'payments' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: 'phone_android' },
    { value: 'BANK_TRANSFER', label: 'Virement', icon: 'account_balance' }
  ];

  readonly results = computed(() => searchProducts(this.vm()?.products ?? [], this.search(), 30));

  readonly favorites = computed(() => {
    this.favoritesVersion();
    return favoriteProducts(this.store, this.favoritesKey(), this.vm()?.products ?? [], 12);
  });

  /** Montant à encaisser maintenant : le total, ou le montant payé en paiement partiel. */
  readonly amountDue = computed(() => {
    const vm = this.vm();
    if (!vm) return 0;
    return vm.form.partialPayment ? Math.max(0, Number(vm.form.paidAmount) || 0) : vm.totals.total;
  });

  readonly tender = computed(() => {
    const vm = this.vm();
    if (!vm || vm.form.paymentMethod !== 'CASH' || vm.cart.length === 0) return null;
    return cashTender(this.received(), this.amountDue());
  });

  readonly quickAmounts = computed(() =>
    this.vm()?.form.paymentMethod === 'CASH' ? quickCashAmounts(this.amountDue()) : []
  );

  /** Vente dont le ticket a déjà été ouvert : le panneau ne s'ouvre qu'une fois par vente. */
  private shownSale: unknown = null;

  constructor() {
    rememberSalesMode('quick', this.store);
    this.facade.refresh();
    // Autre magasin : catalogue et stock rechargés (le panier a été vidé par la façade).
    this.warehouseCtx.warehouseChanged$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.search.set('');
      this.received.set(null);
      this.facade.refresh();
    });
    // Vente enregistrée : ticket ouvert (format mémorisé sur l'appareil, ex. ticket 80 mm).
    effect(() => {
      const sale = this.vm()?.lastSale;
      if (sale && sale !== this.shownSale) {
        this.shownSale = sale;
        untracked(() => void this.invoiceDrawer?.open());
      }
    });
  }

  // --- Clavier : F2 rechercher, F9 encaisser -----------------------------------------------------

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'F2') {
      event.preventDefault();
      this.focusSearch();
    } else if (event.key === 'F9') {
      event.preventDefault();
      this.checkout();
    }
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  /** Entrée (ou lecteur de codes-barres) : article identifié sans ambiguïté ajouté directement. */
  onSearchEnter(): void {
    const product = exactProduct(this.vm()?.products ?? [], this.search());
    if (product) {
      this.add(product);
    } else if (this.search().trim()) {
      this.snackbar.open('Plusieurs articles ou aucun : touchez celui à vendre.', 'OK', { duration: 2500 });
    }
  }

  add(product: Product): void {
    this.facade.addProductToCart(product.id);
    this.search.set('');
    this.focusSearch();
  }

  inc(row: CartRow): void {
    this.facade.updateQuantity(row.productId, row.quantity + 1);
  }

  dec(row: CartRow): void {
    this.facade.updateQuantity(row.productId, row.quantity - 1);
  }

  remove(row: CartRow): void {
    this.facade.removeLine(row.productId);
  }

  clear(): void {
    this.facade.clearCart();
    this.received.set(null);
    this.focusSearch();
  }

  /** Quantité du panier pour un article (badge sur sa tuile). */
  inCart(productId: string): number {
    return this.vm()?.cart.find((r) => r.productId === productId)?.quantity ?? 0;
  }

  setPayment(method: PaymentMethod): void {
    this.facade.setPaymentMethod(method);
    if (method !== 'CASH') this.received.set(null);
  }

  setReceived(value: string | number | null): void {
    const amount = value === null || value === '' ? null : Number(value);
    this.received.set(amount !== null && Number.isFinite(amount) && amount >= 0 ? amount : null);
  }

  setType(type: SaleType): void {
    this.facade.setSaleType(type);
  }

  setCustomer(customerId: string | null): void {
    this.facade.setCustomer(customerId);
  }

  setPartial(partial: boolean): void {
    this.facade.setPartialPayment(partial);
  }

  setPaidAmount(value: string): void {
    this.facade.setPaidAmount(Number(value));
  }

  /** Montant au format français, sans décimale : 7 300. */
  fcfa(value: number | null | undefined): string {
    return Math.round(Number(value) || 0).toLocaleString('fr-FR');
  }

  checkout(): void {
    const vm = this.vm();
    if (!vm || vm.isLoading || !vm.canSell) return;
    if (vm.cart.length === 0) {
      this.snackbar.open('Panier vide : ajoutez un article.', 'OK', { duration: 2500 });
      return;
    }
    if (vm.form.partialPayment && !vm.form.customerId) {
      this.showOptions.set(true);
      this.snackbar.open('Vente à crédit : choisissez le client dans « Plus d’options ».', 'OK', { duration: 3500 });
      return;
    }
    const tender = this.tender();
    if (tender && tender.missing > 0) {
      this.snackbar.open(`Montant reçu insuffisant : il manque ${this.fcfa(tender.missing)} FCFA.`, 'OK', {
        duration: 4000
      });
      return;
    }
    const soldIds = vm.cart.map((r) => r.productId);
    const favoritesKey = this.favoritesKey();
    this.facade
      .createSale(tender ? tender.received : null)
      .pipe(take(1))
      .subscribe({
        next: (sale) => {
          recordSoldProducts(this.store, favoritesKey, soldIds);
          this.favoritesVersion.update((v) => v + 1);
          this.received.set(null);
          const change = sale.changeGiven != null ? Number(sale.changeGiven) : null;
          this.snackbar.open(
            `Vente ${sale.number ?? ''} enregistrée` + (change ? ` · Monnaie à rendre : ${this.fcfa(change)} FCFA` : ''),
            'OK',
            { duration: change ? 8000 : 2500 }
          );
        },
        error: (e: unknown) => this.snackbar.open(e instanceof Error ? e.message : 'Erreur', 'OK', { duration: 4000 })
      });
  }

  closeInvoice(): void {
    void this.invoiceDrawer?.close();
  }

  /** Ticket fermé : prêt pour le client suivant. */
  onInvoiceClosed(): void {
    this.shownSale = null;
    this.facade.dismissLastSale();
    this.focusSearch();
  }

  customerOf(vm: SalesVm, customerId: string | null | undefined) {
    return vm.customers.find((c) => c.id === customerId) ?? null;
  }

  /** Favoris propres au dépôt courant (clé commune tant qu'aucun dépôt n'est sélectionné). */
  private favoritesKey(): string {
    return this.warehouseId() || 'default';
  }

  private focusSearch(): void {
    setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
  }
}
