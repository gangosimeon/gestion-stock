import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { jwtInterceptor } from '../../../auth/interceptors/jwt.interceptor';
import { DashboardFacade } from './dashboard.facade';

const API = environment.apiUrl;

function signedIn(permissions: string[]): void {
  sessionStorage.setItem('access_token', 'access');
  sessionStorage.setItem('refresh_token', 'refresh');
  sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({ id: 'u', username: 'caisse.test', role: 'EMPLOYEE', roles: ['CAISSIER'], permissions })
  );
}

describe('DashboardFacade', () => {
  let facade: DashboardFacade;
  let http: HttpTestingController;

  function init(permissions: string[]): void {
    localStorage.clear();
    sessionStorage.clear();
    signedIn(permissions);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting(), provideRouter([])]
    });
    facade = TestBed.inject(DashboardFacade);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  it('caissier : sa journée, sa caisse et les alertes stock, jamais le tableau de bord du magasin', async () => {
    init(['sale:create', 'cash:operate', 'stock:read']);
    const vm = firstValueFrom(facade.vm$.pipe(skipWhile((v) => v.seller === null)));
    facade.refresh();

    http.expectNone(`${API}/dashboard`);
    http.expectOne(`${API}/dashboard/me`).flush({
      date: '2026-10-11',
      salesCount: 3,
      salesTotal: 90000,
      paidAmount: 70000,
      creditAmount: 20000,
      customerPaymentsAmount: 11000,
      customerPaymentsCount: 1,
      collectedAmount: 81000,
      cancelledCount: 1,
      lastSaleAt: '2026-10-11T14:00:00Z',
      last7Days: [
        { date: '2026-10-10', label: '10/10', count: 0, total: 0 },
        { date: '2026-10-11', label: '11/10', count: 3, total: 90000 }
      ]
    });
    http.expectOne(`${API}/cash-register/current`).flush({ id: 'c1', status: 'OPEN', expectedCash: 120000, openedAt: '2026-10-11T08:00:00Z' });
    http.expectOne(`${API}/alerts/summary`).flush({ total: 7, stockAlertsCount: 5 });

    const loaded = await vm;
    expect(loaded.canRead).toBe(false);
    expect(loaded.seller?.myDay?.salesTotal).toBe(90000);
    expect(loaded.seller?.myDay?.collectedAmount).toBe(81000);
    expect(loaded.seller?.cash?.expectedCash).toBe(120000);
    expect(loaded.seller?.stockAlerts).toBe(5);
    expect(loaded.seller?.myDay?.last7Days.map((p) => p.total)).toEqual([0, 90000]);
  });

  it('caisse ou alertes indisponibles : la journée du vendeur reste affichée', async () => {
    init(['sale:create', 'cash:operate', 'stock:read']);
    const vm = firstValueFrom(facade.vm$.pipe(skipWhile((v) => v.seller === null)));
    facade.refresh();
    http.expectOne(`${API}/dashboard/me`).flush({ date: '2026-10-11', salesCount: 0, salesTotal: 0, paidAmount: 0, creditAmount: 0, cancelledCount: 0, lastSaleAt: null, last7Days: [] });
    http.expectOne(`${API}/cash-register/current`).flush({}, { status: 500, statusText: 'Error' });
    http.expectOne(`${API}/alerts/summary`).flush({}, { status: 403, statusText: 'Forbidden' });
    const loaded = await vm;
    expect(loaded.seller?.myDay?.salesCount).toBe(0);
    expect(loaded.seller?.cash).toBeNull();
    expect(loaded.seller?.stockAlerts).toBeNull();
  });

  it('report:read : tableau de bord du magasin uniquement', () => {
    init(['report:read', 'sale:create']);
    facade.refresh();
    http.expectOne(`${API}/dashboard`).flush({ kpis: { todaySalesTotal: 0, todayProfit: 0, stockTotal: 0 }, salesByDay: [], topProducts: [], stockEvolution: [] });
    http.expectNone(`${API}/dashboard/me`);
  });
});
