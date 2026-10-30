import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSidenav } from '@angular/material/sidenav';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { environment } from '../../environments/environment';
import { permissionGuard } from '../auth/guards/permission.guard';
import { AuthService } from '../auth/services/auth.service';
import { WarehouseContextService } from '../core/services/warehouse-context.service';

import { LayoutShellComponent } from './layout-shell.component';
import { LAYOUT_ROUTES } from './layout.routes';

/** Cible de navigation des liens du menu (routes réelles hors du périmètre du test). */
@Component({ standalone: true, template: '' })
class BlankPage {}

/** Taille d'écran simulée (jsdom n'a pas de media queries). */
class FakeBreakpoints {
  readonly state = new BehaviorSubject<BreakpointState>({ matches: false, breakpoints: {} });
  observe() {
    return this.state.asObservable();
  }
}

function setup(mobile: boolean, permissions: string[]) {
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem('access_token', 'a');
  sessionStorage.setItem('refresh_token', 'r');
  sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
  sessionStorage.setItem(
    'current_user',
    JSON.stringify({ id: 'u', username: 'caisse.test', role: 'EMPLOYEE', roles: ['CAISSIER'], permissions })
  );
  const breakpoints = new FakeBreakpoints();
  breakpoints.state.next({ matches: mobile, breakpoints: {} });
  TestBed.configureTestingModule({
    imports: [LayoutShellComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{ path: '**', component: BlankPage }]),
      provideNoopAnimations(),
      { provide: BreakpointObserver, useValue: breakpoints }
    ]
  });
  const fixture = TestBed.createComponent(LayoutShellComponent);
  fixture.detectChanges();
  const sidenav = fixture.debugElement.query(By.directive(MatSidenav)).injector.get(MatSidenav);
  const navLabels = () =>
    fixture.debugElement.queryAll(By.css('.nav-item__label')).map((e) => (e.nativeElement as HTMLElement).textContent?.trim());
  return { fixture, sidenav, navLabels, component: fixture.componentInstance };
}

describe('LayoutShellComponent (barre latérale responsive)', () => {
  it('petit écran : menu superposé fermé, ouvert par le hamburger, refermé après navigation', async () => {
    const { fixture, sidenav, component } = setup(true, ['sale:create']);
    expect(sidenav.mode).toBe('over');
    expect(sidenav.opened).toBe(false);

    (fixture.debugElement.query(By.css('.shell-header__toggle')).nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(sidenav.opened).toBe(true);
    // Repli « icônes seules » sans objet en menu superposé : ni classe ni bouton de repli.
    expect(fixture.debugElement.query(By.css('.sidebar-collapsed'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.collapse-btn'))).toBeNull();

    (fixture.debugElement.query(By.css('.nav-item')).nativeElement as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.mobileMenuOpen).toBe(false);
    expect(sidenav.opened).toBe(false);
  });

  it('le menu ne montre que les entrées autorisées (mêmes permissions que les routes)', () => {
    const { fixture, navLabels } = setup(true, ['sale:read', 'sale:create', 'appointment:read', 'cash:operate']);
    (fixture.debugElement.query(By.css('.shell-header__toggle')).nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(navLabels()).toEqual(['Dashboard', 'Ventes', 'Caisse', 'RDV']);
  });

  it('« Devis » : proposé avec quote:read, masqué pour un caissier', () => {
    expect(setup(false, ['quote:read', 'quote:manage']).navLabels()).toEqual(['Dashboard', 'Devis']);
  });

  it('« Paramètres » (configuration de la facture) : proposé avec settings:manage', () => {
    expect(setup(false, ['settings:manage']).navLabels()).toEqual(['Dashboard', 'Paramètres']);
  });

  it('« Paramètres » : masqué sans settings:manage, même pour un gestionnaire des ventes et des comptes', () => {
    expect(setup(false, ['sale:read', 'sale:create', 'user:manage']).navLabels()).not.toContain('Paramètres');
  });

  it('« Boutique en ligne » (liaisons boutique, GA2) : proposée avec integration:manage', () => {
    expect(setup(false, ['integration:manage']).navLabels()).toEqual(['Dashboard', 'Boutique en ligne']);
  });

  it('« Boutique en ligne » : masquée sans integration:manage, même avec settings:manage', () => {
    expect(setup(false, ['settings:manage', 'user:manage', 'company:manage']).navLabels()).not.toContain('Boutique en ligne');
  });

  it('« Boutique en ligne » : route /settings/online-shop protégée par integration:manage', () => {
    const route = (LAYOUT_ROUTES[0].children ?? []).find((r) => r.path === 'settings/online-shop');
    expect(route?.canMatch).toContain(permissionGuard);
    expect(route?.data?.['permissions']).toEqual(['integration:manage']);
  });

  it('sans permission : seul le tableau de bord est proposé (plus de « Accès refusé » au clic)', () => {
    const { navLabels } = setup(false, []);
    expect(navLabels()).toEqual(['Dashboard']);
  });

  it('chaque entrée du menu exige exactement les permissions de sa route', () => {
    const { component } = setup(false, []);
    const shell = LAYOUT_ROUTES[0].children ?? [];
    for (const item of component.navItems) {
      const route = shell.find((r) => `/${r.path}` === item.route);
      expect(route, item.route).toBeDefined();
      expect(route?.data?.['permissions'] ?? [], item.route).toEqual(item.permissions);
      if (item.permissions.length > 0) expect(route?.canMatch, item.route).toContain(permissionGuard);
    }
  });

  it('grand écran : barre fixe ouverte ; le hamburger la replie en icônes (comportement inchangé)', () => {
    const { fixture, sidenav, component } = setup(false, []);
    expect(sidenav.mode).toBe('side');
    expect(sidenav.opened).toBe(true);
    (fixture.debugElement.query(By.css('.shell-header__toggle')).nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.collapsed).toBe(true);
    expect(sidenav.opened).toBe(true);
    expect(fixture.debugElement.query(By.css('.sidebar-collapsed'))).not.toBeNull();
  });

  it("initiales de l'avatar", () => {
    const { component } = setup(false, []);
    expect(component.initials('caisse.test')).toBe('CT');
    expect(component.initials('admin')).toBe('AD');
    expect(component.initials('')).toBe('?');
  });

  it('grand écran : la flèche du bas replie puis déplie la barre (comportement inchangé)', () => {
    const { fixture, component } = setup(false, []);
    const arrow = () => fixture.debugElement.query(By.css('.collapse-btn')).nativeElement as HTMLButtonElement;
    arrow().click();
    fixture.detectChanges();
    expect(component.collapsed).toBe(true);
    // Barre repliée : libellés masqués, icônes conservées.
    expect(fixture.debugElement.queryAll(By.css('.nav-item__label')).length).toBe(0);
    expect(fixture.debugElement.queryAll(By.css('.nav-item__icon')).length).toBeGreaterThan(0);
    arrow().click();
    fixture.detectChanges();
    expect(component.collapsed).toBe(false);
  });

  it('menu utilisateur : ouverture, fermeture sur le fond, déconnexion', () => {
    const { fixture } = setup(false, []);
    const auth = TestBed.inject(AuthService);
    const logout = vi.spyOn(auth, 'logout').mockReturnValue(of(true));
    const trigger = fixture.debugElement.query(By.css('.user-menu__trigger')).nativeElement as HTMLButtonElement;
    expect(trigger.textContent).toContain('CT');

    trigger.click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.user-dropdown'))).not.toBeNull();
    (fixture.debugElement.query(By.css('.user-dropdown-overlay')).nativeElement as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.user-dropdown'))).toBeNull();

    trigger.click();
    fixture.detectChanges();
    (fixture.debugElement.query(By.css('.user-dropdown__item--danger')).nativeElement as HTMLButtonElement).click();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('sélecteur de magasin : dépôts du backend affichés, choix transmis au contexte', () => {
    const { fixture, component } = setup(false, []);
    const http = TestBed.inject(HttpTestingController);
    const ctx = TestBed.inject(WarehouseContextService);
    const select = vi.spyOn(ctx, 'select');
    const warehouses = [
      { id: 'w1', name: 'Magasin principal' },
      { id: 'w2', name: 'Dépôt secondaire' }
    ];
    http.expectOne(`${environment.apiUrl}/warehouses`).flush({ items: warehouses, total: 2 });
    http.match(`${environment.apiUrl}/warehouses/current`).forEach((r) => r.flush(warehouses[0]));
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.shell-header__warehouse'))).not.toBeNull();

    component.setWarehouse('w2', warehouses as never);
    expect(select).toHaveBeenLastCalledWith(warehouses[1]);
  });

  it('sélecteur de magasin : dépôts désactivés masqués, choix périmé remplacé par le dépôt du backend', () => {
    const { component } = setup(false, []);
    const http = TestBed.inject(HttpTestingController);
    const ctx = TestBed.inject(WarehouseContextService);
    const principal = { id: '3f0c8e1a-0000-4000-8000-000000000001', name: 'Magasin principal', active: true };
    const ferme = { id: '3f0c8e1a-0000-4000-8000-000000000002', name: 'Ancien magasin', active: false };
    ctx.select(ferme);
    const shown: string[][] = [];
    component.warehouses$.subscribe((w) => shown.push(w.map((it) => it.id)));

    http.expectOne(`${environment.apiUrl}/warehouses`).flush({ items: [principal, ferme], total: 2 });
    http.expectOne(`${environment.apiUrl}/warehouses/current`).flush(principal);
    expect(shown.at(-1)).toEqual([principal.id]);
    expect(ctx.warehouseId).toBe(principal.id);

    // Le backend refuse ensuite le dépôt envoyé : la liste est relue, le choix encore valide est gardé.
    ctx.requestRevalidation();
    http.expectOne(`${environment.apiUrl}/warehouses`).flush({ items: [principal], total: 1 });
    http.expectNone(`${environment.apiUrl}/warehouses/current`);
    expect(ctx.warehouseId).toBe(principal.id);
  });

  it('aucun magasin attribué : explication à la place des écrans métier', () => {
    const { fixture } = setup(false, []);
    const http = TestBed.inject(HttpTestingController);

    http.expectOne(`${environment.apiUrl}/warehouses`).flush({ items: [], total: 0 });
    http
      .expectOne(`${environment.apiUrl}/warehouses/current`)
      .flush({ code: 'NO_WAREHOUSE_AVAILABLE', message: 'Aucun dépôt actif ne vous est attribué.' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    const empty = fixture.debugElement.query(By.css('.shell-empty-state'));
    expect(empty).not.toBeNull();
    expect((empty.nativeElement as HTMLElement).textContent).toContain('Aucun magasin ne vous est attribué');
    expect(fixture.debugElement.query(By.css('router-outlet'))).toBeNull();
  });

  it('caisse ouverte dans un autre magasin : avertissement avec retour possible', () => {
    const { fixture } = setup(false, ['cash:operate']);
    const http = TestBed.inject(HttpTestingController);
    const ctx = TestBed.inject(WarehouseContextService);
    const plateau = { id: '3f0c8e1a-0000-4000-8000-000000000001', name: 'Magasin Plateau', active: true };
    const cocody = { id: '3f0c8e1a-0000-4000-8000-000000000002', name: 'Magasin Cocody', active: true };
    ctx.select(cocody);

    http.expectOne(`${environment.apiUrl}/warehouses`).flush({ items: [plateau, cocody], total: 2 });
    http
      .expectOne(`${environment.apiUrl}/cash-register/current`)
      .flush({ id: 's1', status: 'OPEN', warehouseId: plateau.id, inCurrentWarehouse: false });
    fixture.detectChanges();

    const banner = fixture.debugElement.query(By.css('.shell-banner'));
    expect(banner).not.toBeNull();
    expect((banner.nativeElement as HTMLElement).textContent).toContain('Magasin Plateau');

    (banner.query(By.css('button')).nativeElement as HTMLButtonElement).click();
    expect(ctx.warehouseId).toBe(plateau.id);
    http
      .expectOne(`${environment.apiUrl}/cash-register/current`)
      .flush({ id: 's1', status: 'OPEN', warehouseId: plateau.id, inCurrentWarehouse: true });
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.shell-banner'))).toBeNull();
  });

  it('changement refusé (panier conservé) : le sélecteur revient sur le magasin courant', async () => {
    const { component } = setup(false, []);
    const ctx = TestBed.inject(WarehouseContextService);
    const plateau = { id: '3f0c8e1a-0000-4000-8000-000000000001', name: 'Magasin Plateau' };
    const cocody = { id: '3f0c8e1a-0000-4000-8000-000000000002', name: 'Magasin Cocody' };
    ctx.select(plateau);
    ctx.addSwitchCheck(() => false);
    const select = { value: cocody.id };

    await component.setWarehouse(cocody.id, [plateau, cocody], select as never);

    expect(ctx.warehouseId).toBe(plateau.id);
    expect(select.value).toBe(plateau.id);
  });
});
