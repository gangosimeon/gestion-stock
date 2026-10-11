import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { CategoriesApiService } from './categories-api.service';

const URL = `${environment.apiUrl}/categories`;

describe('CategoriesApiService', () => {
  let api: CategoriesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(CategoriesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it("l'écran de gestion liste aussi les catégories désactivées, triées par nom", () => {
    api.listAll().subscribe();
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('status')).toBe('ALL');
    expect(req.request.params.get('sort')).toBe('name,asc');
    req.flush({ items: [], total: 0 });
  });

  it('création, modification (PUT complet) et désactivation', () => {
    api.create({ name: 'Montures' }).subscribe();
    api.update('c1', { name: 'Montures optiques', description: 'Optique' }).subscribe();
    api.setActive('c1', false).subscribe();
    expect(http.expectOne({ method: 'POST', url: URL }).request.body).toEqual({ name: 'Montures' });
    expect(http.expectOne({ method: 'PUT', url: `${URL}/c1` }).request.body).toEqual({ name: 'Montures optiques', description: 'Optique' });
    expect(http.expectOne({ method: 'PATCH', url: `${URL}/c1/active` }).request.body).toEqual({ active: false });
  });
});
