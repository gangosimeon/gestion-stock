import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, Observable, Subscription, combineLatest, finalize, forkJoin, map, shareReplay, tap } from 'rxjs';

import { confirmWith } from '../../../shared/dialog/confirm-dialog.component';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import { PaymentMethod, Sale, SaleType } from '../../../core/models/sale.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { CreateSaleRequest, SalesApiService } from '../../../core/services/sales-api.service';
import { CartRow, NewCustomerDraft, SalesFormState, SalesTotals, SalesVm, toSaleItems } from './sales-vm.model';

/**
 * Point de vente. Le panier n'est qu'un aperçu : le backend fixe les prix (tarif du produit),
 * calcule les montants, vérifie le stock, le crédit du client et encaisse dans la caisse ouverte.
 * La vente renvoyée par le backend fait foi (facture, montants).
 */
@Injectable({
  providedIn: 'root'
})
export class SalesFacade {
  private readonly productsApi = inject(ProductsApiService);
  private readonly salesApi = inject(SalesApiService);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly warehouseCtx = inject(WarehouseContextService);

  private loading?: Subscription;

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  private readonly productsSubject = new BehaviorSubject<Product[]>([]);
  private readonly customersSubject = new BehaviorSubject<Customer[]>([]);
  private readonly cartSubject = new BehaviorSubject<CartRow[]>([]);

  private readonly formSubject = new BehaviorSubject<SalesFormState>({
    type: 'RETAIL',
    customerId: null,
    newCustomer: null,
    paymentMethod: 'CASH',
    paidAmount: 0,
    partialPayment: false
  });

  private readonly lastSaleSubject = new BehaviorSubject<Sale | null>(null);

  readonly vm$: Observable<SalesVm> = combineLatest([
    this.isLoadingSubject,
    this.errorSubject,
    this.productsSubject,
    this.customersSubject,
    this.cartSubject,
    this.formSubject,
    this.lastSaleSubject,
    // Interface seulement : le backend exige sale:create.
    this.auth.hasPermission$('sale:create'),
    this.auth.hasPermission$('customer:create')
  ]).pipe(
    map(([isLoading, errorMessage, products, customers, cart, form, lastSale, canSell, canCreateCustomer]): SalesVm => ({
      isLoading,
      errorMessage,
      products,
      customers,
      cart,
      form,
      totals: this.computeTotals(cart),
      lastSale,
      canSell,
      canCreateCustomer
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    // Le panier appartient au dépôt courant (stock, caisse) : le changer demande confirmation.
    this.warehouseCtx.addSwitchCheck(() => this.confirmWarehouseSwitch());
    this.warehouseCtx.warehouseChanged$.subscribe(() => this.resetForNewWarehouse());
  }

  refresh(): void {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    // Catalogue (stock du dépôt courant) et clients du backend. Un chargement plus ancien (autre
    // dépôt) est abandonné : sa réponse ne remplace jamais celle du dépôt courant.
    this.loading?.unsubscribe();
    this.loading = forkJoin([this.productsApi.list(), this.salesApi.listCustomers()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)))
      .subscribe({
        next: ([p, c]) => {
          this.productsSubject.next(p.items.filter((x) => x.active !== false));
          this.customersSubject.next(c.items);
        },
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      });
  }

  setSaleType(type: SaleType): void {
    const s = this.formSubject.value;
    this.formSubject.next({ ...s, type });

    // Aperçu au tarif choisi ; le backend applique le même tarif à l'enregistrement.
    const products = this.productsSubject.value;
    const cart = this.cartSubject.value.map((row) => {
      const p = products.find((x) => x.id === row.productId);
      if (!p) return row;
      const unitPrice = type === 'WHOLESALE' ? p.wholesalePrice : p.retailPrice;
      return this.recomputeLine({ ...row, unitPrice });
    });
    this.cartSubject.next(cart);
  }

  /** Client existant (ou comptoir) : abandonne une éventuelle saisie de nouveau client. */
  setCustomer(customerId: string | null): void {
    const s = this.formSubject.value;
    this.formSubject.next({ ...s, customerId, newCustomer: null });
  }

  /** Saisie d'un client absent de la base : il sera créé avec la vente, côté serveur. */
  startNewCustomer(): void {
    const s = this.formSubject.value;
    this.formSubject.next({ ...s, customerId: null, newCustomer: { name: '', phone: '' } });
  }

  setNewCustomer(draft: NewCustomerDraft): void {
    const s = this.formSubject.value;
    if (s.newCustomer) this.formSubject.next({ ...s, newCustomer: draft });
  }

  cancelNewCustomer(): void {
    const s = this.formSubject.value;
    this.formSubject.next({ ...s, newCustomer: null });
  }

  setPaymentMethod(paymentMethod: PaymentMethod): void {
    const s = this.formSubject.value;
    this.formSubject.next({ ...s, paymentMethod });
  }

  setPaidAmount(paidAmount: number): void {
    const s = this.formSubject.value;
    this.formSubject.next({ ...s, paidAmount: Number.isFinite(paidAmount) ? paidAmount : 0 });
  }

  /** Paiement partiel (reste dû porté au compte du client) ou paiement de la totalité. */
  setPartialPayment(partialPayment: boolean): void {
    const s = this.formSubject.value;
    this.formSubject.next({ ...s, partialPayment });
  }

  addProductToCart(productId: string): void {
    const products = this.productsSubject.value;
    const p = products.find((x) => x.id === productId);
    if (!p) return;

    const type = this.formSubject.value.type;
    const unitPrice = type === 'WHOLESALE' ? p.wholesalePrice : p.retailPrice;

    const existing = this.cartSubject.value.find((x) => x.productId === productId);
    if (existing) {
      this.updateQuantity(productId, existing.quantity + 1);
      return;
    }

    const row: CartRow = this.recomputeLine({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      stockQuantity: p.stockQuantity,
      quantity: 1,
      unitPrice,
      lineTotal: 0
    });

    this.cartSubject.next([row, ...this.cartSubject.value]);
  }

  updateQuantity(productId: string, quantity: number): void {
    const q = Math.floor(quantity);
    const next = this.cartSubject.value
      .map((r) => (r.productId === productId ? this.recomputeLine({ ...r, quantity: q }) : r))
      .filter((r) => r.quantity > 0);

    this.cartSubject.next(next);
  }

  removeLine(productId: string): void {
    this.cartSubject.next(this.cartSubject.value.filter((r) => r.productId !== productId));
  }

  /** Ticket fermé : la vente encaissée n'est plus affichée (la prochaine vente repart de zéro). */
  dismissLastSale(): void {
    if (this.lastSaleSubject.value) this.lastSaleSubject.next(null);
  }

  clearCart(): void {
    this.cartSubject.next([]);
    this.lastSaleSubject.next(null);
    this.formSubject.next({ ...this.formSubject.value, paidAmount: 0, partialPayment: false });
  }

  /**
   * Enregistre la vente. Aucun prix ni coût envoyé ; paiement de la totalité : `paidAmount`
   * absent (le backend encaisse son propre total) ; paiement partiel : montant saisi.
   */
  createSale(): Observable<Sale> {
    const form = this.formSubject.value;
    const cart = this.cartSubject.value;

    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    const payload: CreateSaleRequest = {
      type: form.type,
      customerId: form.newCustomer ? undefined : (form.customerId ?? undefined),
      newCustomer: form.newCustomer
        ? { name: form.newCustomer.name.trim(), phone: form.newCustomer.phone.trim() || undefined }
        : undefined,
      paymentMethod: form.paymentMethod,
      paidAmount: form.partialPayment ? form.paidAmount : undefined,
      items: toSaleItems(cart)
    };

    return this.salesApi.create(payload).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
      tap({
        next: (sale) => {
          this.lastSaleSubject.next(sale);
          this.cartSubject.next([]);
          // Client créé (ou retrouvé) par le serveur : il devient le client sélectionné.
          this.formSubject.next({
            ...this.formSubject.value,
            customerId: sale.customerId ?? null,
            newCustomer: null,
            paidAmount: 0,
            partialPayment: false
          });
          // Stocks et liste des clients à jour après la vente.
          this.refresh();
        },
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  /** Panier vide : rien à perdre ; sinon l'utilisateur confirme qu'il abandonne le panier. */
  private async confirmWarehouseSwitch(): Promise<boolean> {
    if (this.cartSubject.value.length === 0) return true;
    const confirmed = await confirmWith(this.dialog, {
      title: 'Changer de magasin',
      message:
        'Le panier en cours sera vidé : ses prix et son stock sont ceux du magasin actuel. Changer de magasin quand même ?',
      confirmLabel: 'Vider et changer'
    });
    if (confirmed) this.clearCart();
    return confirmed;
  }

  /** Nouveau dépôt : rien du précédent ne subsiste (catalogue et stock, panier, dernier ticket). */
  private resetForNewWarehouse(): void {
    this.loading?.unsubscribe();
    this.isLoadingSubject.next(false);
    this.productsSubject.next([]);
    this.clearCart();
  }

  /** Aperçu du panier (estimation) ; les montants qui font foi sont ceux de la vente renvoyée. */
  private computeTotals(cart: CartRow[]): SalesTotals {
    const total = cart.reduce((acc, r) => acc + r.lineTotal, 0);
    const itemsCount = cart.reduce((acc, r) => acc + r.quantity, 0);
    return { total, itemsCount };
  }

  private recomputeLine(row: CartRow): CartRow {
    const qty = Number.isFinite(row.quantity) ? row.quantity : 0;
    const unit = Number.isFinite(row.unitPrice) ? row.unitPrice : 0;
    return { ...row, quantity: qty, unitPrice: unit, lineTotal: unit * qty };
  }
}
