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
    http.expectOne(`${API}/suppliers`).flush({ items: [{ id: ORDER.supplierId, name: 'Essilor' }], total: 1 });
    http.expectOne(`${API}/products`).flush({ items: [], total: 0 });
  }

  it('fournisseurs et catalogue lus sur Spring Boot, droits issus des permissions', async () => {
    init(['purchase:read', 'purchase:create', 'purchase:receive', 'purchase:pay']);
    const vm = nextVm((v) => v.suppliers.length > 0);
    flushScreen();
    const loaded = await vm;

    expect(loaded.suppliers[0].id).toBe(ORDER.supplierId);
    expect(loaded).toMatchObject({ canCreate: true, canReceive: true, canPay: true });
  });

  it('commandes paginées côté serveur : recherche, statut, fournisseur et tri envoyés au backend', async () => {
    init(['purchase:read']);
    const page = firstValueFrom(
      facade.search({ q: 'CMD', page: 0, size: 10, sort: ['totalAmount,asc'] }, { status: 'PARTIALLY_RECEIVED', supplierId: ORDER.supplierId })
    );
    const req = http.expectOne((r) => r.url === `${API}/purchases/orders`);
    expect(req.request.params.get('q')).toBe('CMD');
    expect(req.request.params.get('status')).toBe('PARTIALLY_RECEIVED');
    expect(req.request.params.get('supplierId')).toBe(ORDER.supplierId);
    expect(req.request.params.getAll('sort')).toEqual(['totalAmount,asc']);
    req.flush({ items: [ORDER], total: 1 });
    expect((await page).items[0].remainingToPay).toBe(10000);
  });

  it('lecture seule sans permission d’achat', async () => {
    init(['purchase:read']);
    const vm = nextVm((v) => v.suppliers.length > 0);
    flushScreen();
    expect(await vm).toMatchObject({ canCreate: false, canReceive: false, canPay: false });
  });

  it('erreur de chargement : message affiché, flux conservé', async () => {
    init(['purchase:read']);
    const screen = facade.vm$.subscribe();
    const failed = nextVm((v) => v.errorMessage !== null);
    http
      .expectOne(`${API}/suppliers`)
      .flush({ status: 403, code: 'ACCESS_DENIED', message: 'Accès refusé.' }, { status: 403, statusText: 'Forbidden' });
    // forkJoin annule l'autre appel dès le premier échec.
    expect(http.expectOne(`${API}/products`).cancelled).toBe(true);
    expect((await failed).errorMessage).toBe('Accès refusé.');

    const recovered = nextVm((v) => v.suppliers.length > 0);
    facade.refresh();
    flushScreen();
    expect((await recovered).suppliers).toHaveLength(1);
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
