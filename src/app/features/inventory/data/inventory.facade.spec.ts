import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, skipWhile } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { jwtInterceptor } from '../../../auth/interceptors/jwt.interceptor';
import { mockBackendInterceptor } from '../../../core/interceptors/mock-backend.interceptor';
import { InventoryFacade } from './inventory.facade';

const API = environment.apiUrl;
const PRODUCT_ID = '6a1b2c3d-0000-4000-8000-000000000001';

function signedIn(permissions: string[]): void {
  sessionStorage.setItem('access_token', 'mock-token::admin');
  sessionStorage.setItem('refresh_token', 'refresh');
  sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({ id: 'u', username: 'gestion.test', role: 'MANAGER', roles: ['GESTIONNAIRE'], permissions })
  );
}

describe('InventoryFacade (inventaires sur Spring Boot)', () => {
  let facade: InventoryFacade;
  let http: HttpTestingController;

  function init(permissions: string[]): void {
    localStorage.clear();
    sessionStorage.clear();
    signedIn(permissions);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor, mockBackendInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    facade = TestBed.inject(InventoryFacade);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  it('catalogue actif du backend, une seule requête, droits issus des permissions', async () => {
    init(['inventory:create']);
    const vm = firstValueFrom(facade.vm$.pipe(skipWhile((v) => v.products.length === 0)));
    http.expectOne(`${API}/products`).flush({
      items: [
        { id: PRODUCT_ID, sku: 'MON-1', name: 'Monture', stockQuantity: 7, active: true },
        { id: 'inactif', sku: 'OLD', name: 'Ancien', stockQuantity: 0, active: false }
      ],
      total: 2
    });
    const loaded = await vm;
    expect(loaded.products.map((p) => p.id)).toEqual([PRODUCT_ID]);
    expect(loaded).toMatchObject({ canCreate: true, canValidate: false });
  });

  it('enregistrement : quantités comptées envoyées, écarts et statut fournis par le backend', async () => {
    init(['inventory:create', 'inventory:validate']);
    const saved = firstValueFrom(
      facade.createSession({ note: 'Fin de mois', lines: [{ productId: PRODUCT_ID, physicalQuantity: 5 }] })
    );
    const post = http.expectOne(`${API}/inventory/sessions`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ note: 'Fin de mois', lines: [{ productId: PRODUCT_ID, physicalQuantity: 5 }] });
    post.flush(
      {
        id: 'i1',
        number: 'INV-2026-000003',
        status: 'COMPLETED',
        itemsCount: 1,
        totalDifference: -2,
        lines: [{ productId: PRODUCT_ID, productSku: 'MON-1', productName: 'Monture', systemQuantity: 7, physicalQuantity: 5, difference: -2 }],
        createdAt: '2026-10-11T10:00:00Z',
        createdByUserId: 'u'
      },
      { status: 201, statusText: 'Created' }
    );
    const session = await saved;
    expect(session.status).toBe('COMPLETED');
    expect(session.lines[0].difference).toBe(-2);
  });
});
