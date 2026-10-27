import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { jwtInterceptor } from '../../../auth/interceptors/jwt.interceptor';
import { KeyValueStore } from '../data/quick-sale.model';
import { QUICK_SALE_STORE, QuickSalePageComponent } from './quick-sale-page.component';

const API = environment.apiUrl;
const CEMENT = {
  id: 'p-cim',
  sku: 'CIM-50',
  name: 'Ciment CPJ-45',
  barcode: '6001234567890',
  categoryId: 'c',
  purchasePrice: 5000,
  retailPrice: 7300,
  wholesalePrice: 7000,
  stockQuantity: 50,
  alertThreshold: 5
};
const NAILS = { ...CEMENT, id: 'p-clo', sku: 'CLO-5', name: 'Clous 5 cm', barcode: null, retailPrice: 1200, wholesalePrice: 1100 };

describe('QuickSalePageComponent (caisse rapide)', { timeout: 20_000 }, () => {
  let http: HttpTestingController;
  let snackbar: { open: ReturnType<typeof vi.fn> };
  let store: KeyValueStore & { data: Record<string, string> };
  const realStore = QUICK_SALE_STORE.current;

  function setup() {
    sessionStorage.clear();
    sessionStorage.setItem('access_token', 'access');
    sessionStorage.setItem('refresh_token', 'refresh');
    sessionStorage.setItem('token_expiry', String(Date.now() + 60_000));
    sessionStorage.setItem(
      'current_user',
      JSON.stringify({ id: 'u', username: 'caisse', role: 'EMPLOYEE', roles: ['CAISSIER'], permissions: ['sale:create', 'cash:operate'] })
    );
    const data: Record<string, string> = {};
    store = { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = v) };
    QUICK_SALE_STORE.current = store;
    snackbar = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [QuickSalePageComponent],
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MatSnackBar, useValue: snackbar }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(QuickSalePageComponent);
    fixture.detectChanges();
    flushCatalog();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const text = () => root.textContent?.replace(/\s+/g, ' ') ?? '';
    const tiles = () => Array.from(root.querySelectorAll<HTMLButtonElement>('app-product-card button.card'));
    const payButton = () => root.querySelector<HTMLButtonElement>('.qs-pay-button')!;
    return { fixture, page: fixture.componentInstance, root, text, tiles, payButton };
  }

  function flushCatalog(): void {
    http.match(`${API}/products`).forEach((r) => r.flush({ items: [CEMENT, NAILS], total: 2 }));
    http.match(`${API}/customers`).forEach((r) => r.flush({ items: [], total: 0 }));
  }

  afterEach(() => {
    http.verify();
    QUICK_SALE_STORE.current = realStore;
  });

  it('ouverture : articles proposés en tuiles, mode retenu sur l’appareil, rien à encaisser', () => {
    const { text, tiles, payButton } = setup();
    expect(tiles().map((t) => t.textContent)).toEqual([expect.stringContaining('Ciment CPJ-45'), expect.stringContaining('Clous 5 cm')]);
    expect(text()).toContain('Touchez un article pour commencer la vente.');
    expect(payButton().disabled).toBe(true);
    expect(store.data['geststock.salesMode']).toBe('quick');
  });

  it('un toucher ajoute l’article, + et − ajustent la quantité, le total suit', () => {
    const { fixture, page, root, text, tiles } = setup();
    tiles()[0].click();
    tiles()[0].click();
    fixture.detectChanges();
    expect(root.querySelector('.card__badge')?.textContent).toBe('2');
    expect(text()).toMatch(/TOTAL\s?14\s?600 FCFA/);

    page.dec(page.vm()!.cart[0]);
    fixture.detectChanges();
    expect(text()).toMatch(/TOTAL\s?7\s?300 FCFA/);
  });

  it('recherche sans accents et lecteur de codes-barres (saisie + Entrée)', () => {
    const { fixture, page, root, tiles } = setup();
    page.onSearch('clous');
    fixture.detectChanges();
    expect(tiles()).toHaveLength(1);

    page.onSearch('6001234567890');
    page.onSearchEnter();
    fixture.detectChanges();
    expect(page.vm()!.cart.map((r) => r.productId)).toEqual(['p-cim']);
    expect(page.search()).toBe('');
    expect((root.querySelector('.qs-search__input') as HTMLInputElement).value).toBe('');
  });

  it('espèces : monnaie à rendre en grand, encaissement bloqué si le montant est insuffisant', () => {
    const { fixture, page, root, tiles, payButton } = setup();
    tiles()[0].click();
    page.setReceived(5000);
    fixture.detectChanges();
    expect(root.querySelector('.qs-change--missing')?.textContent).toMatch(/Il manque 2\s?300 FCFA/);
    expect(payButton().disabled).toBe(true);

    page.setReceived(10000);
    fixture.detectChanges();
    expect(root.querySelector('.qs-change')?.textContent).toMatch(/Monnaie à rendre : 2\s?700 FCFA/);
    expect(payButton().disabled).toBe(false);
  });

  it('F9 encaisse : même vente que la caisse complète, articles retenus comme favoris', () => {
    const { fixture, page, tiles } = setup();
    tiles()[1].click(); // Clous
    page.setReceived(2000);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9' }));
    const post = http.expectOne(`${API}/sales`);
    expect(post.request.body.items).toEqual([{ productId: 'p-clo', quantity: 1 }]);
    expect(post.request.body.paymentMethod).toBe('CASH');
    expect(post.request.body.cashReceived).toBe(2000);
    expect(post.request.body.paidAmount).toBeUndefined();
    post.flush(
      { id: 's1', number: 'VTE-2026-000060', total: 1200, paidAmount: 1200, creditAmount: 0, cashReceived: 2000, changeGiven: 800, items: [] },
      { status: 201, statusText: 'Created' }
    );
    flushCatalog();
    fixture.detectChanges();
    // Ticket ouvert après la vente : configuration de la facture et devis éventuel.
    http.match(() => true).forEach((r) => r.flush(null));
    fixture.detectChanges();

    expect(snackbar.open).toHaveBeenCalledWith(expect.stringMatching(/VTE-2026-000060 enregistrée · Monnaie à rendre : 800 FCFA/), 'OK', expect.anything());
    expect(page.received()).toBeNull();
    // Les clous, vendus sur cet appareil, passent en tête des tuiles.
    expect(page.favorites()[0].id).toBe('p-clo');
  });

  it('vente à crédit sans client : options ouvertes, rien n’est envoyé', () => {
    const { fixture, page, tiles } = setup();
    tiles()[0].click();
    page.setPartial(true);
    fixture.detectChanges();

    page.checkout();
    expect(page.showOptions()).toBe(true);
    expect(snackbar.open).toHaveBeenCalledWith(expect.stringContaining('choisissez le client'), 'OK', expect.anything());
    http.expectNone(`${API}/sales`);
  });

  it('panier vide : F9 n’envoie rien', () => {
    const { page } = setup();
    page.checkout();
    expect(snackbar.open).toHaveBeenCalledWith(expect.stringContaining('Panier vide'), 'OK', expect.anything());
    http.expectNone(`${API}/sales`);
  });
});
