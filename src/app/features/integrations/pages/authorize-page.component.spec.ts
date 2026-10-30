import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { authGuard } from '../../../auth/guards/auth.guard';
import { User } from '../../../auth/models/user.model';
import { apiErrorInterceptor } from '../../../core/interceptors/api-error.interceptor';
import { SHOP_REDIRECT } from '../data/consent';
import { AuthorizePageComponent } from './authorize-page.component';

@Component({ template: 'page' })
class PageComponent {}

const API = `${environment.apiUrl}/integration-links/authorization-requests`;
const PATH = '/integrations/jecreemaboutique/authorize';
const URI = 'urn:ietf:params:oauth:request_uri:Zx9-valeur-secrete-de-test';
const ADMIN: User = { id: 'a', username: 'admin', role: 'ADMIN', permissions: ['integration:manage'] };
const CAISSIER: User = { id: 'c', username: 'caisse1', role: 'EMPLOYEE', permissions: ['sale:create'] };
const SHOP_URL = 'https://www.jecreemaboutique.com/integrations/geststock/callback?code=c0de&state=st4te&iss=geststock';

function request(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    clientId: 'jcmb',
    clientName: 'JeCréeMaBoutique',
    shopId: 'shop-1',
    shopName: 'Boutique <b>Awa</b> & Co',
    scopes: ['catalog:read', 'stock:read', 'orders:write'],
    expiresAt: new Date(Date.now() + 9 * 60_000 + 30_000).toISOString(),
    currency: 'XOF',
    warehouses: [
      { id: 'w1', code: 'MAG1', name: 'Magasin Plateau', type: 'STORE', active: true },
      { id: 'w2', code: 'ENT1', name: 'Entrepôt Yopougon', type: 'WAREHOUSE', active: true },
      { id: 'w3', code: 'MAG2', name: 'Magasin Cocody', type: 'STORE', active: true }
    ],
    ...overrides
  };
}

/** Écran de consentement d'une liaison boutique (GA1 ; v14-D1 étapes 2 et 3, v14-D15). */
describe('AuthorizePageComponent', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let redirects: string[];
  let confirmations: unknown[];
  let confirmResult: boolean;
  let consoleCalls: unknown[][];
  /** Bandeaux de l'intercepteur global (installé comme dans l'application). */
  let snackbars: string[];

  async function open(user: User | null, url = `${PATH}?request_uri=${encodeURIComponent(URI)}`): Promise<void> {
    localStorage.clear();
    sessionStorage.clear();
    if (user) {
      sessionStorage.setItem('access_token', 'access');
      sessionStorage.setItem('refresh_token', 'refresh');
      sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
      sessionStorage.setItem('current_user', JSON.stringify(user));
    }
    redirects = [];
    confirmations = [];
    confirmResult = true;
    consoleCalls = [];
    snackbars = [];
    for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => void consoleCalls.push(args));
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: MatSnackBar, useValue: { open: (message: string) => void snackbars.push(message) } },
        provideRouter([
          { path: 'login', component: PageComponent },
          { path: 'dashboard', component: PageComponent },
          { path: 'integrations/jecreemaboutique/authorize', canActivate: [authGuard], component: AuthorizePageComponent }
        ]),
        { provide: SHOP_REDIRECT, useValue: (target: string) => void redirects.push(target) }
      ]
    });
    TestBed.overrideProvider(MatDialog, {
      useValue: {
        open: (_component: unknown, config: { data: unknown }) => {
          confirmations.push(config.data);
          return { afterClosed: () => of(confirmResult) };
        }
      }
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await settle();
  }

  /** Rendu, puis fin des promesses en cours (confirmation comprise), puis rendu. */
  async function settle(): Promise<void> {
    harness.detectChanges();
    await harness.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    harness.detectChanges();
  }

  /** Demande affichée : lookup attendu (corps vérifié), puis réponse. */
  async function lookup(body: Record<string, unknown> = request()): Promise<void> {
    const call = http.expectOne(`${API}/lookup`);
    expect(call.request.body).toEqual({ requestUri: URI });
    call.flush(body);
    await settle();
  }

  function page(): HTMLElement {
    return harness.routeNativeElement as HTMLElement;
  }

  function text(): string {
    return page().textContent ?? '';
  }

  function button(name: 'approve' | 'deny'): HTMLButtonElement {
    const found = page().querySelector<HTMLButtonElement>(`[data-test="${name}"]`);
    if (!found) throw new Error(`bouton ${name} absent`);
    return found;
  }

  function checkbox(id: string): HTMLInputElement {
    const found = page().querySelector<HTMLInputElement>(`[data-warehouse="${id}"] input[type="checkbox"]`);
    if (!found) throw new Error(`case du dépôt ${id} absente`);
    return found;
  }

  async function click(element: HTMLElement): Promise<void> {
    element.click();
    await settle();
  }

  function fail(call: TestRequest, status: number, code?: string): void {
    call.flush(code ? { code, message: 'message du serveur' } : null, { status, statusText: 'Erreur' });
  }

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  // --- Accès -------------------------------------------------------------------------------------------

  it('non connecté : /login avec l’URL de retour vers l’écran (request_uri compris), aucun appel', async () => {
    await open(null);
    const router = TestBed.inject(Router);
    const login = router.parseUrl(router.url);
    expect(login.root.children['primary']?.segments.map((s) => s.path)).toEqual(['login']);
    const returnUrl = login.queryParams['returnUrl'] as string;
    expect(returnUrl.startsWith(`${PATH}?`)).toBe(true);
    expect(router.parseUrl(returnUrl).queryParams).toEqual({ request_uri: URI });
    http.expectNone(`${API}/lookup`);
  });

  it('sans integration:manage : message clair, aucun appel (ni consultation, ni approbation)', async () => {
    await open(CAISSIER);
    expect(text()).toContain('Seul un administrateur peut autoriser une boutique');
    expect(page().querySelector('[data-test="approve"]')).toBeNull();
    http.expectNone(`${API}/lookup`);
    http.expectNone(`${API}/approve`);
  });

  // --- request_uri ---------------------------------------------------------------------------------------

  it('request_uri lu une fois, retiré de l’URL, envoyé seulement à la consultation, jamais affiché ni en console', async () => {
    await open(ADMIN);
    const router = TestBed.inject(Router);
    expect(router.url).toBe(PATH);
    await lookup();
    expect(text()).not.toContain(URI);
    expect(page().innerHTML).not.toContain('request_uri');
    expect(consoleCalls.map((args) => args.map(String).join(' ')).join('\n')).not.toContain('Zx9');
  });

  it('lien sans request_uri : « Recommencez depuis votre boutique », aucun appel', async () => {
    await open(ADMIN, PATH);
    expect(text()).toContain('Recommencez depuis votre boutique');
    http.expectNone(`${API}/lookup`);
  });

  it('Referrer-Policy no-referrer pendant l’écran, retiré ensuite', async () => {
    await open(ADMIN);
    await lookup();
    expect(document.head.querySelector('meta[name="referrer"]')?.getAttribute('content')).toBe('no-referrer');
    await harness.navigateByUrl('/dashboard');
    expect(document.head.querySelector('meta[name="referrer"]')).toBeNull();
  });

  // --- Affichage -----------------------------------------------------------------------------------------

  it('boutique, application, portées en clair, devise et temps restant', async () => {
    await open(ADMIN);
    await lookup();
    const content = text();
    expect(content).toContain('Boutique <b>Awa</b> & Co');
    expect(content).toContain('JeCréeMaBoutique');
    expect(content).toContain('XOF');
    expect(content).toMatch(/expire dans 9 min/);
    for (const scope of ['catalog:read', 'stock:read', 'orders:write']) {
      expect(content).not.toContain(scope);
    }
    expect(page().querySelectorAll('[data-test="scope"]').length).toBe(3);
  });

  it('nom contenant du HTML : affiché comme du texte', async () => {
    await open(ADMIN);
    await lookup(request({ shopName: '<img src=x onerror="alert(1)"><b>Awa</b>', clientName: '<i>App</i>' }));
    expect(page().querySelector('img')).toBeNull();
    expect(page().querySelector('b')).toBeNull();
    expect(page().querySelector('i')).toBeNull();
    expect(text()).toContain('<img src=x onerror="alert(1)"><b>Awa</b>');
  });

  it('magasins (STORE) cochés, entrepôts (WAREHOUSE) décochés avec un avertissement', async () => {
    await open(ADMIN);
    await lookup();
    expect(checkbox('w1').checked).toBe(true);
    expect(checkbox('w3').checked).toBe(true);
    expect(checkbox('w2').checked).toBe(false);
    expect(page().querySelector('[data-warehouse="w2"]')?.textContent).toContain(
      'À cocher seulement si vous expédiez depuis ce dépôt'
    );
  });

  it('aucun dépôt choisi : Autoriser inactif, et aucun appel même au clic', async () => {
    await open(ADMIN);
    await lookup();
    await click(checkbox('w1'));
    await click(checkbox('w3'));
    expect(button('approve').disabled).toBe(true);
    await fixtureApprove();
    expect(confirmations).toEqual([]);
    http.expectNone(`${API}/approve`);
  });

  // --- Actions -------------------------------------------------------------------------------------------

  it('aucune approbation sans clic ni sans confirmation ; après confirmation, dépôts choisis envoyés', async () => {
    await open(ADMIN);
    await lookup();
    http.expectNone(`${API}/approve`);
    http.expectNone(`${API}/deny`);

    confirmResult = false;
    await click(button('approve'));
    expect(confirmations.length).toBe(1);
    http.expectNone(`${API}/approve`);

    confirmResult = true;
    await click(checkbox('w2'));
    await click(button('approve'));
    const call = http.expectOne(`${API}/approve`);
    expect(call.request.body).toEqual({
      requestUri: URI,
      scopes: ['catalog:read', 'stock:read', 'orders:write'],
      warehouseIds: ['w1', 'w2', 'w3']
    });
    call.flush({ redirectUrl: SHOP_URL });
    await settle();
    expect(redirects).toEqual([SHOP_URL]);
  });

  it('refus : confirmation, puis navigation vers l’URL du serveur seulement', async () => {
    await open(ADMIN);
    await lookup();
    confirmResult = false;
    await click(button('deny'));
    http.expectNone(`${API}/deny`);
    confirmResult = true;
    await click(button('deny'));
    const call = http.expectOne(`${API}/deny`);
    expect(call.request.body).toEqual({ requestUri: URI });
    const denied = 'https://www.jecreemaboutique.com/integrations/geststock/callback?error=access_denied&state=st4te';
    call.flush({ redirectUrl: denied });
    await settle();
    expect(redirects).toEqual([denied]);
  });

  it.each(['approve', 'deny'] as const)(
    'confirmation annulée (%s) : l’écran quitte l’état occupé, boutons et dépôts de nouveau utilisables',
    async (action) => {
      await open(ADMIN);
      await lookup();
      confirmResult = false;
      await click(button(action));
      expect(confirmations.length).toBe(1);
      expect(button('approve').disabled).toBe(false);
      expect(button('deny').disabled).toBe(false);
      expect(checkbox('w2').disabled).toBe(false);
      http.expectNone(`${API}/${action}`);
      confirmResult = true;
      await click(button(action));
      expect(confirmations.length).toBe(2);
      http.expectOne(`${API}/${action}`).flush({ redirectUrl: SHOP_URL });
      await settle();
      expect(redirects).toEqual([SHOP_URL]);
    }
  );

  it('pas de double envoi : un seul appel, boutons inactifs pendant la requête', async () => {
    await open(ADMIN);
    await lookup();
    button('approve').click();
    button('approve').click();
    await settle();
    button('approve').click();
    button('deny').click();
    await settle();
    const call = http.expectOne(`${API}/approve`);
    http.expectNone(`${API}/deny`);
    expect(button('approve').disabled).toBe(true);
    expect(button('deny').disabled).toBe(true);
    expect(confirmations.length).toBe(1);
    call.flush({ redirectUrl: SHOP_URL });
    await settle();
    expect(redirects).toEqual([SHOP_URL]);
  });

  it.each(['http://shop.example/cb?code=1', 'javascript:alert(1)', '/dashboard', '//shop.example/cb'])(
    'URL de retour refusée (%s) : message d’erreur, aucune navigation',
    async (target) => {
      await open(ADMIN);
      await lookup();
      await click(button('approve'));
      http.expectOne(`${API}/approve`).flush({ redirectUrl: target });
      await settle();
      expect(redirects).toEqual([]);
      expect(text()).toContain('adresse de retour');
    }
  );

  // --- Erreurs -------------------------------------------------------------------------------------------

  it.each([
    [404, 'AUTHORIZATION_REQUEST_NOT_FOUND', 'Recommencez depuis votre boutique'],
    [410, 'AUTHORIZATION_REQUEST_EXPIRED', 'Recommencez depuis votre boutique'],
    [409, 'AUTHORIZATION_REQUEST_ALREADY_DECIDED', 'déjà été traitée'],
    [422, 'LINK_CURRENCY_UNSUPPORTED', 'devise'],
    [401, undefined, 'session a expiré']
  ])('consultation refusée (%s %s) : message, aucun bouton, aucune navigation', async (status, code, expected) => {
    await open(ADMIN);
    fail(http.expectOne(`${API}/lookup`), status, code);
    await settle();
    expect(text()).toContain(expected);
    expect(snackbars).toEqual([]);
    expect(page().querySelectorAll('[role="alert"]').length).toBe(1);
    expect(page().querySelector('[data-test="approve"]')).toBeNull();
    expect(redirects).toEqual([]);
    expect(TestBed.inject(Router).url).toBe(PATH);
  });

  it.each([
    [409, 'SHOP_ALREADY_LINKED', 'déjà liée'],
    [409, 'AUTHORIZATION_REQUEST_ALREADY_DECIDED', 'déjà été traitée'],
    [410, 'AUTHORIZATION_REQUEST_EXPIRED', 'Recommencez depuis votre boutique'],
    [403, 'WAREHOUSE_ACCESS_DENIED', 'dépôt'],
    [403, 'WAREHOUSE_INACTIVE', 'dépôt'],
    [400, 'UNKNOWN_WAREHOUSE', 'dépôt'],
    [401, undefined, 'session a expiré']
  ])('approbation refusée (%s %s) : message, aucune navigation', async (status, code, expected) => {
    await open(ADMIN);
    await lookup();
    await click(button('approve'));
    fail(http.expectOne(`${API}/approve`), status, code);
    await settle();
    expect(text()).toContain(expected);
    expect(snackbars).toEqual([]);
    expect(page().querySelectorAll('[role="alert"]').length).toBe(1);
    expect(redirects).toEqual([]);
    expect(TestBed.inject(Router).url).toBe(PATH);
  });

  it('dépôt refusé : la personne peut corriger son choix et réessayer', async () => {
    await open(ADMIN);
    await lookup();
    await click(button('approve'));
    fail(http.expectOne(`${API}/approve`), 403, 'WAREHOUSE_INACTIVE');
    await settle();
    await click(checkbox('w3'));
    expect(button('approve').disabled).toBe(false);
    await click(button('approve'));
    expect(http.expectOne(`${API}/approve`).request.body.warehouseIds).toEqual(['w1']);
  });

  it('demande expirée pendant l’affichage : boutons inactifs, recommencer depuis la boutique', async () => {
    await open(ADMIN);
    await lookup(request({ expiresAt: new Date(Date.now() - 1_000).toISOString() }));
    expect(text()).toContain('Recommencez depuis votre boutique');
    expect(page().querySelector('[data-test="approve"]')).toBeNull();
  });

  /** Appel direct (bouton inactif : un clic ne déclenche rien dans le navigateur). */
  async function fixtureApprove(): Promise<void> {
    await (harness.routeDebugElement?.componentInstance as AuthorizePageComponent).approve();
    await settle();
  }
});
