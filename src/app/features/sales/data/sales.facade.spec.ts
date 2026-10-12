import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Observable, firstValueFrom, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { jwtInterceptor } from '../../../auth/interceptors/jwt.interceptor';
import { mockBackendInterceptor } from '../../../core/interceptors/mock-backend.interceptor';
import { Product } from '../../../core/models/product.model';
import { Sale } from '../../../core/models/sale.model';
import { CashRegisterFacade } from '../../cash-register/data/cash-register.facade';
import { SalesFacade } from './sales.facade';
import { SalesVm } from './sales-vm.model';

const API = environment.apiUrl;

const FRAME: Product = {
  id: '4e2f0a10-0000-4000-8000-000000000001',
  sku: 'MON-RB3025',
  name: 'Monture Ray-Ban',
  categoryId: 'c',
  purchasePrice: 15000,
  retailPrice: 35000,
  wholesalePrice: 28000,
  stockQuantity: 5,
  alertThreshold: 2
};

const CUSTOMER_ID = '4e2f0a10-0000-4000-8000-0000000000c1';

function signedIn(permissions: string[]): void {
  sessionStorage.setItem('access_token', 'mock-token::admin');
  sessionStorage.setItem('refresh_token', 'refresh');
  sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({ id: 'u', username: 'caisse.test', role: 'EMPLOYEE', roles: ['CAISSIER'], permissions })
  );
}

describe('SalesFacade (point de vente sur Spring Boot)', () => {
  let facade: SalesFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    signedIn(['sale:create', 'cash:operate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor, mockBackendInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    facade = TestBed.inject(SalesFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function load(): void {
    facade.refresh();
    http.expectOne(`${API}/products`).flush({ items: [FRAME], total: 1 });
    http.expectOne(`${API}/customers`).flush({ items: [{ id: CUSTOMER_ID, name: 'Clinique', creditLimit: 500000 }], total: 1 });
  }

  function nextVm(predicate: (vm: SalesVm) => boolean): Promise<SalesVm> {
    return firstValueFrom((facade.vm$ as Observable<SalesVm>).pipe(skipWhile((vm) => !predicate(vm))));
  }

  it('paiement de la totalité : ni prix, ni coût, ni montant payé envoyés (le backend encaisse son total)', async () => {
    const screen = facade.vm$.subscribe();
    load();
    facade.addProductToCart(FRAME.id);
    facade.updateQuantity(FRAME.id, 2);
    const preview = await nextVm((v) => v.cart.length > 0 && v.cart[0].quantity === 2);
    expect(preview.totals.total).toBe(70000);
    expect(preview.canSell).toBe(true);

    const sold = firstValueFrom(facade.createSale());
    const post = http.expectOne(`${API}/sales`);
    expect(post.request.body).toEqual({
      type: 'RETAIL',
      customerId: undefined,
      paymentMethod: 'CASH',
      paidAmount: undefined,
      items: [{ productId: FRAME.id, quantity: 2 }]
    });
    const backendSale: Partial<Sale> = {
      id: 's1',
      number: 'VTE-2026-000001',
      total: 68000,
      paidAmount: 68000,
      creditAmount: 0,
      items: [{ productId: FRAME.id, productName: 'Monture Ray-Ban', quantity: 2, unitPrice: 34000, lineTotal: 68000 }]
    };
    post.flush(backendSale, { status: 201, statusText: 'Created' });
    // Rechargement du catalogue (stocks après la vente).
    http.expectOne(`${API}/products`).flush({ items: [{ ...FRAME, stockQuantity: 3 }], total: 1 });
    http.expectOne(`${API}/customers`).flush({ items: [], total: 0 });

    expect((await sold).total).toBe(68000);
    const after = await nextVm((v) => v.lastSale !== null);
    // La vente renvoyée fait foi, pas l'aperçu.
    expect(after.lastSale?.total).toBe(68000);
    expect(after.cart).toEqual([]);
    screen.unsubscribe();
  });

  it('paiement partiel : montant saisi et client envoyés, refus du backend remonté tel quel', async () => {
    load();
    facade.addProductToCart(FRAME.id);
    facade.setCustomer(CUSTOMER_ID);
    facade.setPartialPayment(true);
    facade.setPaidAmount(10000);
    facade.setSaleType('WHOLESALE');

    const result = firstValueFrom(facade.createSale()).catch((e: unknown) => e);
    const post = http.expectOne(`${API}/sales`);
    expect(post.request.body).toMatchObject({ type: 'WHOLESALE', customerId: CUSTOMER_ID, paidAmount: 10000 });
    post.flush(
      { status: 422, code: 'CREDIT_LIMIT_EXCEEDED', message: 'Plafond de crédit du client dépassé.' },
      { status: 422, statusText: 'Unprocessable Content' }
    );
    expect(((await result) as Error).message).toBe('Plafond de crédit du client dépassé.');
  });
});

describe('CashRegisterFacade (caisse sur Spring Boot)', () => {
  it('erreur sur « ma caisse » : message affiché, écran utilisable (aucune caisse)', async () => {
    localStorage.clear();
    sessionStorage.clear();
    signedIn(['cash:operate']);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting(), provideRouter([])]
    });
    const facade = TestBed.inject(CashRegisterFacade);
    const http = TestBed.inject(HttpTestingController);
    const vm = firstValueFrom(facade.vm$.pipe(skipWhile((v) => v.errorMessage === null)));
    http
      .expectOne(`${API}/cash-register/current`)
      .flush({ status: 403, code: 'ACCESS_DENIED', message: 'Accès refusé.' }, { status: 403, statusText: 'Forbidden' });
    const loaded = await vm;
    expect(loaded.current).toBeNull();
    expect(loaded.errorMessage).toBe('Accès refusé.');
    http.verify();
  });
});
