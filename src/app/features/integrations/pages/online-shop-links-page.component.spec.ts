import { Component, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Route, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { User } from '../../../auth/models/user.model';
import { apiErrorInterceptor } from '../../../core/interceptors/api-error.interceptor';
import { LAYOUT_ROUTES } from '../../../layout/layout.routes';
import { ConfirmDialogComponent } from '../../../shared/dialog/confirm-dialog.component';
import { ManagedLink } from '../data/link-management-api.service';
import { ReactivateLinkDialogComponent, ReactivateLinkDialogData } from '../ui/reactivate-link-dialog.component';
import { RevokeLinkDialogComponent } from '../ui/revoke-link-dialog.component';
import { OnlineShopLinksPageComponent } from './online-shop-links-page.component';

@Component({ template: 'page' })
class PageComponent {}

const API = `${environment.apiUrl}/integration-links`;
const WAREHOUSES = `${environment.apiUrl}/warehouses`;
const ADMIN: User = { id: 'a', username: 'admin', role: 'ADMIN', permissions: ['integration:manage', 'settings:manage'] };
const CAISSIER: User = { id: 'c', username: 'caisse1', role: 'EMPLOYEE', permissions: ['sale:create', 'settings:manage'] };

const PLATEAU = { id: 'w1', code: 'MAG1', name: 'Magasin Plateau', type: 'STORE', active: true };
const YOPOUGON = { id: 'w2', code: 'ENT1', name: 'Entrepôt Yopougon', type: 'WAREHOUSE', active: true };
const COCODY = { id: 'w3', code: 'MAG2', name: 'Magasin Cocody', type: 'STORE', active: true };

function link(id: string, overrides: Partial<ManagedLink>): ManagedLink {
  return {
    id,
    shopId: `shop-${id}`,
    shopName: `Boutique ${id}`,
    status: 'ACTIVE',
    suspensionReason: null,
    revocationReason: null,
    currency: 'XOF',
    scopes: ['catalog:read', 'stock:read'],
    warehouses: [PLATEAU],
    authorizedBy: 'awa.admin',
    createdAt: '2026-10-01T10:00:00Z',
    activatedAt: '2026-10-01T10:05:00Z',
    suspendedAt: null,
    revokedAt: null,
    ...overrides
  };
}

/** Ordre du serveur : du plus récent au plus ancien, tous statuts mêlés. */
const LINKS: ManagedLink[] = [
  link('rev-recent', {
    shopName: 'Boutique révoquée récente',
    status: 'REVOKED',
    revocationReason: 'GESTSTOCK_ADMIN',
    revokedAt: '2026-10-20T09:00:00Z',
    warehouses: []
  }),
  link('active', { shopName: 'Boutique Awa' }),
  link('old', {
    shopName: 'Ancienne boutique',
    status: 'REVOKED',
    revocationReason: 'SHOP_REQUEST',
    revokedAt: '2026-09-01T09:00:00Z',
    warehouses: []
  }),
  link('suspended', {
    shopName: 'Boutique Bintou',
    status: 'SUSPENDED',
    suspensionReason: 'AUTHORIZER_LOST_ACCESS',
    suspendedAt: '2026-10-15T08:00:00Z',
    warehouses: [PLATEAU, YOPOUGON]
  })
];

/** Écran « Paramètres → Boutique en ligne » (GA2 ; G10, G4a, v14-D10). */
describe('OnlineShopLinksPageComponent', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<OnlineShopLinksPageComponent>;
  let snackbars: string[];
  let dialogs: { component: Type<unknown>; data: unknown }[];
  /** Réponse de chaque dialogue, par composant. */
  let answers: Map<Type<unknown>, unknown>;

  function session(user: User): void {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'access');
    sessionStorage.setItem('refresh_token', 'refresh');
    sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
    sessionStorage.setItem('current_user', JSON.stringify(user));
  }

  function configure(routes: Route[] = []): void {
    snackbars = [];
    dialogs = [];
    answers = new Map();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter(routes),
        { provide: MatSnackBar, useValue: { open: (message: string) => void snackbars.push(message) } }
      ]
    });
    TestBed.overrideProvider(MatDialog, {
      useValue: {
        open: (component: Type<unknown>, config: { data: unknown }) => {
          dialogs.push({ component, data: config.data });
          return { afterClosed: () => of(answers.get(component)) };
        }
      }
    });
    http = TestBed.inject(HttpTestingController);
  }

  /** Écran ouvert par l'administrateur, liste servie. */
  async function open(links: unknown[] = LINKS): Promise<void> {
    session(ADMIN);
    configure();
    fixture = TestBed.createComponent(OnlineShopLinksPageComponent);
    await settle();
    await serveList(links);
  }

  async function serveList(links: unknown[] = LINKS): Promise<void> {
    http.expectOne((r) => r.method === 'GET' && r.url === API).flush(links);
    await settle();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  function page(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function card(id: string): HTMLElement {
    const found = page().querySelector<HTMLElement>(`[data-link="${id}"]`);
    if (!found) throw new Error(`liaison ${id} absente`);
    return found;
  }

  function action(id: string, name: 'suspend' | 'reactivate' | 'revoke'): HTMLButtonElement | null {
    return card(id).querySelector<HTMLButtonElement>(`[data-test="${name}"]`);
  }

  async function click(element: HTMLElement | null): Promise<void> {
    if (!element) throw new Error('élément absent');
    element.click();
    await settle();
  }

  function fail(call: TestRequest, status: number, code?: string): void {
    call.flush(code ? { code, message: 'message du serveur' } : null, { status, statusText: 'Erreur' });
  }

  afterEach(() => http.verify());

  // --- Accès -------------------------------------------------------------------------------------------

  it('route réelle : sans integration:manage, redirection vers le tableau de bord ; avec, l’écran', async () => {
    const route = (LAYOUT_ROUTES[0].children ?? []).find((r) => r.path === 'settings/online-shop') as Route;
    session(CAISSIER);
    configure([{ path: 'dashboard', component: PageComponent }, route]);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/settings/online-shop');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    http.expectNone(API);

    TestBed.resetTestingModule();
    session(ADMIN);
    configure([{ path: 'dashboard', component: PageComponent }, route]);
    const admin = await RouterTestingHarness.create();
    await admin.navigateByUrl('/settings/online-shop');
    expect(TestBed.inject(Router).url).toBe('/settings/online-shop');
    http.expectOne(API).flush([]);
  });

  // --- Liste -------------------------------------------------------------------------------------------

  it('actives et suspendues d’abord, révoquées dans l’historique replié', async () => {
    await open();
    const current = page().querySelector('[data-test="current"]')!;
    expect(Array.from(current.querySelectorAll('[data-link]')).map((e) => e.getAttribute('data-link'))).toEqual([
      'active',
      'suspended'
    ]);
    const history = page().querySelector<HTMLDetailsElement>('details[data-test="history"]')!;
    expect(history.open).toBe(false);
    expect(Array.from(history.querySelectorAll('[data-link]')).map((e) => e.getAttribute('data-link'))).toEqual([
      'rev-recent',
      'old'
    ]);
  });

  it('statut et motif en clair, dépôts, responsable, dates ; aucun code technique', async () => {
    await open();
    const suspended = card('suspended').textContent ?? '';
    expect(suspended).toContain('Suspendue');
    expect(suspended).toContain('La personne qui l’avait autorisée n’a plus les droits nécessaires');
    expect(suspended).toContain('Magasin Plateau');
    expect(suspended).toContain('Entrepôt Yopougon');
    expect(suspended).toContain('awa.admin');
    expect(suspended).toContain('15/10/2026');
    expect(card('active').textContent).toContain('Active');
    expect(card('old').textContent).toContain('Déconnectée depuis la boutique');
    expect(card('old').textContent).toContain('Révoquée');
    expect(page().textContent).not.toMatch(/AUTHORIZER_LOST_ACCESS|SHOP_REQUEST|GESTSTOCK_ADMIN|SUSPENDED|REVOKED/);
  });

  it('champ inattendu du serveur (empreinte) : jamais affiché', async () => {
    await open([{ ...link('active', {}), secretHash: 'f00dfeedcafe', pendingSecretHash: 'deadbeef42' }]);
    expect(page().textContent).not.toContain('f00dfeedcafe');
    expect(page().textContent).not.toContain('deadbeef42');
  });

  it('aucune liaison : comment lier une boutique', async () => {
    await open([]);
    expect(page().textContent).toContain('Depuis votre boutique JeCréeMaBoutique, choisissez Connecter GestStock');
  });

  it('nom de boutique contenant du HTML : affiché comme du texte', async () => {
    await open([link('active', { shopName: '<img src=x onerror="alert(1)"><b>Awa</b>' })]);
    expect(page().querySelector('img')).toBeNull();
    expect(page().querySelector('b')).toBeNull();
    expect(card('active').textContent).toContain('<img src=x onerror="alert(1)"><b>Awa</b>');
  });

  it('actions selon le statut : suspendre (active), réactiver (suspendue), aucune sur une révoquée', async () => {
    await open();
    expect(action('active', 'suspend')).not.toBeNull();
    expect(action('active', 'reactivate')).toBeNull();
    expect(action('suspended', 'reactivate')).not.toBeNull();
    expect(action('suspended', 'suspend')).toBeNull();
    expect(action('active', 'revoke')).not.toBeNull();
    expect(action('old', 'revoke')).toBeNull();
  });

  // --- Suspendre ----------------------------------------------------------------------------------------

  it('suspendre : confirmation expliquée, aucun appel sans elle ; puis appel et liste rafraîchie', async () => {
    await open();
    answers.set(ConfirmDialogComponent, false);
    await click(action('active', 'suspend'));
    expect(dialogs[0].component).toBe(ConfirmDialogComponent);
    expect((dialogs[0].data as { message: string }).message).toContain('cesse de se synchroniser');
    http.expectNone(`${API}/active/suspend`);

    answers.set(ConfirmDialogComponent, true);
    await click(action('active', 'suspend'));
    const call = http.expectOne(`${API}/active/suspend`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toBeNull();
    call.flush(link('active', { status: 'SUSPENDED', suspensionReason: 'MANUAL' }));
    await settle();
    await serveList([link('active', { status: 'SUSPENDED', suspensionReason: 'MANUAL', suspendedAt: '2026-10-30T10:00:00Z' })]);
    expect(card('active').textContent).toContain('Suspendue par un administrateur de votre entreprise');
  });

  // --- Réactiver ----------------------------------------------------------------------------------------

  it('réactiver : dépôts accessibles et dépôts actuels transmis au dialogue ; aucun appel sans reconfirmation', async () => {
    await open();
    answers.set(ReactivateLinkDialogComponent, undefined);
    await click(action('suspended', 'reactivate'));
    http.expectOne(WAREHOUSES).flush({ items: [PLATEAU, COCODY, { ...YOPOUGON, active: false }], total: 3 });
    await settle();
    const data = dialogs[0].data as ReactivateLinkDialogData;
    expect(dialogs[0].component).toBe(ReactivateLinkDialogComponent);
    expect(data.candidates.map((w) => w.id)).toEqual(['w1', 'w3']);
    expect(data.current.map((w) => w.id)).toEqual(['w1', 'w2']);
    http.expectNone(`${API}/suspended/reactivate`);
    expect(action('suspended', 'reactivate')!.disabled).toBe(false);
  });

  it('réactiver : corps exact (warehouseIds), puis liste rafraîchie', async () => {
    await open();
    answers.set(ReactivateLinkDialogComponent, ['w1', 'w3']);
    await click(action('suspended', 'reactivate'));
    http.expectOne(WAREHOUSES).flush({ items: [PLATEAU, COCODY], total: 2 });
    await settle();
    const call = http.expectOne(`${API}/suspended/reactivate`);
    expect(call.request.body).toEqual({ warehouseIds: ['w1', 'w3'] });
    call.flush(link('suspended', { status: 'ACTIVE' }));
    await settle();
    await serveList();
  });

  // --- Révoquer -----------------------------------------------------------------------------------------

  it('révoquer : confirmation renforcée obligatoire (dialogue dédié), aucun appel sans elle ; puis liste rafraîchie', async () => {
    await open();
    answers.set(RevokeLinkDialogComponent, false);
    await click(action('active', 'revoke'));
    expect(dialogs[0].component).toBe(RevokeLinkDialogComponent);
    expect(dialogs[0].data).toEqual({ shopName: 'Boutique Awa' });
    http.expectNone(`${API}/active/revoke`);

    answers.set(RevokeLinkDialogComponent, true);
    await click(action('active', 'revoke'));
    const call = http.expectOne(`${API}/active/revoke`);
    expect(call.request.body).toBeNull();
    call.flush(link('active', { status: 'REVOKED', revocationReason: 'GESTSTOCK_ADMIN' }));
    await settle();
    await serveList();
  });

  // --- Double envoi -------------------------------------------------------------------------------------

  it('pas de double envoi : une seule confirmation, un seul appel, actions inactives pendant la requête', async () => {
    await open();
    answers.set(ConfirmDialogComponent, true);
    answers.set(RevokeLinkDialogComponent, true);
    action('active', 'suspend')!.click();
    action('active', 'suspend')!.click();
    action('active', 'revoke')!.click();
    await settle();
    expect(dialogs.length).toBe(1);
    const call = http.expectOne(`${API}/active/suspend`);
    http.expectNone(`${API}/active/revoke`);
    for (const button of Array.from(page().querySelectorAll<HTMLButtonElement>('[data-test]')).filter((b) => b.tagName === 'BUTTON')) {
      expect(button.disabled).toBe(true);
    }
    call.flush(link('active', { status: 'SUSPENDED' }));
    await settle();
    await serveList();
  });

  // --- Erreurs ------------------------------------------------------------------------------------------

  it.each([
    ['suspend', 409, 'LINK_TRANSITION_INVALID', 'a changé'],
    ['suspend', 404, 'LINK_NOT_FOUND', 'introuvable'],
    ['revoke', 409, 'LINK_TRANSITION_INVALID', 'a changé'],
    ['revoke', 401, undefined, 'session a expiré']
  ] as const)('%s refusé (%s %s) : message dans l’écran, aucun bandeau global, liste rafraîchie', async (name, status, code, expected) => {
    await open();
    answers.set(ConfirmDialogComponent, true);
    answers.set(RevokeLinkDialogComponent, true);
    await click(action('active', name));
    fail(http.expectOne(`${API}/active/${name}`), status, code);
    await settle();
    await serveList();
    expect(page().querySelector('[role="alert"]')?.textContent).toContain(expected);
    expect(snackbars).toEqual([]);
  });

  it.each([
    [400, 'UNKNOWN_WAREHOUSE'],
    [403, 'WAREHOUSE_ACCESS_DENIED'],
    [403, 'WAREHOUSE_INACTIVE']
  ])('réactivation refusée (%s %s) : message sur les dépôts, aucun bandeau global', async (status, code) => {
    await open();
    answers.set(ReactivateLinkDialogComponent, ['w1']);
    await click(action('suspended', 'reactivate'));
    http.expectOne(WAREHOUSES).flush({ items: [PLATEAU], total: 1 });
    await settle();
    fail(http.expectOne(`${API}/suspended/reactivate`), status, code);
    await settle();
    await serveList();
    expect(page().querySelector('[role="alert"]')?.textContent).toContain('dépôt');
    expect(snackbars).toEqual([]);
    expect(action('suspended', 'reactivate')!.disabled).toBe(false);
  });

  it('liste illisible (403) : message dans l’écran, aucun bandeau global', async () => {
    session(ADMIN);
    configure();
    fixture = TestBed.createComponent(OnlineShopLinksPageComponent);
    await settle();
    fail(http.expectOne(API), 403);
    await settle();
    expect(page().querySelector('[role="alert"]')?.textContent).toContain('Seul un administrateur');
    expect(snackbars).toEqual([]);
  });

  it('dépôts accessibles illisibles : message, aucun dialogue, aucun bandeau global', async () => {
    await open();
    await click(action('suspended', 'reactivate'));
    fail(http.expectOne(WAREHOUSES), 500);
    await settle();
    expect(dialogs).toEqual([]);
    expect(page().querySelector('[role="alert"]')?.textContent).toContain('Réessayez');
    expect(snackbars).toEqual([]);
    expect(action('suspended', 'reactivate')!.disabled).toBe(false);
  });
});
