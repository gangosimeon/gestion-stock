import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';
import { WarehouseContextService } from '../services/warehouse-context.service';
import { warehouseInterceptor } from './warehouse.interceptor';

const API = environment.apiUrl;
const PRINCIPAL = { id: '3f0c8e1a-0000-4000-8000-000000000001', name: 'Magasin principal', main: true };
const SECONDAIRE = { id: '3f0c8e1a-0000-4000-8000-000000000002', name: 'Dépôt secondaire' };

describe('Magasin courant (X-Warehouse-Id) pendant la migration', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  let ctx: WarehouseContextService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        // Pas d'intercepteur mock ici : on observe seulement l'en-tête posé selon la destination.
        provideHttpClient(withInterceptors([warehouseInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    ctx = TestBed.inject(WarehouseContextService);
  });

  afterEach(() => http.verify());

  function header(url: string): string | null {
    httpClient.get(url).subscribe();
    const req = http.expectOne(url);
    req.flush({});
    return req.request.headers.get('X-Warehouse-Id');
  }

  it('sans choix : aucun en-tête (dépôt par défaut appliqué par le backend)', () => {
    expect(header(`${API}/auth/me`)).toBeNull();
    expect(header(`${API}/products`)).toBeNull();
    expect(header(`${API}/expenses`)).toBeNull();
  });

  it('choix du dépôt secondaire : son UUID réel sur toutes les routes', () => {
    ctx.select(SECONDAIRE);
    expect(header(`${API}/products`)).toBe(SECONDAIRE.id);
    expect(header(`${API}/alerts`)).toBe(SECONDAIRE.id);
    expect(header(`${API}/sales`)).toBe(SECONDAIRE.id);
    expect(header(`${API}/expenses`)).toBe(SECONDAIRE.id);
    expect(header(`${API}/appointments`)).toBe(SECONDAIRE.id);
    expect(header(`${API}/stock/movements`)).toBe(SECONDAIRE.id);
    expect(header(`${API}/inventory/sessions`)).toBe(SECONDAIRE.id);
  });

  it('choix conservé (rechargement de page) puis oublié s’il n’est plus visible', () => {
    ctx.select(SECONDAIRE);
    expect(JSON.parse(localStorage.getItem('current_warehouse') ?? '{}').id).toBe(SECONDAIRE.id);

    expect(ctx.keepIfVisible([PRINCIPAL, SECONDAIRE])).toBe(true);
    expect(ctx.warehouseId).toBe(SECONDAIRE.id);

    // Caissier rattaché au seul magasin principal : le choix précédent est oublié.
    expect(ctx.keepIfVisible([PRINCIPAL])).toBe(false);
    expect(ctx.warehouseId).toBeNull();
    expect(localStorage.getItem('current_warehouse')).toBeNull();
  });

  it('ancien identifiant simulé enregistré (wh_1) : ignoré et effacé', () => {
    localStorage.setItem('warehouse_id', 'wh_2');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    expect(TestBed.inject(WarehouseContextService).warehouseId).toBeNull();
    expect(localStorage.getItem('warehouse_id')).toBeNull();
  });

  it('choix enregistré dont l’identifiant n’est pas un UUID : ignoré, effacé, aucun en-tête envoyé', () => {
    localStorage.setItem('current_warehouse', JSON.stringify({ id: 'wh_1', name: 'Magasin principal' }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([warehouseInterceptor])), provideHttpClientTesting()]
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    expect(TestBed.inject(WarehouseContextService).warehouseId).toBeNull();
    expect(localStorage.getItem('current_warehouse')).toBeNull();
    expect(header(`${API}/products`)).toBeNull();
  });

  it('dépôt désactivé dans la liste : le choix est oublié', () => {
    ctx.select(SECONDAIRE);
    expect(ctx.keepIfVisible([PRINCIPAL, { ...SECONDAIRE, active: false }])).toBe(false);
    expect(ctx.warehouseId).toBeNull();
  });

  describe('refus du dépôt envoyé par le backend', () => {
    function fail(code: string, status: number): void {
      httpClient.get(`${API}/products`).subscribe({ error: () => undefined });
      http.expectOne(`${API}/products`).flush({ code }, { status, statusText: 'Refus' });
    }

    it.each([
      ['INVALID_WAREHOUSE_ID', 400],
      ['UNKNOWN_WAREHOUSE', 400],
      ['WAREHOUSE_INACTIVE', 403],
      ['WAREHOUSE_ACCESS_DENIED', 403]
    ])('%s : le choix enregistré est revalidé, jamais remplacé en silence', (code, status) => {
      const revalidated = vi.fn();
      ctx.revalidationRequested$.subscribe(revalidated);
      ctx.select(SECONDAIRE);

      fail(code, status);

      expect(revalidated).toHaveBeenCalledTimes(1);
      expect(ctx.warehouseId).toBe(SECONDAIRE.id);
    });

    it('autre erreur, ou requête sans dépôt choisi : aucune revalidation', () => {
      const revalidated = vi.fn();
      ctx.revalidationRequested$.subscribe(revalidated);

      fail('WAREHOUSE_INACTIVE', 403);
      ctx.select(SECONDAIRE);
      fail('STOCK_INSUFFICIENT', 422);

      expect(revalidated).not.toHaveBeenCalled();
    });
  });

  it('déconnexion puis nouvelle connexion : le magasin du précédent utilisateur est oublié', async () => {
    const auth = TestBed.inject(AuthService);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    ctx.select(SECONDAIRE);
    auth.endSession();
    expect(ctx.warehouseId).toBeNull();

    ctx.select(SECONDAIRE);
    const login = firstValueFrom(auth.login('caisse.test', 'x'));
    http.expectOne(`${API}/auth/login`).flush({
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 900,
      user: { id: 'c', username: 'caisse.test', role: 'EMPLOYEE', permissions: [] }
    });
    await login;
    expect(ctx.warehouseId).toBeNull();
  });

  it('renouvellement de jeton : le magasin choisi est conservé', async () => {
    const auth = TestBed.inject(AuthService);
    sessionStorage.setItem('access_token', 'a');
    sessionStorage.setItem('refresh_token', 'r');
    ctx.select(SECONDAIRE);
    const refreshed = firstValueFrom(auth.refreshToken());
    http.expectOne(`${API}/auth/refresh`).flush({
      accessToken: 'a2',
      refreshToken: 'r2',
      expiresIn: 900,
      user: { id: 'g', username: 'gestion.test', role: 'MANAGER', permissions: [] }
    });
    await refreshed;
    expect(ctx.warehouseId).toBe(SECONDAIRE.id);
  });
});
