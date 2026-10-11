import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';
import { permissionGuard } from './permission.guard';

@Component({ template: 'page' })
class PageComponent {}

const ADMIN: User = { id: 'a', username: 'admin', role: 'ADMIN', permissions: ['user:manage', 'audit:read'] };
const CAISSIER: User = { id: 'c', username: 'caisse1', role: 'EMPLOYEE', permissions: ['sale:create'] };

function session(user: Partial<User> | null): void {
  if (!user) return;
  sessionStorage.setItem('access_token', 'access');
  sessionStorage.setItem('refresh_token', 'refresh');
  sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  sessionStorage.setItem('current_user', JSON.stringify(user));
}

/** Même structure que l'application : routes publiques, coquille authentifiée, route à permission. */
async function setup(user: Partial<User> | null): Promise<{ harness: RouterTestingHarness; router: Router }> {
  localStorage.clear();
  sessionStorage.clear();
  session(user);
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'login', component: PageComponent, canActivate: [guestGuard] },
        { path: 'forgot-password', component: PageComponent },
        {
          path: '',
          canActivate: [authGuard],
          children: [
            { path: 'dashboard', component: PageComponent },
            {
              path: 'users',
              component: PageComponent,
              canMatch: [permissionGuard],
              data: { permissions: ['user:manage'] }
            }
          ]
        }
      ])
    ]
  });
  const harness = await RouterTestingHarness.create();
  return { harness, router: TestBed.inject(Router) };
}

describe('Guards (authGuard, guestGuard, permissionGuard)', () => {
  it('route publique accessible sans session', async () => {
    const { harness, router } = await setup(null);
    await harness.navigateByUrl('/forgot-password');
    expect(router.url).toBe('/forgot-password');
  });

  it('écran de connexion accessible sans session', async () => {
    const { harness, router } = await setup(null);
    await harness.navigateByUrl('/login');
    expect(router.url).toBe('/login');
  });

  it('route authentifiée sans session : redirection vers /login', async () => {
    const { harness, router } = await setup(null);
    await harness.navigateByUrl('/dashboard');
    expect(router.url).toBe('/login');
  });

  it('déjà connecté : /login renvoie au tableau de bord', async () => {
    const { harness, router } = await setup(CAISSIER);
    await harness.navigateByUrl('/login');
    expect(router.url).toBe('/dashboard');
  });

  it('route à permission : accordée avec la permission', async () => {
    const { harness, router } = await setup(ADMIN);
    await harness.navigateByUrl('/users');
    expect(router.url).toBe('/users');
  });

  it('route à permission : refusée sans la permission, retour au tableau de bord (sans boucle)', async () => {
    const { harness, router } = await setup(CAISSIER);
    await harness.navigateByUrl('/users');
    expect(router.url).toBe('/dashboard');
  });

  it('route à permission sans session : redirection vers /login', async () => {
    const { harness, router } = await setup(null);
    await harness.navigateByUrl('/users');
    expect(router.url).toBe('/login');
  });

  it('permissions non chargées : GET /auth/me avant de décider', async () => {
    const { harness, router } = await setup({ id: 'a', username: 'admin', role: 'ADMIN' });
    const navigation = harness.navigateByUrl('/users');
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => http.expectOne(`${environment.apiUrl}/auth/me`).flush(ADMIN));
    await navigation;
    expect(router.url).toBe('/users');
    http.verify();
  });
});
