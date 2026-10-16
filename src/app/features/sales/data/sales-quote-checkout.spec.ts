import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, firstValueFrom, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { jwtInterceptor } from '../../../auth/interceptors/jwt.interceptor';
import { Product } from '../../../core/models/product.model';
import { Quote } from '../../../core/models/quote.model';
import { SalesFacade } from './sales.facade';
import { SalesVm } from './sales-vm.model';

const API = environment.apiUrl;
const CUSTOMER_ID = '4e2f0a10-0000-4000-8000-0000000000c1';

const CEMENT: Product = {
  id: 'p-cement',
  sku: 'CIM-50',
  name: 'Sac de ciment 50 kg CPA 45',
  categoryId: 'c',
  purchasePrice: 5000,
  retailPrice: 6500,
  wholesalePrice: 6200,
  stockQuantity: 500,
  alertThreshold: 10
};

const QUOTE: Quote = {
  id: 'q1',
  number: 'DEV-2026-000001',
  warehouseId: 'w1',
  customerId: CUSTOMER_ID,
  customerName: 'ONG HELP',
  quoteDate: '2022-03-23',
  validUntil: null,
  subject: 'Matériels de latrine',
  lotReference: '2',
  beneficiaries: 20,
  deliveryAddress: null,
  contractReference: null,
  deliveryTerms: null,
  paymentTerms: null,
  executionDelay: null,
  notes: null,
  status: 'ACCEPTED',
  displayStatus: 'ACCEPTED',
  lines: [
    { id: 'l1', lineNumber: 1, productId: CEMENT.id, productSku: 'CIM-50', productName: CEMENT.name, quantity: 120, unitPrice: 6000, lineTotal: 720000 },
    { id: 'l2', lineNumber: 2, productId: 'p-gone', productSku: 'OLD', productName: 'Produit retiré', quantity: 1, unitPrice: 100, lineTotal: 100 }
  ],
  total: 720100,
  saleId: null,
  saleNumber: null,
  invoicedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2026-10-16T08:00:00Z',
  updatedAt: '2026-10-16T08:00:00Z'
};

describe('SalesFacade — facture d’un devis (vente préparée puis rattachée)', () => {
  let facade: SalesFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'access');
    sessionStorage.setItem('refresh_token', 'refresh');
    sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({ id: 'u', username: 'gestion', role: 'MANAGER', roles: ['GESTIONNAIRE'], permissions: ['sale:create', 'quote:manage'] })
    );
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting(), provideRouter([])]
    });
    facade = TestBed.inject(SalesFacade);
    http = TestBed.inject(HttpTestingController);
    facade.refresh();
    http.expectOne(`${API}/products`).flush({ items: [CEMENT], total: 1 });
    http.expectOne(`${API}/customers`).flush({ items: [{ id: CUSTOMER_ID, name: 'ONG HELP' }], total: 1 });
  });

  afterEach(() => http.verify());

  function nextVm(predicate: (vm: SalesVm) => boolean): Promise<SalesVm> {
    return firstValueFrom((facade.vm$ as Observable<SalesVm>).pipe(skipWhile((vm) => !predicate(vm))));
  }

  function sell(): void {
    void firstValueFrom(facade.createSale()).catch(() => undefined);
  }

  function flushSale(id: string, number: string): void {
    const post = http.expectOne(`${API}/sales`);
    // Aucun prix envoyé : la vente suit les règles habituelles (tarif du catalogue côté serveur).
    expect(post.request.body.items).toEqual([{ productId: CEMENT.id, quantity: 120 }]);
    expect(post.request.body.customerId).toBe(CUSTOMER_ID);
    post.flush({ id, number, customerId: CUSTOMER_ID, total: 780000, paidAmount: 780000, items: [] }, { status: 201, statusText: 'Created' });
    http.expectOne(`${API}/products`).flush({ items: [CEMENT], total: 1 });
    http.expectOne(`${API}/customers`).flush({ items: [], total: 0 });
  }

  it('le panier reprend le client, les produits et les quantités ; un produit absent du catalogue est signalé', async () => {
    const screen = facade.vm$.subscribe();
    facade.loadQuote(QUOTE);
    const vm = await nextVm((v) => v.quote !== null);
    expect(vm.form.customerId).toBe(CUSTOMER_ID);
    expect(vm.cart.map((r) => [r.productId, r.quantity])).toEqual([[CEMENT.id, 120]]);
    // Prix du catalogue (le serveur les applique de toute façon), pas ceux du devis.
    expect(vm.cart[0].unitPrice).toBe(6500);
    expect(vm.quote?.missing).toEqual(['Produit retiré']);
    expect(vm.quote?.status).toBe('pending');
    screen.unsubscribe();
  });

  it('vente enregistrée : elle est rattachée au devis, qui devient facturé', async () => {
    const screen = facade.vm$.subscribe();
    facade.loadQuote(QUOTE);
    sell();
    flushSale('s1', 'VTE-2026-000010');

    const link = http.expectOne(`${API}/quotes/q1/invoice`);
    expect(link.request.body).toEqual({ saleId: 's1' });
    link.flush({ ...QUOTE, status: 'INVOICED', saleId: 's1', saleNumber: 'VTE-2026-000010' });

    const vm = await nextVm((v) => v.quote?.status === 'linked');
    expect(vm.quote?.saleNumber).toBe('VTE-2026-000010');
    // Ticket fermé : la vente suivante n'a plus de lien avec le devis.
    facade.dismissLastSale();
    expect((await nextVm((v) => v.quote === null)).quote).toBeNull();
    screen.unsubscribe();
  });

  it('rattachement refusé : la vente reste enregistrée, l’erreur est affichée et la même demande peut être refaite', async () => {
    const screen = facade.vm$.subscribe();
    facade.loadQuote(QUOTE);
    sell();
    flushSale('s2', 'VTE-2026-000011');
    http
      .expectOne(`${API}/quotes/q1/invoice`)
      .flush({ code: 'QUOTE_SALE_MISMATCH', message: 'Cette vente ne correspond pas au devis.' }, { status: 422, statusText: 'Unprocessable' });

    const failed = await nextVm((v) => v.quote?.status === 'error');
    expect(failed.quote?.error).toContain('ne correspond pas');
    expect(failed.lastSale?.id).toBe('s2');

    facade.retryQuoteLink();
    const retry = http.expectOne(`${API}/quotes/q1/invoice`);
    expect(retry.request.body).toEqual({ saleId: 's2' });
    retry.flush({ ...QUOTE, status: 'INVOICED', saleId: 's2' });
    expect((await nextVm((v) => v.quote?.status === 'linked')).quote?.saleId).toBe('s2');
    screen.unsubscribe();
  });

  it('panier vidé : la vente n’est plus liée au devis', async () => {
    const screen = facade.vm$.subscribe();
    facade.loadQuote(QUOTE);
    facade.clearCart();
    expect((await nextVm((v) => v.quote === null)).cart).toEqual([]);
    screen.unsubscribe();
  });
});
