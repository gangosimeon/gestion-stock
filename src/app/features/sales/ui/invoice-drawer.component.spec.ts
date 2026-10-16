import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../../environments/environment';
import { defaultInvoiceSettings } from '../../../core/models/invoice-settings.model';
import { Sale } from '../../../core/models/sale.model';
import { InvoiceDrawerComponent } from './invoice-drawer.component';

const URL = `${environment.apiUrl}/settings/invoice`;

const SALE: Sale = {
  id: 's1',
  number: 'VTE-2026-000007',
  type: 'RETAIL',
  status: 'COMPLETED',
  warehouseId: 'w1',
  items: [{ productId: 'p1', productSku: 'CIM', productName: 'Ciment', quantity: 4, unitPrice: 7500, discountPercent: 0, lineTotal: 30000 }],
  subtotal: 30000,
  discountTotal: 0,
  total: 30000,
  paidAmount: 30000,
  creditAmount: 0,
  paymentMethod: 'MOBILE_MONEY',
  profit: 0,
  createdAt: '2026-10-15T10:30:00Z',
  createdByUserId: 'u'
};

describe('InvoiceDrawerComponent (facture d’une vente réelle)', () => {
  let http: HttpTestingController;

  function setup() {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [InvoiceDrawerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(InvoiceDrawerComponent);
    fixture.componentRef.setInput('sale', SALE);
    fixture.componentRef.setInput('warehouseName', 'Dépôt Cocody');
    fixture.detectChanges();
    const text = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
    return { fixture, text };
  }

  afterEach(() => http.verify());

  it('la configuration enregistrée s’applique à la facture ; les montants restent ceux de la vente', () => {
    const { fixture, text } = setup();
    const settings = defaultInvoiceSettings();
    settings.company.companyName = 'Quincaillerie Moderne';
    settings.header.showWarehouse = true;
    settings.footer.returnPolicy = 'Retour sous 7 jours.';
    settings.appearance.thousandsSeparator = 'DOT';
    http.expectOne(URL).flush({ ...settings, logo: null, updatedAt: '2026-10-16T08:00:00Z' });
    fixture.detectChanges();

    expect(text()).toContain('Quincaillerie Moderne');
    expect(text()).toContain('Dépôt Cocody');
    expect(text()).toContain('Retour sous 7 jours.');
    expect(text()).toContain('30.000 FCFA');
    expect(text()).toContain('Mobile Money');
    expect(text()).not.toContain("données d'exemple");
  });

  it('configuration illisible : facture affichée quand même, sans informations inventées, avec un avertissement', () => {
    const { fixture, text } = setup();
    http.expectOne(URL).flush({ message: 'indisponible' }, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();

    expect(text()).toContain('Configuration de la facture indisponible');
    expect(text()).toContain('VTE-2026-000007');
    expect(fixture.nativeElement.querySelector('.gsi-company')).toBeNull();
  });
});
