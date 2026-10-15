import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { WarehouseContextService } from '../../../core/services/warehouse-context.service';
import { WarehousesListPageComponent } from './warehouses-list-page.component';

const API = environment.apiUrl;
const COCODY = { id: '3f0c8e1a-0000-4000-8000-000000000002', name: 'Magasin Cocody', code: 'MAG-02', type: 'STORE', active: true };

describe('WarehousesListPageComponent (administration des dépôts)', () => {
  let http: HttpTestingController;
  let dialogResult: unknown;

  function setup() {
    sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('access_token', 'a');
    sessionStorage.setItem('refresh_token', 'r');
    sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({
        id: 'u', username: 'admin', role: 'ADMIN', roles: ['ADMIN'],
        permissions: ['warehouse:read', 'warehouse:manage', 'warehouse:all']
      })
    );
    TestBed.configureTestingModule({
      imports: [WarehousesListPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(dialogResult) }) } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(WarehousesListPageComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${API}/warehouses`).flush({ items: [COCODY], total: 1 });
    const revalidated = vi.fn();
    TestBed.inject(WarehouseContextService).revalidationRequested$.subscribe(revalidated);
    return { page: fixture.componentInstance, revalidated };
  }

  /** Après une opération : la liste est relue et le sélecteur de l'en-tête revalidé, sans rechargement. */
  function expectRefreshed(revalidated: ReturnType<typeof vi.fn>): void {
    http.expectOne((r) => r.url === `${API}/warehouses`).flush({ items: [COCODY], total: 1 });
    expect(revalidated).toHaveBeenCalledTimes(1);
  }

  afterEach(() => http.verify());

  it('modification : le panneau s’ouvre sur le dépôt ; une fois enregistré, liste et sélecteur rafraîchis', () => {
    const { page, revalidated } = setup();

    page.edit(COCODY as never);
    expect(page.drawerCtx?.warehouse).toEqual(COCODY);

    page.onSaved({ ...COCODY, name: 'Cocody Angré' } as never);
    expectRefreshed(revalidated);
  });

  it('détail : fenêtre en lecture seule ; « Modifier » y ouvre le panneau de modification', async () => {
    const { page } = setup();

    dialogResult = undefined;
    await page.openDetails(COCODY as never);
    expect(page.drawerCtx).toBeNull();

    dialogResult = 'edit';
    await page.openDetails(COCODY as never);
    expect(page.drawerCtx?.warehouse).toEqual(COCODY);
  });

  it('désactivation confirmée, puis réactivation sans confirmation', async () => {
    const { page, revalidated } = setup();
    dialogResult = true;

    await page.toggleActive(COCODY as never);
    const off = http.expectOne(`${API}/warehouses/${COCODY.id}/active`);
    expect(off.request.body).toEqual({ active: false });
    off.flush({ ...COCODY, active: false });
    expectRefreshed(revalidated);

    dialogResult = undefined;
    await page.toggleActive({ ...COCODY, active: false } as never);
    const on = http.expectOne(`${API}/warehouses/${COCODY.id}/active`);
    expect(on.request.body).toEqual({ active: true });
    on.flush(COCODY);
    http.expectOne((r) => r.url === `${API}/warehouses`).flush({ items: [COCODY], total: 1 });
    expect(revalidated).toHaveBeenCalledTimes(2);
  });

  it('désactivation annulée : rien n’est envoyé', async () => {
    const { page } = setup();
    dialogResult = false;

    await page.toggleActive(COCODY as never);

    http.expectNone(`${API}/warehouses/${COCODY.id}/active`);
  });

  it('dépôt principal : désignation confirmée', async () => {
    const { page, revalidated } = setup();
    dialogResult = true;

    await page.makeMain(COCODY as never);

    const req = http.expectOne(`${API}/warehouses/${COCODY.id}/main`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...COCODY, main: true });
    expectRefreshed(revalidated);
  });

  it('création : « Nouveau dépôt » ouvre le panneau ; une fois enregistré, liste et sélecteur rafraîchis', () => {
    const { page, revalidated } = setup();

    page.openCreate();
    expect(page.drawerCtx).toEqual({ warehouse: null });

    page.onSaved({ ...COCODY, id: 'n', name: 'Entrepôt Yopougon', code: 'DEP-01' } as never);
    expectRefreshed(revalidated);
  });
});
