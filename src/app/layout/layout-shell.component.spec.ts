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
import { AuthService } from '../auth/services/auth.service';
import { WarehouseContextService } from '../core/services/warehouse-context.service';

import { LayoutShellComponent } from './layout-shell.component';

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
    const { fixture, navLabels } = setup(true, ['sale:create', 'appointment:read']);
    (fixture.debugElement.query(By.css('.shell-header__toggle')).nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();
    const labels = navLabels();
    expect(labels).toContain('RDV');
    expect(labels).toContain('Produits');
    expect(labels).not.toContain('Utilisateurs');
    expect(labels).not.toContain('Audit');
    expect(labels).not.toContain('Rapports');
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
});
