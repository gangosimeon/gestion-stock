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
import { Quote } from '../../../core/models/quote.model';
import { QuotesApiService } from '../../../core/services/quotes-api.service';
import { toMessage } from '../../../core/interceptors/api-error.interceptor';
import { HttpErrorResponse } from '@angular/common/http';
import { CartRow, NewCustomerDraft, QuoteCheckout, SalesFormState, SalesTotals, SalesVm, toSaleItems } from './sales-vm.model';

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
  private readonly quotesApi = inject(QuotesApiService);
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
  private readonly quoteSubject = new BehaviorSubject<QuoteCheckout | null>(null);

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
    this.auth.hasPermission$('customer:create'),
    this.quoteSubject
  ]).pipe(
    map(([isLoading, errorMessage, products, customers, cart, form, lastSale, canSell, canCreateCustomer, quote]): SalesVm => ({
      isLoading,
      errorMessage,
      products,
      customers,
      cart,
      form,
      totals: this.computeTotals(cart),
      lastSale,
      canSell,
      canCreateCustomer,
      quote
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
      imageVersion: p.imageVersion ?? null,
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
    // Devis facturé : la vente suivante n'a plus de lien avec lui.
    if (this.quoteSubject.value?.status === 'linked') this.quoteSubject.next(null);
  }

  /**
   * Prépare la vente d'un devis (catalogue du dépôt chargé) : client, produits et quantités du
   * devis. Les prix restent ceux du catalogue, appliqués par le serveur comme pour toute vente.
   */
  loadQuote(quote: Quote): void {
    const products = this.productsSubject.value;
    const type = this.formSubject.value.type;
    const missing: string[] = [];
    const rows: CartRow[] = [];
    for (const line of quote.lines) {
      const p = products.find((x) => x.id === line.productId);
      if (!p) {
        missing.push(line.productName);
        continue;
      }
      rows.push(
        this.recomputeLine({
          productId: p.id,
          sku: p.sku,
          name: p.name,
          imageVersion: p.imageVersion ?? null,
          stockQuantity: p.stockQuantity,
          quantity: line.quantity,
          unitPrice: type === 'WHOLESALE' ? p.wholesalePrice : p.retailPrice,
          lineTotal: 0
        })
      );
    }
    this.cartSubject.next(rows);
    this.lastSaleSubject.next(null);
    this.formSubject.next({
      ...this.formSubject.value,
      customerId: quote.customerId,
      newCustomer: null,
      paidAmount: 0,
      partialPayment: false
    });
    this.quoteSubject.next({
      id: quote.id,
      number: quote.number,
      customerId: quote.customerId,
      customerName: quote.customerName,
      missing,
      reference: {
        id: quote.id,
        number: quote.number,
        quoteDate: quote.quoteDate,
        subject: quote.subject,
        lotReference: quote.lotReference,
        beneficiaries: quote.beneficiaries,
        deliveryAddress: quote.deliveryAddress,
        contractReference: quote.contractReference,
        deliveryTerms: quote.deliveryTerms,
        paymentTerms: quote.paymentTerms,
        executionDelay: quote.executionDelay,
        notes: quote.notes
      },
      status: 'pending',
      saleId: null,
      saleNumber: null,
      error: null
    });
  }

  /** Rattachement de la vente au devis à refaire (la vente, elle, est déjà enregistrée). */
  retryQuoteLink(): void {
    const q = this.quoteSubject.value;
    if (q?.status === 'error' && q.saleId) this.linkQuote(q, q.saleId, q.saleNumber);
  }

  clearCart(): void {
    this.quoteSubject.next(null);
    this.cartSubject.next([]);
    this.lastSaleSubject.next(null);
    this.formSubject.next({ ...this.formSubject.value, paidAmount: 0, partialPayment: false });
  }

  /**
   * Enregistre la vente. Aucun prix ni coût envoyé ; paiement de la totalité : `paidAmount`
   * absent (le backend encaisse son propre total) ; paiement partiel : montant saisi.
   *
   * @param cashReceived espèces remises par le client (vérification) : le serveur conserve ce
   *                     montant et calcule la monnaie rendue
   */
  createSale(cashReceived: number | null = null): Observable<Sale> {
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
      cashReceived: cashReceived ?? undefined,
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
          // Vente issue d'un devis : elle en devient la facture.
          const quote = this.quoteSubject.value;
          if (quote && (quote.status === 'pending' || quote.status === 'error') && sale.id) {
            this.linkQuote(quote, sale.id, sale.number ?? null);
          }
          // Stocks et liste des clients à jour après la vente.
          this.refresh();
        },
        error: (e: unknown) => this.errorSubject.next(e instanceof Error ? e.message : 'Erreur')
      })
    );
  }

  private linkQuote(quote: QuoteCheckout, saleId: string, saleNumber: string | null): void {
    this.quoteSubject.next({ ...quote, status: 'linking', saleId, saleNumber, error: null });
    this.quotesApi.invoice(quote.id, saleId).subscribe({
      next: () => this.quoteSubject.next({ ...quote, status: 'linked', saleId, saleNumber, error: null }),
      error: (e: unknown) =>
        this.quoteSubject.next({
          ...quote,
          status: 'error',
          saleId,
          saleNumber,
          error: e instanceof HttpErrorResponse ? toMessage(e) : 'Rattachement impossible.'
        })
    });
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
