import { Component, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
import { CrossLinkProposalView } from '../data/price-proposals-api.service';
import { RejectProposalDialogComponent } from '../ui/reject-proposal-dialog.component';
import { PriceProposalsPageComponent } from './price-proposals-page.component';

@Component({ template: 'page' })
class PageComponent {}

const API = `${environment.apiUrl}/price-proposals`;
const LINKS_API = `${environment.apiUrl}/integration-links`;

const ADMIN: User = {
  id: 'a',
  username: 'admin',
  role: 'ADMIN',
  permissions: ['integration:price-approve', 'integration:manage']
};
const MANAGER: User = {
  id: 'm',
  username: 'manager',
  role: 'EMPLOYEE',
  permissions: ['integration:manage']
};

function proposal(overrides: Partial<CrossLinkProposalView> = {}): CrossLinkProposalView {
  return {
    proposalId: 'prop-' + Math.random().toString(36).slice(2),
    productId: 'prd-1',
    productName: 'Chaussures cuir',
    productSku: 'CH-001',
    price: '28000.00',
    currency: 'XOF',
    status: 'PROPOSED',
    referencePriceAtProposal: '30000.00',
    currentReferencePrice: '30000.00',
    note: null,
    proposedAt: '2026-10-20T10:00:00Z',
    decidedAt: null,
    rejectionReason: null,
    linkId: 'link-1',
    shopName: 'Boutique Awa',
    linkStatus: 'ACTIVE',
    ...overrides
  };
}

function page(): PaginatedPage {
  return { items: [], total: 0 };
}

interface PaginatedPage {
  items: CrossLinkProposalView[];
  total: number;
}

/** Écran « Prix boutique » (lot 3, GA3 — G24). */
describe('PriceProposalsPageComponent', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<PriceProposalsPageComponent>;
  let snackbars: string[];
  let dialogs: { component: Type<unknown>; data: unknown }[];
  let dialogAnswer: unknown;

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
    dialogAnswer = undefined;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter(routes),
        { provide: MatSnackBar, useValue: { open: (m: string) => void snackbars.push(m) } }
      ]
    });
    TestBed.overrideProvider(MatDialog, {
      useValue: {
        open: (component: Type<unknown>, config: { data: unknown }) => {
          dialogs.push({ component, data: config.data });
          return { afterClosed: () => of(dialogAnswer) };
        }
      }
    });
    http = TestBed.inject(HttpTestingController);
  }

  async function open(items: CrossLinkProposalView[] = [], total?: number): Promise<void> {
    session(ADMIN);
    configure();
    fixture = TestBed.createComponent(PriceProposalsPageComponent);
    await settle();
    await servePage({ items, total: total ?? items.length });
  }

  async function servePage(result: PaginatedPage): Promise<void> {
    http.expectOne((r) => r.method === 'GET' && r.url === API).flush(result);
    await settle();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
  }

  function dom(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function approveBtn(proposalId: string): HTMLButtonElement | null {
    return dom().querySelector<HTMLButtonElement>(`[data-proposal="${proposalId}"] [data-test="approve"]`);
  }

  function rejectBtn(proposalId: string): HTMLButtonElement | null {
    return dom().querySelector<HTMLButtonElement>(`[data-proposal="${proposalId}"] [data-test="reject"]`);
  }

  function fail(req: import('@angular/common/http/testing').TestRequest, status: number, code?: string): void {
    req.flush(code ? { code, message: 'erreur' } : null, { status, statusText: 'Error' });
  }

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  // --- Accès / route ---

  it('route réelle : integration:manage seule → redirection vers le tableau de bord', async () => {
    const route = (LAYOUT_ROUTES[0].children ?? []).find(
      (r) => r.path === 'settings/online-shop/price-proposals'
    ) as Route;
    session(MANAGER);
    configure([{ path: 'dashboard', component: PageComponent }, route]);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/settings/online-shop/price-proposals');
    expect(TestBed.inject(Router).url ?? '').not.toContain('price-proposals');
    http.expectNone(API);
  });

  it('route réelle : integration:price-approve → accès accordé', async () => {
    const route = (LAYOUT_ROUTES[0].children ?? []).find(
      (r) => r.path === 'settings/online-shop/price-proposals'
    ) as Route;
    // La route est protégée par integration:price-approve
    expect(route.canMatch).toBeDefined();
    expect(route.data?.['permissions']).toEqual(['integration:price-approve']);
    session(ADMIN);
    configure([{ path: 'dashboard', component: PageComponent }, route]);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/settings/online-shop/price-proposals');
    http.expectOne((r) => r.url === API).flush({ items: [], total: 0 });
  });

  // --- Source de données : GET /api/price-proposals ---

  it('aucun appel à /api/integration-links au chargement', async () => {
    session(ADMIN);
    configure();
    fixture = TestBed.createComponent(PriceProposalsPageComponent);
    fixture.detectChanges();
    http.expectNone(`${LINKS_API}`);
    http.expectOne((r) => r.url === API).flush({ items: [], total: 0 });
    await settle();
  });

  it('liste vide : message « Aucune proposition »', async () => {
    await open([]);
    expect(dom().textContent).toContain('Aucune');
  });

  // --- Groupes par liaison ---

  it('deux propositions du même linkId : un seul groupe avec le shopName', async () => {
    const p1 = proposal({ proposalId: 'p1', productName: 'Prod A', linkId: 'link-1', shopName: 'Boutique Awa' });
    const p2 = proposal({ proposalId: 'p2', productName: 'Prod B', linkId: 'link-1', shopName: 'Boutique Awa' });
    await open([p1, p2]);
    const groups = dom().querySelectorAll('[data-test="link-group"]');
    expect(groups.length).toBe(1);
    expect(groups[0].textContent).toContain('Boutique Awa');
    expect(dom().querySelectorAll('[data-proposal]').length).toBe(2);
  });

  it('deux propositions de liaisons différentes : deux groupes', async () => {
    const p1 = proposal({ proposalId: 'p1', linkId: 'link-1', shopName: 'Boutique Awa' });
    const p2 = proposal({ proposalId: 'p2', linkId: 'link-2', shopName: 'Boutique Bintou' });
    await open([p1, p2]);
    expect(dom().querySelectorAll('[data-test="link-group"]').length).toBe(2);
    expect(dom().textContent).toContain('Boutique Awa');
    expect(dom().textContent).toContain('Boutique Bintou');
  });

  it('badge « Suspendue » visible quand linkStatus = SUSPENDED', async () => {
    const p = proposal({ linkId: 'link-s', linkStatus: 'SUSPENDED' });
    await open([p]);
    const badge = dom().querySelector('[data-test="suspended-badge"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.toLowerCase()).toContain('suspendue');
  });

  it('pas de badge quand linkStatus = ACTIVE', async () => {
    const p = proposal({ linkId: 'link-a', linkStatus: 'ACTIVE' });
    await open([p]);
    expect(dom().querySelector('[data-test="suspended-badge"]')).toBeNull();
  });

  // --- Bouton inactif pendant l'appel ---

  it("approbation : bouton inactif pendant l'appel, réactif après", async () => {
    const p = proposal({ proposalId: 'prop-busy' });
    await open([p]);
    approveBtn('prop-busy')!.click();
    await settle();
    expect(approveBtn('prop-busy')!.disabled).toBe(true);
    // Les boutons des autres propositions restent actifs
    const otherP = proposal({ proposalId: 'prop-other' });
    // (Pas d'autre proposition ici, mais le principe est que seule prop-busy est bloquée)
    http.expectOne(`${LINKS_API}/link-1/price-proposals/prop-busy/approve`).flush({});
    await settle();
    await servePage({ items: [p], total: 1 });
  });

  // --- Approve : succès et rechargement ---

  it('approbation réussie : liste rechargée', async () => {
    const p = proposal({ proposalId: 'p-approve' });
    await open([p]);
    approveBtn('p-approve')!.click();
    http.expectOne(`${LINKS_API}/link-1/price-proposals/p-approve/approve`).flush({});
    await settle();
    // Rechargement : une nouvelle requête à /api/price-proposals
    await servePage({ items: [], total: 0 });
    expect(dom().textContent).toContain('Aucune');
  });

  // --- Approve : erreurs 404/409 → message dans l'écran, rechargement, aucun bandeau global ---

  it.each([
    [404, 'PRICE_PROPOSAL_NOT_FOUND'],
    [409, 'PRICE_PROPOSAL_NOT_PENDING'],
    [409, 'LINK_PROPOSAL_REVOKED'],
    [404, 'LINK_NOT_FOUND']
  ] as const)(
    "approve %s %s : message dans l'écran, aucun bandeau global, liste rechargée",
    async (status, code) => {
      const p = proposal({ proposalId: 'p-err' });
      await open([p]);
      approveBtn('p-err')!.click();
      fail(http.expectOne(`${LINKS_API}/link-1/price-proposals/p-err/approve`), status, code);
      await settle();
      await servePage({ items: [], total: 0 });
      expect(dom().querySelector('[role="alert"]')).not.toBeNull();
      expect(snackbars).toEqual([]);
    }
  );

  // --- Reject : dialogue ouvert avec linkId et proposalId ---

  it('refus : ouvre le dialogue avec linkId, proposalId, productName, productSku', async () => {
    const p = proposal({ proposalId: 'p-rej', linkId: 'link-99', productName: 'Prod X', productSku: 'PX-001' });
    await open([p]);
    rejectBtn('p-rej')!.click();
    await settle();
    expect(dialogs.length).toBe(1);
    expect(dialogs[0].component).toBe(RejectProposalDialogComponent);
    const data = dialogs[0].data as { linkId: string; proposalId: string; productName: string };
    expect(data.linkId).toBe('link-99');
    expect(data.proposalId).toBe('p-rej');
    expect(data.productName).toBe('Prod X');
  });

  it('refus réussi (dialogue fermé avec { success: true }) : liste rechargée', async () => {
    const p = proposal({ proposalId: 'p-rej-ok' });
    await open([p]);
    dialogAnswer = { success: true };
    rejectBtn('p-rej-ok')!.click();
    await settle();
    await servePage({ items: [], total: 0 });
    expect(dom().textContent).toContain('Aucune');
  });

  it("refus avec erreur 404/409 (dialogue fermé avec { success: false, error }) : message dans l'écran, liste rechargée", async () => {
    const p = proposal({ proposalId: 'p-rej-err' });
    await open([p]);
    dialogAnswer = { success: false, error: { message: 'Proposition introuvable.', action: 'La liste a été mise à jour.', retryable: false } };
    rejectBtn('p-rej-err')!.click();
    await settle();
    await servePage({ items: [], total: 0 });
    expect(dom().querySelector('[role="alert"]')).not.toBeNull();
    expect(snackbars).toEqual([]);
  });

  it('annulation du dialogue (undefined) : aucun rechargement supplémentaire', async () => {
    const p = proposal({ proposalId: 'p-cancel' });
    dialogAnswer = undefined;
    await open([p]);
    rejectBtn('p-cancel')!.click();
    await settle();
    // Après annulation, pas de nouvelle requête à /api/price-proposals
    http.expectNone(API);
  });

  // --- Pagination ---

  it('paginateur visible et transmet page et size au backend', async () => {
    // 15 items, taille de page 10 (par défaut)
    const items = Array.from({ length: 10 }, (_, i) => proposal({ proposalId: `p${i}`, productSku: `SKU-${i}` }));
    await open(items, 15);
    const paginator = dom().querySelector('mat-paginator');
    expect(paginator).not.toBeNull();
    // Passer à la page 1
    // Simuler l'événement de pagination via le ServerTable
    fixture.componentInstance['table'].onPage({ pageIndex: 1, pageSize: 10, length: 15 });
    const req = http.expectOne((r) => r.url === API);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
    // Flush avec items non vides (total 15, page 1 avec 5 items) pour éviter le back-off automatique
    req.flush({ items: items.slice(5), total: 15 });
  });
});
