import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { firstValueFrom, of, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { mockBackendInterceptor } from '../../../core/interceptors/mock-backend.interceptor';
import { PayCustomerDialogResult } from '../ui/pay-customer-dialog.component';
import { ClientDetailPageComponent } from './client-detail-page.component';

const API = environment.apiUrl;
const ID = '2b9d1f00-0000-4000-8000-000000000001';
const CLIENT = { id: ID, name: 'Clinique Vision Plus', creditLimit: 500000, balance: 120000, availableCredit: 380000 };

function signedIn(permissions: string[]): void {
  sessionStorage.setItem('access_token', 'mock-token::admin');
  sessionStorage.setItem('refresh_token', 'refresh');
  sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({ id: 'u', username: 'caisse.test', role: 'EMPLOYEE', roles: ['CAISSIER'], permissions })
  );
}

describe('ClientDetailPageComponent (fiche client sur Spring Boot)', () => {
  let http: HttpTestingController;
  let dialogResult: PayCustomerDialogResult | undefined;
  let dialogData: { maxAmount?: number } | undefined;

  function setup(permissions: string[]): ClientDetailPageComponent {
    localStorage.clear();
    sessionStorage.clear();
    signedIn(permissions);
    TestBed.configureTestingModule({
      imports: [ClientDetailPageComponent],
      providers: [
        provideHttpClient(withInterceptors([mockBackendInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: ID })) } }
      ]
    });
    TestBed.overrideProvider(MatDialog, {
      useValue: {
        open: (_: unknown, config: { data: { maxAmount?: number } }) => {
          dialogData = config.data;
          return { afterClosed: () => of(dialogResult) };
        }
      }
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(ClientDetailPageComponent).componentInstance;
  }

  afterEach(() => http.verify());

  function flushAll(withSales = true): void {
    http.expectOne(`${API}/customers/${ID}`).flush(CLIENT);
    if (withSales) {
      http.expectOne(`${API}/customers/${ID}/sales`).flush({
        items: [{ id: 's1', number: 'VTE-2026-000004', total: 200000, paidAmount: 80000, creditAmount: 120000 }],
        total: 1
      });
    }
    http.expectOne(`${API}/customers/${ID}/payments`).flush({ items: [], total: 0 });
  }

  it('dette et crédit disponible du backend ; part à crédit de chaque vente fournie par le backend', async () => {
    const page = setup(['customer:read', 'sale:read', 'customer:pay']);
    const vm = firstValueFrom(page.vm$.pipe(skipWhile((v) => v.isLoading)));
    flushAll();
    const loaded = await vm;

    expect(loaded.customer?.balance).toBe(120000);
    expect(loaded.customer?.availableCredit).toBe(380000);
    expect(page.dueAmount(loaded.sales[0])).toBe(120000);
    expect(loaded.canPay).toBe(true);
  });

  it('sans sale:read : pas de demande d’historique des ventes', async () => {
    const page = setup(['customer:read']);
    const vm = firstValueFrom(page.vm$.pipe(skipWhile((v) => v.isLoading)));
    flushAll(false);
    const loaded = await vm;
    expect(loaded.canReadSales).toBe(false);
    expect(loaded.canPay).toBe(false);
  });

  it('règlement : plafond = dette du backend, mode envoyé, pas de date (encaissé maintenant)', async () => {
    const page = setup(['customer:read', 'sale:read', 'customer:pay']);
    const screen = page.vm$.subscribe();
    const vm = firstValueFrom(page.vm$.pipe(skipWhile((v) => v.isLoading)));
    flushAll();
    const loaded = await vm;

    dialogResult = { amount: 50000, paymentMethod: 'MOBILE_MONEY', note: 'Acompte' };
    page.receivePayment(loaded);
    expect(dialogData?.maxAmount).toBe(120000);
    const post = http.expectOne((r) => r.method === 'POST' && r.url === `${API}/customers/${ID}/payments`);
    expect(post.request.body).toEqual({ amount: 50000, paymentMethod: 'MOBILE_MONEY', note: 'Acompte' });
    post.flush({ id: 'p1', customerId: ID, amount: 50000, paymentDateIso: '2026-10-11', reference: 'OPC-2026-000010' });

    flushAll();
    screen.unsubscribe();
  });
});
