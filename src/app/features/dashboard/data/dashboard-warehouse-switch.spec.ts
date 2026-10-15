import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { DashboardFacade } from './dashboard.facade';

const API = environment.apiUrl;
const PLATEAU = { id: '3f0c8e1a-0000-4000-8000-000000000001', name: 'Magasin Plateau' };
const COCODY = { id: '3f0c8e1a-0000-4000-8000-000000000002', name: 'Magasin Cocody' };

function dashboard(todaySalesTotal: number) {
  return { kpis: { todaySalesTotal, todayProfit: 0, stockTotal: 0 }, salesByDay: [], topProducts: [], stockEvolution: [] };
}

describe('DashboardFacade : changement de magasin', () => {
  let facade: DashboardFacade;
  let ctx: WarehouseContextService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'access');
    sessionStorage.setItem('refresh_token', 'refresh');
    sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({ id: 'u', username: 'gestion.test', role: 'MANAGER', roles: ['GESTIONNAIRE'], permissions: ['report:read'] })
    );
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    ctx = TestBed.inject(WarehouseContextService);
    ctx.select(PLATEAU);
    facade = TestBed.inject(DashboardFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('les chiffres du magasin précédent sont effacés dès le changement', async () => {
    facade.refresh();
    http.expectOne(`${API}/dashboard`).flush(dashboard(50000));
    expect((await firstValueFrom(facade.vm$)).kpis.todaySalesTotal).toBe(50000);

    ctx.select(COCODY);
    expect((await firstValueFrom(facade.vm$)).kpis.todaySalesTotal).toBe(0);
  });

  it('réponse tardive de l’ancien magasin : abandonnée, seule celle du nouveau s’affiche', async () => {
    facade.refresh();
    const stale = http.expectOne(`${API}/dashboard`);

    ctx.select(COCODY);
    facade.refresh();
    expect(stale.cancelled).toBe(true);
    http.expectOne(`${API}/dashboard`).flush(dashboard(12000));
    expect((await firstValueFrom(facade.vm$)).kpis.todaySalesTotal).toBe(12000);
  });
});
