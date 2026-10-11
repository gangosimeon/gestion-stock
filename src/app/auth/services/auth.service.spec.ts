import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/auth-response.model';
import { User } from '../models/user.model';
import { AuthService } from './auth.service';

const API = environment.apiUrl;

const ME: User = {
  id: '6f1c2c1e-0000-4000-8000-000000000001',
  username: 'caisse1',
  fullName: 'Awa Caisse',
  email: null,
  roles: ['CAISSIER'],
  role: 'EMPLOYEE',
  permissions: ['sale:create', 'cash:operate']
};

function authResponse(overrides: Partial<AuthResponse> = {}): AuthResponse {
  return {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresIn: 900,
    tokenType: 'Bearer',
    user: ME,
    ...overrides
  };
}

describe('AuthService (backend Spring Boot)', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  async function loggedIn(remember = false): Promise<void> {
    const done = firstValueFrom(auth.login('caisse1', 'secret', remember));
    http.expectOne(`${API}/auth/login`).flush(authResponse());
    await done;
  }

  it('connexion réussie : jetons et utilisateur stockés, permissions issues de la réponse', async () => {
    const done = firstValueFrom(auth.login('caisse1', 'secret'));
    const req = http.expectOne(`${API}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'caisse1', password: 'secret' });
    req.flush(authResponse());
    await done;

    // Pas d'appel /auth/me : la réponse de login contient déjà les permissions (schéma Me).
    http.expectNone(`${API}/auth/me`);
    expect(auth.accessToken).toBe('access-1');
    expect(auth.refreshTokenValue).toBe('refresh-1');
    expect(sessionStorage.getItem('access_token')).toBe('access-1');
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(auth.getCurrentUser()?.username).toBe('caisse1');
    expect(auth.permissionsLoaded()).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('« se souvenir de moi » : session en localStorage', async () => {
    await loggedIn(true);
    expect(localStorage.getItem('access_token')).toBe('access-1');
    expect(sessionStorage.getItem('access_token')).toBeNull();
  });

  it('connexion refusée : aucune session, message du backend affichable', async () => {
    const done = firstValueFrom(auth.login('caisse1', 'mauvais'));
    http.expectOne(`${API}/auth/login`).flush(
      { status: 401, code: 'INVALID_CREDENTIALS', message: 'Identifiant ou mot de passe incorrect.' },
      { status: 401, statusText: 'Unauthorized' }
    );
    const err = await done.catch((e: unknown) => e);

    expect(err).toBeInstanceOf(HttpErrorResponse);
    expect(auth.loginErrorMessage(err)).toBe('Identifiant ou mot de passe incorrect.');
    expect(auth.accessToken).toBeNull();
    expect(auth.getCurrentUser()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('connexion impossible (serveur injoignable) : message dédié', () => {
    const err = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });
    expect(auth.loginErrorMessage(err)).toBe('Impossible de joindre le serveur.');
  });

  it("chargement de l'utilisateur : /auth/me si les permissions manquent, une seule fois", async () => {
    const done = firstValueFrom(auth.login('caisse1', 'secret'));
    http.expectOne(`${API}/auth/login`).flush(authResponse({ user: { ...ME, permissions: undefined } }));
    const me = http.expectOne(`${API}/auth/me`);
    expect(me.request.method).toBe('GET');
    me.flush(ME);
    await done;

    expect(auth.getCurrentUser()?.permissions).toEqual(['sale:create', 'cash:operate']);
    // Données complètes en cache : aucun nouvel appel.
    const user = await firstValueFrom(auth.ensureCurrentUser());
    expect(user?.id).toBe(ME.id);
    http.expectNone(`${API}/auth/me`);
  });

  it('chargement des permissions au démarrage : session sans permissions en cache', async () => {
    sessionStorage.setItem('access_token', 'access-old');
    sessionStorage.setItem('refresh_token', 'refresh-old');
    sessionStorage.setItem('current_user', JSON.stringify({ ...ME, permissions: undefined }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);

    expect(auth.permissionsLoaded()).toBe(false);
    const first = firstValueFrom(auth.ensureCurrentUser());
    const second = firstValueFrom(auth.ensureCurrentUser());
    http.expectOne(`${API}/auth/me`).flush(ME);

    expect((await first)?.permissions).toContain('cash:operate');
    expect((await second)?.permissions).toContain('cash:operate');
    expect(JSON.parse(sessionStorage.getItem('current_user') ?? '{}').permissions).toEqual(ME.permissions);
  });

  it('hasPermission : permission présente et absente', async () => {
    expect(auth.hasPermission('sale:create')).toBe(false);
    await loggedIn();
    expect(auth.hasPermission('sale:create')).toBe(true);
    expect(auth.hasPermission('user:manage')).toBe(false);
    expect(auth.hasAnyPermission(['user:manage', 'cash:operate'])).toBe(true);
    expect(auth.hasAnyPermission(['user:manage', 'audit:read'])).toBe(false);
  });

  it('déconnexion réussie : révocation demandée au backend et session locale effacée', async () => {
    await loggedIn(true);
    const result = firstValueFrom(auth.logout());

    // Effacement immédiat, avant même la réponse du serveur.
    expect(auth.accessToken).toBeNull();
    expect(auth.getCurrentUser()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');

    const req = http.expectOne(`${API}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(await result).toBe(true);
  });

  it('déconnexion avec erreur réseau : session locale effacée, révocation non confirmée', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await loggedIn();
    const result = firstValueFrom(auth.logout());
    http.expectOne(`${API}/auth/logout`).error(new ProgressEvent('error'));

    expect(await result).toBe(false);
    expect(auth.accessToken).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('nettoyage local : aucune clé de session ne subsiste dans les deux stockages', async () => {
    await loggedIn(true);
    auth.endSession();
    for (const key of ['access_token', 'refresh_token', 'current_user', 'token_expiry', 'remember_me']) {
      expect(localStorage.getItem(key)).toBeNull();
      expect(sessionStorage.getItem(key)).toBeNull();
    }
    // Sans refresh token, la déconnexion ne prétend pas avoir révoqué quoi que ce soit.
    expect(await firstValueFrom(auth.logout())).toBe(false);
    http.expectNone(`${API}/auth/logout`);
  });

  it('nouvelle connexion : aucune trace de la session précédente dans l’autre stockage', async () => {
    await loggedIn(true);
    const done = firstValueFrom(auth.login('caisse1', 'secret', false));
    http.expectOne(`${API}/auth/login`).flush(authResponse({ accessToken: 'access-2' }));
    await done;
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(auth.accessToken).toBe('access-2');
  });

  it('jeton absent : non authentifié', () => {
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.isAccessTokenExpired()).toBe(true);
  });

  it("jeton d'accès expiré : session renouvelable tant qu'un refresh token existe", async () => {
    await loggedIn();
    sessionStorage.setItem('token_expiry', String(Date.now() - 1000));
    expect(auth.isAccessTokenExpired()).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
    sessionStorage.removeItem('refresh_token');
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('refresh : appels simultanés partagés (refresh token à usage unique)', async () => {
    await loggedIn();
    const a = firstValueFrom(auth.refreshToken());
    const b = firstValueFrom(auth.refreshToken());
    const req = http.expectOne(`${API}/auth/refresh`);
    expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
    req.flush(authResponse({ accessToken: 'access-2', refreshToken: 'refresh-2' }));

    expect((await a).accessToken).toBe('access-2');
    expect((await b).accessToken).toBe('access-2');
    expect(auth.refreshTokenValue).toBe('refresh-2');
  });

  it('session expirée : refresh refusé par le backend, session fermée et retour au login', async () => {
    await loggedIn();
    const result = firstValueFrom(auth.refreshToken()).catch((e: unknown) => e);
    http.expectOne(`${API}/auth/refresh`).flush(
      { status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Session expirée.' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(auth.accessToken).toBeNull();
    expect(auth.getCurrentUser()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('refresh en erreur réseau : la session reste ouverte', async () => {
    await loggedIn();
    const result = firstValueFrom(auth.refreshToken()).catch((e: unknown) => e);
    http.expectOne(`${API}/auth/refresh`).error(new ProgressEvent('error'));
    await result;
    expect(auth.accessToken).toBe('access-1');
  });
});
