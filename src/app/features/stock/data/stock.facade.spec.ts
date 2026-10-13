import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Observable, firstValueFrom, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { jwtInterceptor } from '../../../auth/interceptors/jwt.interceptor';
import { mockBackendInterceptor } from '../../../core/interceptors/mock-backend.interceptor';
import { StockMovement } from '../../../core/models/stock-movement.model';
import { StockFacade } from './stock.facade';
import { StockVm } from './stock-vm.model';

const API = environment.apiUrl;
const PRODUCT_ID = '9d1f5c3a-0000-4000-8000-000000000001';

const RECEPTION: StockMovement = {
  id: 'a1',
  productId: PRODUCT_ID,
  productSku: 'MON-RB3025',
  productName: 'Monture Ray-Ban RB3025',
  quantity: 5,
  reason: 'SUPPLY',
  type: 'RECEIPT',
  balanceAfter: 12,
  sourceReference: 'BR-2026-0004',
  createdAt: '2026-10-10T09:00:00Z',
  createdByUserId: 'u1',
  createdByUsername: 'gestion.test'
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

describe('StockFacade (API Spring Boot /api/stock)', () => {
  let facade: StockFacade;
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
    facade = TestBed.inject(StockFacade);
    http = TestBed.inject(HttpTestingController);
  }

  function nextVm(predicate: (vm: StockVm) => boolean): Promise<StockVm> {
    return firstValueFrom((facade.vm$ as Observable<StockVm>).pipe(skipWhile((vm) => !predicate(vm))));
  }

  it('historique paginé côté serveur ; nom, référence et solde fournis par le backend', async () => {
    init(['stock:read', 'stock:adjust']);
    const page = firstValueFrom(
      facade.search({ q: 'ray', page: 1, size: 25, sort: ['quantity,desc'] }, { from: null, to: null, productId: null, types: ['RECEIPT', 'SALE'] })
    );
    const req = http.expectOne((r) => r.url === `${API}/stock/movements`);
    expect(req.request.params.get('q')).toBe('ray');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.getAll('type')).toEqual(['RECEIPT', 'SALE']);
    expect(req.request.params.getAll('sort')).toEqual(['quantity,desc']);
    expect(req.request.params.has('from')).toBe(false);
    req.flush({ items: [RECEPTION], total: 26 });

    const loaded = await page;
    expect(loaded.total).toBe(26);
    expect(loaded.items[0]).toMatchObject({
      productName: 'Monture Ray-Ban RB3025',
      sku: 'MON-RB3025',
      balanceAfter: 12,
      uiType: 'IN'
    });

    const vm = nextVm((v) => v.products.length > 0);
    http.expectOne(`${API}/products`).flush({ items: [{ id: PRODUCT_ID, sku: 'MON-RB3025', name: 'Monture' }], total: 1 });
    expect((await vm).canAdjust).toBe(true);
  });

  it('filtre « Au » : toute la journée choisie est incluse', async () => {
    init(['stock:read']);
    const page = firstValueFrom(
      facade.search({ page: 0, size: 10 }, { from: new Date(2026, 9, 1), to: new Date(2026, 9, 10), productId: PRODUCT_ID })
    );
    const req = http.expectOne((r) => r.url === `${API}/stock/movements`);
    expect(new Date(req.request.params.get('from') ?? '').getTime()).toBe(new Date(2026, 9, 1).getTime());
    expect(new Date(req.request.params.get('to') ?? '').getTime()).toBe(new Date(2026, 9, 10, 23, 59, 59, 999).getTime());
    expect(req.request.params.get('productId')).toBe(PRODUCT_ID);
    expect(req.request.params.has('type')).toBe(false);
    req.flush({ items: [], total: 0 });
    await page;
  });

  it('caissier (stock:read seul) : lecture seule', async () => {
    init(['stock:read']);
    const vm = nextVm((v) => !v.isLoading);
    http.expectOne(`${API}/products`).flush({ items: [], total: 0 });
    expect((await vm).canAdjust).toBe(false);
  });

  it('mouvement manuel envoyé au backend ; stock insuffisant remonté tel quel', async () => {
    init(['stock:adjust']);
    const result = firstValueFrom(
      facade.createMovement({ productId: PRODUCT_ID, quantity: -50, reason: 'LOSS', note: 'Casse' })
    ).catch((e: unknown) => e);
    const post = http.expectOne(`${API}/stock/movements`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ productId: PRODUCT_ID, quantity: -50, reason: 'LOSS', note: 'Casse' });
    post.flush(
      { status: 409, code: 'INSUFFICIENT_STOCK', message: 'Stock insuffisant : 12 disponible(s), 50 demandé(s).' },
      { status: 409, statusText: 'Conflict' }
    );
    expect(((await result) as Error).message).toBe('Stock insuffisant : 12 disponible(s), 50 demandé(s).');
  });
});
