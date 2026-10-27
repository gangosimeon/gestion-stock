import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { jwtInterceptor } from '../../../auth/interceptors/jwt.interceptor';
import { SalesFacade } from '../data/sales.facade';
import { SalesShellPageComponent } from './sales-shell-page.component';

const API = environment.apiUrl;
const CEMENT = {
  id: 'p-cim',
  sku: 'CIM-50',
  name: 'Sac de ciment',
  categoryId: 'c',
  purchasePrice: 5000,
  retailPrice: 7300,
  wholesalePrice: 7000,
  stockQuantity: 50,
  alertThreshold: 5
};

describe('SalesShellPageComponent — encaissement en espèces', { timeout: 20_000 }, () => {
  let http: HttpTestingController;
  let snackbar: { open: ReturnType<typeof vi.fn> };

  function setup() {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'access');
    sessionStorage.setItem('refresh_token', 'refresh');
    sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({ id: 'u', username: 'caisse', role: 'EMPLOYEE', roles: ['CAISSIER'], permissions: ['sale:create', 'cash:operate'] })
    );
    snackbar = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [SalesShellPageComponent],
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MatSnackBar, useValue: snackbar }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SalesShellPageComponent);
    fixture.detectChanges();
    http.match(`${API}/products`).forEach((r) => r.flush({ items: [CEMENT], total: 1 }));
    http.match(`${API}/customers`).forEach((r) => r.flush({ items: [], total: 0 }));
    TestBed.inject(SalesFacade).addProductToCart(CEMENT.id);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const text = () => root.textContent?.replace(/\s+/g, ' ') ?? '';
    const checkoutButton = () => root.querySelector<HTMLButtonElement>('button.checkout')!;
    return { fixture, page: fixture.componentInstance, root, text, checkoutButton };
  }

  afterEach(() => http.verify());

  it('montant reçu saisi : monnaie à rendre affichée, montants rapides proposés', () => {
    const { fixture, page, text, root } = setup();
    expect(text()).toContain('Total à payer');
    expect(text()).toContain('Compte juste');

    page.received.setValue(10000);
    fixture.detectChanges();
    expect(root.querySelector('.change')?.textContent?.replace(/\s+/g, ' ')).toContain('Monnaie à rendre');
    expect(text()).toMatch(/2\s?700/);

    // Montant rapide : compte juste, aucune monnaie.
    page.setReceived(7300);
    fixture.detectChanges();
    expect(root.querySelector('.change__amount')?.textContent?.trim()).toMatch(/^0/);
  });

  it('montant insuffisant : somme manquante affichée, encaissement bloqué', () => {
    const { fixture, page, root, checkoutButton } = setup();
    page.received.setValue(5000);
    fixture.detectChanges();
    expect(root.querySelector('.change--missing')?.textContent).toContain('Montant insuffisant');
    expect(checkoutButton().disabled).toBe(true);

    page.checkout();
    expect(snackbar.open).toHaveBeenCalledWith(expect.stringContaining('il manque'), 'OK', expect.anything());
    http.expectNone(`${API}/sales`);
  });

  it('vente enregistrée : montant reçu envoyé, monnaie conservée par le serveur et annoncée, saisie remise à zéro', () => {
    const { fixture, page } = setup();
    page.received.setValue(10000);
    fixture.detectChanges();

    page.checkout();
    const post = http.expectOne(`${API}/sales`);
    // Montant reçu envoyé pour être conservé ; le serveur encaisse toujours son propre total.
    expect(post.request.body.paidAmount).toBeUndefined();
    expect(post.request.body.cashReceived).toBe(10000);
    post.flush(
      { id: 's1', number: 'VTE-2026-000050', total: 7300, paidAmount: 7300, creditAmount: 0, cashReceived: 10000, changeGiven: 2700, items: [] },
      { status: 201, statusText: 'Created' }
    );
    http.match(`${API}/products`).forEach((r) => r.flush({ items: [CEMENT], total: 1 }));
    http.match(`${API}/customers`).forEach((r) => r.flush({ items: [], total: 0 }));
    http.match(() => true).forEach((r) => r.flush(null));

    expect(snackbar.open).toHaveBeenCalledWith(
      expect.stringMatching(/VTE-2026-000050 enregistrée · Monnaie à rendre : 2\s?700 FCFA/),
      'OK',
      expect.anything()
    );
    expect(page.received.value).toBeNull();
  });

  it('affichage en cartes (retenu sur l’appareil) : un toucher ajoute le produit au panier', () => {
    const { fixture, page, root } = setup();
    expect(root.querySelector('.catalog')).toBeNull();

    page.setProductView('cards');
    fixture.detectChanges();
    expect(localStorage.getItem('geststock.sales.productView')).toBe('cards');
    const card = root.querySelector<HTMLButtonElement>('.catalog app-product-card button.card')!;
    expect(card.textContent).toContain('Sac de ciment');
    // Déjà une fois au panier (setup) : le badge l'indique, un toucher en ajoute une.
    expect(card.querySelector('.card__badge')?.textContent).toBe('1');
    card.click();
    fixture.detectChanges();
    expect(page.vmSnapshot.cart[0].quantity).toBe(2);

    page.setProductView('list');
    fixture.detectChanges();
    expect(root.querySelector('.catalog')).toBeNull();
  });

  it('lecteur de codes-barres : référence exacte + Entrée ajoute le produit', () => {
    const { page } = setup();
    page.productSearch.setValue('CIM-50');
    page.onSearchEnter(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(page.vmSnapshot.cart[0].quantity).toBe(2);
    expect(page.productSearch.value).toBe('');
  });

  it('autre moyen de paiement : pas de saisie d’espèces', () => {
    const { fixture, page, root } = setup();
    page.onPaymentChange('MOBILE_MONEY');
    fixture.detectChanges();
    expect(root.querySelector('.cash')).toBeNull();
  });
});
