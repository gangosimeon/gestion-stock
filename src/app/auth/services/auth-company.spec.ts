import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { platformInterceptor } from '../../features/platform/data/platform.interceptor';
import { jwtInterceptor } from '../interceptors/jwt.interceptor';
import { AuthResponse } from '../models/auth-response.model';
import { AuthService } from './auth.service';

const API = environment.apiUrl;

const RESPONSE: AuthResponse = {
  accessToken: 'tenant-access',
  refreshToken: 'tenant-refresh',
  expiresIn: 900,
  user: {
    id: 'u1',
    username: 'admin',
    role: 'ADMIN',
    permissions: ['user:manage'],
    company: { code: 'quincaillerie-a', name: 'Quincaillerie A' }
  }
};

describe('Session multi-entreprises', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor, platformInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  async function login(): Promise<void> {
    const done = firstValueFrom(auth.login('admin', 'secret', false, ' Quincaillerie-A '));
    const req = http.expectOne(`${API}/auth/login`);
    expect(req.request.body).toEqual({ company: 'quincaillerie-a', username: 'admin', password: 'secret' });
    req.flush(RESPONSE);
    await done;
  }

  it('le code entreprise accompagne la connexion, le renouvellement et la déconnexion', async () => {
    await login();
    expect(auth.companyCode).toBe('quincaillerie-a');
    expect(auth.lastCompanyCode).toBe('quincaillerie-a');

    const refreshed = firstValueFrom(auth.refreshToken());
    const refresh = http.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.body).toEqual({ refreshToken: 'tenant-refresh', company: 'quincaillerie-a' });
    refresh.flush({ ...RESPONSE, refreshToken: 'tenant-refresh-2' });
    await refreshed;

    auth.logout();
    const logout = http.expectOne(`${API}/auth/logout`);
    expect(logout.request.body).toEqual({ refreshToken: 'tenant-refresh-2', company: 'quincaillerie-a' });
    logout.flush(null);
    expect(auth.companyCode).toBeNull();
    // Pré-remplissage conservé (pas un secret).
    expect(auth.lastCompanyCode).toBe('quincaillerie-a');
  });

  it('entreprise suspendue pendant la session : écran explicatif, session fermée', async () => {
    await login();
    const client = TestBed.inject(HttpClient);
    client.get(`${API}/products`).subscribe({ error: () => undefined });
    http
      .expectOne(`${API}/products`)
      .flush({ code: 'COMPANY_SUSPENDED', message: 'Suspendu' }, { status: 403, statusText: 'Forbidden' });
    expect(router.navigate).toHaveBeenCalledWith(['/company-suspended'], { queryParams: { company: 'quincaillerie-a' } });
    expect(auth.accessToken).toBeNull();
  });

  it('jeton d’entreprise et jeton Super Admin ne sont jamais mélangés', async () => {
    await login();
    sessionStorage.setItem('platform_access_token', 'platform-access');
    sessionStorage.setItem('platform_refresh_token', 'platform-refresh');
    const client = TestBed.inject(HttpClient);

    client.get(`${API}/products`).subscribe();
    expect(http.expectOne(`${API}/products`).request.headers.get('Authorization')).toBe('Bearer tenant-access');

    client.get(`${API}/platform/companies`).subscribe();
    expect(http.expectOne(`${API}/platform/companies`).request.headers.get('Authorization')).toBe('Bearer platform-access');

    // Écran de connexion : marque publique sans aucun jeton.
    client.get(`${API}/public/companies/quincaillerie-a/branding`).subscribe();
    expect(http.expectOne(`${API}/public/companies/quincaillerie-a/branding`).request.headers.has('Authorization')).toBe(false);
  });
});
