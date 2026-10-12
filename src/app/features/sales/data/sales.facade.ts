import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, finalize, forkJoin, map, shareReplay, tap } from 'rxjs';

import { Customer } from '../../../core/models/customer.model';
import { Product } from '../../../core/models/product.model';
import { PaymentMethod, Sale, SaleType } from '../../../core/models/sale.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { CreateSaleRequest, SalesApiService } from '../../../core/services/sales-api.service';
import { CartRow, SalesFormState, SalesTotals, SalesVm, toSaleItems } from './sales-vm.model';

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

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  private readonly productsSubject = new BehaviorSubject<Product[]>([]);
  private readonly customersSubject = new BehaviorSubject<Customer[]>([]);
  private readonly cartSubject = new BehaviorSubject<CartRow[]>([]);

  private readonly formSubject = new BehaviorSubject<SalesFormState>({
    type: 'RETAIL',
    customerId: null,
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
    this.auth.hasPermission$('sale:create')
  ]).pipe(
    map(([isLoading, errorMessage, products, customers, cart, form, lastSale, canSell]): SalesVm => ({
      isLoading,
      errorMessage,
      products,
      customers,
      cart,
      form,
      totals: this.computeTotals(cart),
      lastSale,
      canSell
    })),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  refresh(): void {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    // Catalogue (stock du dépôt courant) et clients du backend.
    forkJoin([this.productsApi.list(), this.salesApi.listCustomers()])
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

  setCustomer(customerId: string | null): void {
    const s = this.formSubject.value;
    this.formSubject.next({ ...s, customerId });
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
      customerId: form.customerId ?? undefined,
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
          this.formSubject.next({ ...this.formSubject.value, paidAmount: 0, partialPayment: false });
          // Stocks à jour après les sorties de la vente.
          this.refresh();
        },
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
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
