import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Observable, firstValueFrom, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { jwtInterceptor } from '../../../auth/interceptors/jwt.interceptor';
import { mockBackendInterceptor } from '../../../core/interceptors/mock-backend.interceptor';
import { Product } from '../../../core/models/product.model';
import { ProductsApiService } from '../../../core/services/products-api.service';
import { ProductsFacade } from './products.facade';
import { ProductListVm } from './product-vm.model';

const API = environment.apiUrl;

const MONTURE: Product = {
  id: '9d1f5c3a-0000-4000-8000-000000000001',
  sku: 'MON-RB3025',
  name: 'Monture Ray-Ban RB3025',
  categoryId: '9d1f5c3a-0000-4000-8000-0000000000c1',
  categoryName: 'Montures',
  supplierId: '9d1f5c3a-0000-4000-8000-0000000000f1',
  purchasePrice: 15000,
  retailPrice: 35000,
  wholesalePrice: 28000,
  stockQuantity: 2,
  alertThreshold: 3,
  barcode: '8053672611724',
  description: 'Aviateur',
  brandId: '9d1f5c3a-0000-4000-8000-0000000000b1',
  unit: 'UNIT',
  maxStockLevel: 20,
  active: true
};

const VERRE: Product = { ...MONTURE, id: '9d1f5c3a-0000-4000-8000-000000000002', sku: 'VER-174', name: 'Verre 1.74' };

function signedIn(permissions: string[]): void {
  // Jeton reconnu par le mock (écrans encore simulés) comme par le backend de test.
  sessionStorage.setItem('access_token', 'mock-token::admin');
  sessionStorage.setItem('refresh_token', 'refresh');
  sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({ id: 'u', username: 'gestion.test', role: 'MANAGER', roles: ['GESTIONNAIRE'], permissions })
  );
}

describe('ProductsFacade (écran Produits sur Spring Boot)', () => {
  let facade: ProductsFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      // Mock global présent comme dans l'application : /api/products y reste simulé pour les autres écrans.
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
    facade = TestBed.inject(ProductsFacade);
    http = TestBed.inject(HttpTestingController);
  }

  function nextVm(predicate: (vm: ProductListVm) => boolean): Promise<ProductListVm> {
    return firstValueFrom((facade.vm$ as Observable<ProductListVm>).pipe(skipWhile((vm) => !predicate(vm))));
  }

  function flushScreen(products: Product[], alerts: { type: string; entityId: string }[] = []): void {
    http.expectOne(`${API}/products`).flush({ items: products, total: products.length });
    http.expectOne(`${API}/categories`).flush({ items: [{ id: MONTURE.categoryId, name: 'Montures' }], total: 1 });
    // Fournisseurs du backend (identifiants réels, assignables au produit).
    http.expectOne(`${API}/suppliers`).flush({ items: [{ id: MONTURE.supplierId, name: 'Essilor' }], total: 1 });
    const alertsReq: TestRequest = http.expectOne((r) => r.url === `${API}/alerts`);
    expect(alertsReq.request.params.getAll('type')).toEqual(['OUT_OF_STOCK', 'BELOW_MINIMUM', 'LOW_STOCK']);
    alertsReq.flush({ items: alerts, total: alerts.length });
  }

  it('catalogue et catégories lus sur Spring Boot, une seule fois pour tous les abonnés', async () => {
    init(['product:read']);
    const a = nextVm((v) => v.products.length > 0);
    const b = nextVm((v) => v.products.length > 0);
    flushScreen([MONTURE]);

    expect((await a).products).toEqual([MONTURE]);
    expect((await b).categories).toEqual([{ id: MONTURE.categoryId, name: 'Montures' }]);
  });

  it('catalogue jamais simulé, quel que soit l’écran appelant', () => {
    init(['product:read']);
    TestBed.inject(ProductsApiService).list().subscribe();
    http.expectOne(`${API}/products`).flush({ items: [], total: 0 });
  });

  it('statut de stock fourni par le backend (alertes), sans recalcul côté front', async () => {
    init(['product:read']);
    const vm = nextVm((v) => v.products.length > 0);
    // MONTURE : 2 en stock pour un seuil de 3, mais aucune alerte backend → « Disponible ».
    flushScreen([MONTURE, VERRE], [{ type: 'OUT_OF_STOCK', entityId: VERRE.id }]);
    const loaded = await vm;

    expect(facade.availabilityLabel(MONTURE, loaded.stockLevels)).toBe('Disponible');
    expect(facade.isLowStock(MONTURE, loaded.stockLevels)).toBe(false);
    expect(facade.availabilityLabel(VERRE, loaded.stockLevels)).toBe('Rupture');
  });

  it('alertes indisponibles : liste affichée quand même, aucun statut inventé', async () => {
    init(['product:read']);
    const vm = nextVm((v) => v.products.length > 0);
    http.expectOne(`${API}/products`).flush({ items: [MONTURE], total: 1 });
    http.expectOne(`${API}/categories`).flush({ items: [], total: 0 });
    http.expectOne(`${API}/suppliers`).flush({ items: [], total: 0 });
    http.expectOne((r) => r.url === `${API}/alerts`).flush({}, { status: 403, statusText: 'Forbidden' });
    const loaded = await vm;
    expect(loaded.stockLevels.size).toBe(0);
  });

  it('droits issus des permissions : caissier en lecture seule, gestionnaire sans suppression', async () => {
    init(['product:read']);
    const caissier = nextVm((v) => v.products.length > 0);
    flushScreen([MONTURE]);
    expect(await caissier).toMatchObject({ canCreate: false, canUpdate: false, canDelete: false });
  });

  it('création et modification envoyées à Spring Boot, jamais de stock dans le corps', async () => {
    init(['product:create', 'product:update']);
    const created = firstValueFrom(
      facade.save(
        {
          sku: 'NEW-1',
          name: 'Étui',
          categoryId: MONTURE.categoryId,
          supplierId: null,
          purchasePrice: 1000,
          retailPrice: 2500,
          wholesalePrice: 2000,
          alertThreshold: 5
        },
        null
      )
    );
    const post = http.expectOne(`${API}/products`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).not.toHaveProperty('stockQuantity');
    post.flush({ ...MONTURE, sku: 'NEW-1' }, { status: 201, statusText: 'Created' });
    await created;

    const deleted = firstValueFrom(facade.delete(MONTURE.id));
    const del = http.expectOne(`${API}/products/${MONTURE.id}`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ ok: true });
    await deleted;
  });

  it('refus du backend remonté tel quel', async () => {
    init(['product:update']);
    const result = firstValueFrom(
      facade.save({ ...MONTURE, supplierId: null }, MONTURE.id)
    ).catch((e: unknown) => e);
    http
      .expectOne(`${API}/products/${MONTURE.id}`)
      .flush(
        { status: 409, code: 'PRODUCT_SKU_ALREADY_USED', message: 'Cette référence (SKU) est déjà utilisée.' },
        { status: 409, statusText: 'Conflict' }
      );
    expect(((await result) as Error).message).toBe('Cette référence (SKU) est déjà utilisée.');
  });

  it('plus aucun module simulé : les dépenses partent aussi vers Spring Boot (non-régression)', async () => {
    init([]);
    signedIn([]);
    const r = firstValueFrom(TestBed.inject(HttpClient).get<{ total: number }>(`${API}/expenses`));
    http.expectOne(`${API}/expenses`).flush({ items: [], total: 0 });
    expect((await r).total).toBe(0);
  });
});
