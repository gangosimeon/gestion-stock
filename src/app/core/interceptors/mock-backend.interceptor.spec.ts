import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { jwtInterceptor } from '../../auth/interceptors/jwt.interceptor';
import { mockBackendInterceptor } from './mock-backend.interceptor';

const API = environment.apiUrl;

function b64url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Jeton au format du backend Spring Boot : sub = UUID, login et rôles en claims. */
function springJwt(username: string, roles: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  return [
    b64url({ alg: 'HS256', typ: 'JWT' }),
    b64url({ iss: 'geststock', sub: crypto.randomUUID(), iat: now, exp: now + 900, username, roles }),
    'signature'
  ].join('.');
}

describe('mockBackendInterceptor pendant la migration (Auth sur Spring Boot)', () => {
  let httpClient: HttpClient;
  let backend: HttpTestingController;

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
    httpClient = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  function signIn(token: string): void {
    sessionStorage.setItem('access_token', token);
    sessionStorage.setItem('refresh_token', 'refresh');
    sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  }

  it('les routes migrées (/api/auth, /api/users) partent vers Spring Boot, sans réponse simulée', () => {
    httpClient.post(`${API}/auth/login`, { username: 'admin', password: 'x' }).subscribe();
    httpClient.post(`${API}/auth/logout`, { refreshToken: 'r' }).subscribe();
    signIn(springJwt('admin', ['ADMIN']));
    httpClient.get(`${API}/auth/me`).subscribe();

    backend.expectOne(`${API}/auth/login`).flush({});
    backend.expectOne(`${API}/auth/logout`).flush(null, { status: 204, statusText: 'No Content' });
    backend.expectOne(`${API}/auth/me`).flush({});

    httpClient.get(`${API}/users`).subscribe();
    httpClient.put(`${API}/users/u1/password`, { password: 'x' }).subscribe();
    backend.expectOne(`${API}/users`).flush({ items: [], total: 0 });
    backend.expectOne(`${API}/users/u1/password`).flush(null, { status: 204, statusText: 'No Content' });
  });

  it('dépenses et rendez-vous (derniers modules migrés) partent vers Spring Boot, avec ou sans jeton', async () => {
    signIn(springJwt('caisse.spring', ['CAISSIER']));
    const expenses = firstValueFrom(httpClient.get<{ total: number }>(`${API}/expenses`));
    backend.expectOne(`${API}/expenses`).flush({ items: [], total: 0 });
    expect((await expenses).total).toBe(0);

    // Le refus vient du backend (permission expense:create), plus du mock.
    const denied = firstValueFrom(httpClient.post(`${API}/expenses`, { amount: 1000 })).catch((e: unknown) => e);
    backend.expectOne(`${API}/expenses`).flush({ code: 'ACCESS_DENIED' }, { status: 403, statusText: 'Forbidden' });
    expect(((await denied) as HttpErrorResponse).status).toBe(403);

    sessionStorage.clear();
    httpClient.patch(`${API}/appointments/a1/status`, { status: 'COMPLETED' }).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/appointments/a1/status`).flush({}, { status: 401, statusText: 'Unauthorized' });
  });
});
