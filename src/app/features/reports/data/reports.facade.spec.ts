import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { jwtInterceptor } from '../../../auth/interceptors/jwt.interceptor';
import { ReportsFacade } from './reports.facade';

const API = environment.apiUrl;

function signedIn(permissions: string[]): void {
  sessionStorage.setItem('access_token', 'access');
  sessionStorage.setItem('refresh_token', 'refresh');
  sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({ id: 'u', username: 'gestion.test', role: 'MANAGER', roles: ['GESTIONNAIRE'], permissions })
  );
}

function periodRow(period: string, netSales: number, profit: number, count: number) {
  return { period, count, grossSales: netSales, returns: 0, netSales, cost: netSales - profit, profit };
}

describe('ReportsFacade (rapports calculés par le backend)', () => {
  let facade: ReportsFacade;
  let http: HttpTestingController;

  function init(permissions: string[]): void {
    localStorage.clear();
    sessionStorage.clear();
    signedIn(permissions);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([jwtInterceptor])), provideHttpClientTesting(), provideRouter([])]
    });
    facade = TestBed.inject(ReportsFacade);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  function byPeriod(): TestRequest[] {
    return http.match((r) => r.url === `${API}/reports/sales/by-period`);
  }

  it('onglet mensuel : totaux du mois (une ligne), série par jour', async () => {
    init(['report:read']);
    const screen = facade.vm$.subscribe();
    facade.setTab('MONTHLY');
    facade.setMonth('2026-02');
    // Les requêtes de l'onglet précédent ont été annulées par le changement de filtre.
    const requests = byPeriod().filter((r) => !r.cancelled && r.request.params.get('from') === '2026-02-01');
    expect(requests).toHaveLength(2);
    const totals = requests.find((r) => r.request.params.get('groupBy') === 'MONTH')!;
    const series = requests.find((r) => r.request.params.get('groupBy') === 'DAY')!;
    expect(totals.request.params.get('to')).toBe('2026-02-28');

    const vm = firstValueFrom(facade.vm$.pipe(skipWhile((v) => v.kpis.transactionsCount === 0)));
    totals.flush([periodRow('2026-02-01', 450000, 120000, 9)]);
    series.flush([periodRow('2026-02-01', 50000, 10000, 1), periodRow('2026-02-02', 0, 0, 0)]);
    const loaded = await vm;

    expect(loaded.kpis).toEqual({ totalSales: 450000, profit: 120000, transactionsCount: 9, returns: 0 });
    expect(loaded.salesSeries).toEqual([
      { label: '01/02', value: 50000 },
      { label: '02/02', value: 0 }
    ]);
    // Requêtes des onglets abandonnés : annulées, plus rien en attente.
    http.match(() => true).forEach((r) => expect(r.cancelled).toBe(true));
    screen.unsubscribe();
  });

  it('produits vendus : période de l’onglet, recherche, tri et page envoyés au backend', async () => {
    init(['report:read']);
    facade.setTab('MONTHLY');
    facade.setMonth('2026-02');
    const page = firstValueFrom(facade.topProducts({ q: 'mon', page: 1, size: 25, sort: ['profit,desc'] }));
    const top = http.expectOne((r) => r.url === `${API}/reports/sales/by-product`);
    const p = top.request.params;
    expect([p.get('from'), p.get('to'), p.get('q'), p.get('page'), p.get('size')]).toEqual(['2026-02-01', '2026-02-28', 'mon', '1', '25']);
    expect(p.getAll('sort')).toEqual(['profit,desc']);
    top.flush({
      items: [{ productId: 'p1', sku: 'MON-1', name: 'Monture', netQuantity: 3, netRevenue: 105000, profit: 40000 }],
      total: 26,
      page: 1,
      size: 25,
      totalPages: 2,
      summary: {}
    });
    const loaded = await page;
    expect(loaded.total).toBe(26);
    expect(loaded.items[0]).toMatchObject({ name: 'Monture', quantity: 3, total: 105000, profit: 40000 });
  });

  it('onglet annuel : totaux de l’année, série par mois', () => {
    init(['report:read']);
    const screen = facade.vm$.subscribe();
    facade.setTab('YEARLY');
    facade.setYear(2025);
    const live = byPeriod().filter((r) => !r.cancelled && r.request.params.get('from') === '2025-01-01');
    expect(live.map((r) => r.request.params.get('groupBy')).sort()).toEqual(['MONTH', 'YEAR']);
    expect(live[0].request.params.get('to')).toBe('2025-12-31');
    http.match(() => true).forEach((r) => {
      if (!r.cancelled) r.flush([]);
    });
    screen.unsubscribe();
  });

  it('sans report:read : aucun appel, message explicite', async () => {
    init(['sale:create']);
    const vm = await firstValueFrom(facade.vm$.pipe(skipWhile((v) => v.errorMessage === null)));
    expect(vm.errorMessage).toContain('report:read');
    http.expectNone(() => true);
  });
});
