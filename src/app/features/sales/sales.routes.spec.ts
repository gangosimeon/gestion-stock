import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Route } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { permissionGuard } from '../../auth/guards/permission.guard';
import { AuthService } from '../../auth/services/auth.service';
import { SalesApiService } from '../../core/services/sales-api.service';
import { SALES_ROUTES } from './sales.routes';

function landingFor(permissions: string[]): string {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: { hasPermission: (p: string) => permissions.includes(p) } }]
  });
  const redirect = SALES_ROUTES.find((r) => r.path === '')?.redirectTo as () => string;
  return TestBed.runInInjectionContext(() => redirect());
}

function route(path: string): Route | undefined {
  return SALES_ROUTES.find((r) => r.path === path);
}

describe('SALES_ROUTES (vendre ou consulter)', () => {
  it("avec sale:create : l'onglet Ventes ouvre la caisse de vente", () => {
    localStorage.removeItem('geststock.salesMode');
    expect(landingFor(['sale:create', 'sale:read'])).toBe('new');
  });

  it("dernier mode utilisé sur l'appareil : l'onglet rouvre la caisse rapide", () => {
    localStorage.setItem('geststock.salesMode', 'quick');
    try {
      expect(landingFor(['sale:create', 'sale:read'])).toBe('quick');
    } finally {
      localStorage.removeItem('geststock.salesMode');
    }
  });

  it('la caisse rapide exige sale:create', () => {
    expect(route('quick')?.canMatch).toContain(permissionGuard);
    expect(route('quick')?.data?.['permissions']).toEqual(['sale:create']);
  });

  it("avec seulement sale:read : l'onglet ouvre directement l'historique", () => {
    expect(landingFor(['sale:read'])).toBe('history');
  });

  it('la caisse exige sale:create, l’historique sale:read', () => {
    expect(route('new')?.canMatch).toContain(permissionGuard);
    expect(route('new')?.data?.['permissions']).toEqual(['sale:create']);
    expect(route('history')?.canMatch).toContain(permissionGuard);
    expect(route('history')?.data?.['permissions']).toEqual(['sale:read']);
  });
});

describe('SalesApiService (historique et annulation)', () => {
  const API = environment.apiUrl;
  let api: SalesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(SalesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('page filtrée : seuls les critères renseignés sont envoyés, jours convertis en instants', () => {
    api
      .salesPage(
        { q: 'VTE-2026', page: 1, size: 25, sort: ['total,desc'] },
        { status: 'CANCELLED', paymentMethod: null, from: '2026-10-01', to: '2026-10-15', allWarehouses: false }
      )
      .subscribe();
    const req = http.expectOne((r) => r.url === `${API}/sales`);
    const p = req.request.params;
    expect(p.get('q')).toBe('VTE-2026');
    expect(p.get('page')).toBe('1');
    expect(p.get('size')).toBe('25');
    expect(p.getAll('sort')).toEqual(['total,desc']);
    expect(p.get('status')).toBe('CANCELLED');
    expect(p.has('paymentMethod')).toBe(false);
    expect(p.has('allWarehouses')).toBe(false);
    // Jour de début à 00:00 et jour de fin à 23:59:59.999 (heure locale) : les deux jours inclus.
    expect(new Date(p.get('from')!).getDate()).toBe(1);
    expect(new Date(p.get('to')!).getHours()).toBe(23);
    req.flush({ items: [], total: 0 });
  });

  it('tous les dépôts : paramètre envoyé seulement quand la case est cochée', () => {
    api.salesPage({ page: 0, size: 10 }, { allWarehouses: true }).subscribe();
    const req = http.expectOne((r) => r.url === `${API}/sales`);
    expect(req.request.params.get('allWarehouses')).toBe('true');
    req.flush({ items: [], total: 0 });
  });

  it('retours : lecture des retours de la vente et création sans montant', () => {
    api.returnsForSale('s1').subscribe();
    http.expectOne(`${API}/sales/s1/returns`).flush([]);

    api
      .createReturn('s1', {
        settlement: 'REFUND',
        refundMethod: 'CASH',
        reason: 'Défaut',
        items: [{ productId: 'p1', quantity: 1, condition: 'DEFECTIVE' }]
      })
      .subscribe();
    const req = http.expectOne(`${API}/sales/s1/returns`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.items).toEqual([{ productId: 'p1', quantity: 1, condition: 'DEFECTIVE' }]);
    expect(JSON.stringify(req.request.body)).not.toContain('amount');
    req.flush({}, { status: 201, statusText: 'Created' });
  });

  it('détail : GET /sales/{id}', () => {
    api.get('s1').subscribe();
    http.expectOne(`${API}/sales/s1`).flush({ id: 's1', items: [] });
  });

  it('annulation : motif envoyé, refus du serveur remonté avec son message', async () => {
    const result = firstValueFrom(api.cancel('s1', 'Erreur de saisie')).catch((e: unknown) => e);
    const req = http.expectOne(`${API}/sales/s1/cancel`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'Erreur de saisie' });
    req.flush(
      { status: 409, code: 'SALE_CREDIT_ALREADY_SETTLED', message: 'Le crédit de cette vente a déjà été réglé.' },
      { status: 409, statusText: 'Conflict' }
    );
    expect(((await result) as Error).message).toBe('Le crédit de cette vente a déjà été réglé.');
  });
});
