import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Observable, firstValueFrom, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { jwtInterceptor } from '../../../auth/interceptors/jwt.interceptor';
import { mockBackendInterceptor } from '../../../core/interceptors/mock-backend.interceptor';
import { PurchaseOrder } from '../../../core/models/purchase-order.model';
import { PurchasesFacade } from './purchases.facade';
import { PurchasesVm } from './purchases-vm.model';

const API = environment.apiUrl;

const ORDER: PurchaseOrder = {
  id: '7c4a2b10-0000-4000-8000-000000000001',
  number: 'CMD-2026-000012',
  supplierId: '7c4a2b10-0000-4000-8000-0000000000f1',
  supplierName: 'Essilor',
  status: 'DELIVERED',
  documentStatus: 'CLOSED',
  createdAt: '2026-10-01T09:00:00Z',
  lines: [],
  totalAmount: 100000,
  receivedAmount: 40000,
  paidAmount: 30000,
  remainingToPay: 10000
};

function signedIn(permissions: string[]): void {
  sessionStorage.setItem('access_token', 'mock-token::admin');
  sessionStorage.setItem('refresh_token', 'refresh');
  sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({ id: 'u', username: 'gestion.test', role: 'MANAGER', roles: ['GESTIONNAIRE'], permissions })
  );
}

describe('PurchasesFacade (API Spring Boot /api/purchases)', () => {
  let facade: PurchasesFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor, mockBackendInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
  });

  afterEach(() => http.verify());

  function init(permissions: string[]): void {
    signedIn(permissions);
    facade = TestBed.inject(PurchasesFacade);
    http = TestBed.inject(HttpTestingController);
  }

  function nextVm(predicate: (vm: PurchasesVm) => boolean): Promise<PurchasesVm> {
    return firstValueFrom((facade.vm$ as Observable<PurchasesVm>).pipe(skipWhile((vm) => !predicate(vm))));
  }

  function flushScreen(): void {
    http.expectOne(`${API}/purchases/orders`).flush({ items: [ORDER], total: 1 });
    http.expectOne(`${API}/suppliers`).flush({ items: [{ id: ORDER.supplierId, name: 'Essilor' }], total: 1 });
    http.expectOne(`${API}/products`).flush({ items: [], total: 0 });
  }

  it('commandes, fournisseurs et catalogue lus sur Spring Boot, droits issus des permissions', async () => {
    init(['purchase:read', 'purchase:create', 'purchase:receive', 'purchase:pay']);
    const vm = nextVm((v) => v.orders.length > 0);
    flushScreen();
    const loaded = await vm;

    expect(loaded.orders[0].remainingToPay).toBe(10000);
    expect(loaded.suppliers[0].id).toBe(ORDER.supplierId);
    expect(loaded).toMatchObject({ canCreate: true, canReceive: true, canPay: true });
  });

  it('lecture seule sans permission d’achat', async () => {
    init(['purchase:read']);
    const vm = nextVm((v) => v.orders.length > 0);
    flushScreen();
    expect(await vm).toMatchObject({ canCreate: false, canReceive: false, canPay: false });
  });

  it('erreur de chargement : message affiché, flux conservé', async () => {
    init(['purchase:read']);
    const screen = facade.vm$.subscribe();
    const failed = nextVm((v) => v.errorMessage !== null);
    http
      .expectOne(`${API}/purchases/orders`)
      .flush({ status: 403, code: 'ACCESS_DENIED', message: 'Accès refusé.' }, { status: 403, statusText: 'Forbidden' });
    // forkJoin annule les deux autres appels dès le premier échec.
    expect(http.expectOne(`${API}/suppliers`).cancelled).toBe(true);
    expect(http.expectOne(`${API}/products`).cancelled).toBe(true);
    expect((await failed).errorMessage).toBe('Accès refusé.');

    const recovered = nextVm((v) => v.orders.length > 0);
    facade.refresh();
    flushScreen();
    expect((await recovered).orders).toHaveLength(1);
    screen.unsubscribe();
  });

  it('paiement de commande et facture : contrats du backend', async () => {
    init(['purchase:pay']);
    const paid = firstValueFrom(
      facade.payOrder(ORDER.id, {
        amount: 10000,
        paymentDateIso: '2026-10-11',
        paymentMethod: 'BANK_TRANSFER',
        externalReference: 'VIR-9'
      }) as Observable<PurchaseOrder>
    );
    const pay = http.expectOne(`${API}/purchases/orders/${ORDER.id}/pay`);
    expect(pay.request.body).toEqual({
      amount: 10000,
      paymentDateIso: '2026-10-11',
      paymentMethod: 'BANK_TRANSFER',
      externalReference: 'VIR-9'
    });
    pay.flush({ ...ORDER, paidAmount: 40000, remainingToPay: 0 });
    expect((await paid).remainingToPay).toBe(0);

    const invoiced = firstValueFrom(
      facade.createInvoice(ORDER.id, { invoiceNumber: 'FA-1', invoiceDateIso: '2026-10-11' }) as Observable<unknown>
    );
    const inv = http.expectOne(`${API}/purchases/orders/${ORDER.id}/invoice`);
    expect(inv.request.body).toEqual({ invoiceNumber: 'FA-1', invoiceDateIso: '2026-10-11' });
    inv.flush({ invoiceNumber: 'FA-1', invoiceDateIso: '2026-10-11', totalAmount: 40000 }, { status: 201, statusText: 'Created' });
    await invoiced;
  });
});
