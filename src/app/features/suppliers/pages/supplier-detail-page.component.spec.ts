import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { firstValueFrom, of, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { mockBackendInterceptor } from '../../../core/interceptors/mock-backend.interceptor';
import { PaySupplierDialogResult } from '../ui/pay-supplier-dialog.component';
import { SupplierDetailPageComponent } from './supplier-detail-page.component';

const API = environment.apiUrl;
const SUPPLIER_ID = '5a0e8f3c-0000-4000-8000-000000000001';

const ACCOUNT = {
  supplierId: SUPPLIER_ID,
  orderedAmount: 80000,
  receivedAmount: 30000,
  payableAmount: 80000,
  paidAmount: 45000,
  remainingToPay: 35000,
  advanceAmount: 15000,
  ordersToPay: 1
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

describe('SupplierDetailPageComponent (fiche fournisseur sur Spring Boot)', () => {
  let http: HttpTestingController;
  let dialogResult: PaySupplierDialogResult | undefined;

  function setup(permissions: string[]): SupplierDetailPageComponent {
    localStorage.clear();
    sessionStorage.clear();
    signedIn(permissions);
    TestBed.configureTestingModule({
      imports: [SupplierDetailPageComponent],
      providers: [
        // Mock global présent : /api/suppliers y reste simulé pour les achats, pas pour cet écran.
        provideHttpClient(withInterceptors([mockBackendInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: SUPPLIER_ID })) } }
      ]
    });
    // Le composant importe MatDialogModule : on remplace son MatDialog partout.
    TestBed.overrideProvider(MatDialog, { useValue: { open: () => ({ afterClosed: () => of(dialogResult) }) } });
    http = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(SupplierDetailPageComponent).componentInstance;
  }

  afterEach(() => http.verify());

  function flushAll(): void {
    http.expectOne(`${API}/suppliers/${SUPPLIER_ID}`).flush({ id: SUPPLIER_ID, name: 'Essilor', deliveryLeadTimeDays: 5 });
    const history = http.expectOne((r) => r.url === `${API}/suppliers/${SUPPLIER_ID}/purchases`);
    expect(history.request.params.get('allWarehouses')).toBe('true');
    history.flush({ items: [], total: 0 });
    http.expectOne(`${API}/suppliers/${SUPPLIER_ID}/payments`).flush({
      items: [
        {
          id: 'p1',
          number: 'PAF-2026-000001',
          supplierId: SUPPLIER_ID,
          paymentDateIso: '2026-10-10',
          amount: 45000,
          paymentMethod: 'BANK_TRANSFER',
          allocations: [
            { orderId: 'o1', orderNumber: 'CMD-2026-000001', amount: 30000 },
            { orderId: 'o2', orderNumber: 'CMD-2026-000002', amount: 15000 }
          ]
        }
      ],
      total: 1
    });
    http.expectOne(`${API}/suppliers/${SUPPLIER_ID}/account`).flush(ACCOUNT);
  }

  it('totaux lus dans le compte calculé par le backend, plus aucun calcul front', async () => {
    const page = setup(['supplier:read', 'purchase:read', 'purchase:pay', 'warehouse:all']);
    const vm = firstValueFrom(page.vm$.pipe(skipWhile((v) => v.isLoading)));
    flushAll();
    const loaded = await vm;

    expect(loaded.account).toEqual(ACCOUNT);
    expect(loaded.canPay).toBe(true);
    expect(page.ordersOf(loaded.payments[0])).toBe('CMD-2026-000001, CMD-2026-000002');
    expect(page.methodLabel('BANK_TRANSFER')).toBe('Virement');
  });

  it('sans purchase:read : seule la fiche est demandée, pas de bouton Payer', async () => {
    const page = setup(['supplier:read']);
    const vm = firstValueFrom(page.vm$.pipe(skipWhile((v) => v.isLoading)));
    http.expectOne(`${API}/suppliers/${SUPPLIER_ID}`).flush({ id: SUPPLIER_ID, name: 'Essilor', deliveryLeadTimeDays: 5 });
    const loaded = await vm;

    expect(loaded.account).toBeNull();
    expect(loaded.canReadPurchases).toBe(false);
    expect(loaded.canPay).toBe(false);
  });

  it('paiement : mode, référence et date envoyés au backend, puis rechargement', async () => {
    const page = setup(['supplier:read', 'purchase:read', 'purchase:pay', 'warehouse:all']);
    const screen = page.vm$.subscribe();
    const vm = firstValueFrom(page.vm$.pipe(skipWhile((v) => v.isLoading)));
    flushAll();
    const loaded = await vm;

    dialogResult = {
      amount: 35000,
      paymentDateIso: '2026-10-11',
      paymentMethod: 'CASH',
      externalReference: undefined,
      note: 'Solde'
    };
    page.paySupplier(loaded);
    const post = http.expectOne((r) => r.method === 'POST' && r.url === `${API}/suppliers/${SUPPLIER_ID}/payments`);
    expect(post.request.body).toEqual({
      amount: 35000,
      paymentDateIso: '2026-10-11',
      paymentMethod: 'CASH',
      externalReference: undefined,
      note: 'Solde'
    });
    post.flush({ id: 'p2', number: 'PAF-2026-000002', supplierId: SUPPLIER_ID, amount: 35000, paymentDateIso: '2026-10-11' });

    // Rechargement de la fiche (compte à jour).
    flushAll();
    screen.unsubscribe();
  });
});
