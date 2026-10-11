import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { jwtInterceptor } from './jwt.interceptor';

const API = environment.apiUrl;

describe('jwtInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  function session(access: string, refresh: string): void {
    sessionStorage.setItem('access_token', access);
    sessionStorage.setItem('refresh_token', refresh);
    sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  }

  it("ajoute le jeton d'accès aux appels protégés, jamais aux appels publics", () => {
    session('access-1', 'refresh-1');
    httpClient.get(`${API}/products`).subscribe();
    httpClient.post(`${API}/auth/logout`, { refreshToken: 'refresh-1' }).subscribe();

    expect(http.expectOne(`${API}/products`).request.headers.get('Authorization')).toBe('Bearer access-1');
    expect(http.expectOne(`${API}/auth/logout`).request.headers.has('Authorization')).toBe(false);
  });

  it('401 : un seul refresh pour des requêtes simultanées, puis rejeu avec le nouveau jeton', async () => {
    session('access-1', 'refresh-1');
    const a = firstValueFrom(httpClient.get(`${API}/products`));
    const b = firstValueFrom(httpClient.get(`${API}/sales`));
    http.expectOne(`${API}/products`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${API}/sales`).flush({}, { status: 401, statusText: 'Unauthorized' });

    http.expectOne(`${API}/auth/refresh`).flush({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      expiresIn: 900,
      user: { id: 'u', username: 'admin', role: 'ADMIN', permissions: [] }
    });

    const retries = http.match((r) => r.headers.get('Authorization') === 'Bearer access-2');
    expect(retries.map((r) => r.request.url).sort()).toEqual([`${API}/products`, `${API}/sales`]);
    retries.forEach((r) => r.flush({ items: [], total: 0 }));
    await expect(a).resolves.toEqual({ items: [], total: 0 });
    await expect(b).resolves.toEqual({ items: [], total: 0 });
  });

  it('401 puis refresh refusé : erreur propagée et session fermée', async () => {
    session('access-1', 'refresh-1');
    const call = firstValueFrom(httpClient.get(`${API}/products`)).catch((e: unknown) => e);
    http.expectOne(`${API}/products`).flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne(`${API}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });

    await call;
    expect(sessionStorage.getItem('access_token')).toBeNull();
  });

  it('401 sans jeton : pas de tentative de refresh', async () => {
    const call = firstValueFrom(httpClient.get(`${API}/products`)).catch((e: unknown) => e);
    http.expectOne(`${API}/products`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await call;
    http.expectNone(`${API}/auth/refresh`);
  });
});
