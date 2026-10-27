import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { environment } from '../../../../environments/environment';
import { defaultInvoiceSettings } from '../../../core/models/invoice-settings.model';
import { Sale } from '../../../core/models/sale.model';
import { DOCUMENT_FORMAT_KEY, InvoiceDrawerComponent, MOBILE_QUERY, initialFormat } from './invoice-drawer.component';

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
    localStorage.removeItem(DOCUMENT_FORMAT_KEY);
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

  /** Vente issue d'aucun devis : réponse vide. */
  function noQuote(): void {
    http.expectOne(`${environment.apiUrl}/quotes/for-sale/s1`).flush(null);
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
    noQuote();
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
    noQuote();
    fixture.detectChanges();

    expect(text()).toContain('Configuration de la facture indisponible');
    expect(text()).toContain('VTE-2026-000007');
    expect(fixture.nativeElement.querySelector('.gsi-company')).toBeNull();
  });

  it('vente issue d’un devis : la facture reprend le n° du devis et ses seules informations renseignées', () => {
    const { fixture, text } = setup();
    http.expectOne(URL).flush({ ...defaultInvoiceSettings(), logo: null, updatedAt: '2026-10-16T08:00:00Z' });
    http.expectOne(`${environment.apiUrl}/quotes/for-sale/s1`).flush({
      id: 'q1',
      number: 'DEV-2026-000001',
      quoteDate: '2022-03-23',
      subject: 'Matériels de latrine',
      lotReference: '2',
      beneficiaries: 20,
      deliveryAddress: null,
      contractReference: null,
      deliveryTerms: null,
      paymentTerms: 'Paiement à 30 jours',
      executionDelay: null,
      notes: null
    });
    fixture.detectChanges();

    expect(text()).toContain('FACTURE DÉFINITIVE');
    // Intitulé et valeur (le « : » est ajouté par la feuille de style).
    expect(text()).toContain('DevisDEV-2026-000001');
    expect(text()).toContain('ObjetMatériels de latrine');
    expect(text()).toContain('Nombre de bénéficiaires20');
    expect(text()).toContain('Conditions de paiement');
    expect(text()).not.toContain('Lieu de livraison');
    expect(text()).not.toContain('null');
    // Montants : ceux de la vente.
    expect(text()).toContain('30 000 FCFA');
  });

  it('caisse : devis transmis dès le rattachement, facture définitive sans attendre le serveur', () => {
    sessionStorage.clear();
    localStorage.removeItem(DOCUMENT_FORMAT_KEY);
    TestBed.configureTestingModule({
      imports: [InvoiceDrawerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(InvoiceDrawerComponent);
    fixture.componentRef.setInput('sale', SALE);
    fixture.componentRef.setInput('quote', {
      id: 'q1', number: 'DEV-2026-000001', quoteDate: '2022-03-23', subject: 'Matériels de latrine', lotReference: '2',
      beneficiaries: 20, deliveryAddress: null, contractReference: null, deliveryTerms: null, paymentTerms: null,
      executionDelay: null, notes: null
    });
    fixture.detectChanges();
    http.expectOne(URL).flush({ ...defaultInvoiceSettings(), logo: null, updatedAt: '' });
    // Devis connu : aucune demande /quotes/for-sale.
    http.expectNone(`${environment.apiUrl}/quotes/for-sale/s1`);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toContain('FACTURE DÉFINITIVE');
    expect(text).toContain('ObjetMatériels de latrine');
    expect(text).toContain('Lot2');
    expect(text).toContain('Nombre de bénéficiaires20');
  });

  it('ticket 80 mm : même vente, présentation étroite ; la facture A4 reste le format par défaut', () => {
    const { fixture, text } = setup();
    const settings = defaultInvoiceSettings();
    settings.company.companyName = 'Quincaillerie Moderne';
    http.expectOne(URL).flush({ ...settings, logo: null, updatedAt: '2026-10-16T08:00:00Z' });
    noQuote();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.gsi')).not.toBeNull();
    expect(el.querySelector('.gsr')).toBeNull();

    fixture.componentInstance.setFormat('RECEIPT');
    fixture.detectChanges();

    expect(el.querySelector('.gsi')).toBeNull();
    expect(el.querySelector('.gsr')).not.toBeNull();
    expect(text()).toContain('Ticket de caisse');
    expect(text()).toContain('VTE-2026-000007');
    expect(text()).toContain('Quincaillerie Moderne');
    expect(text()).toContain('30 000 FCFA');
    // Le PDF concerne la facture A4 seulement.
    expect(text()).not.toContain('Exporter PDF');
  });

  it('le format choisi est mémorisé sur l’appareil pour les ventes suivantes', () => {
    const first = setup();
    first.fixture.componentInstance.setFormat('RECEIPT');
    expect(localStorage.getItem(DOCUMENT_FORMAT_KEY)).toBe('RECEIPT');
    http.expectOne(URL).flush({ ...defaultInvoiceSettings(), logo: null, updatedAt: '' });
    noQuote();
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      imports: [InvoiceDrawerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(InvoiceDrawerComponent);
    fixture.componentRef.setInput('sale', SALE);
    fixture.detectChanges();
    expect(fixture.componentInstance.format()).toBe('RECEIPT');
    http.expectOne(URL).flush({ ...defaultInvoiceSettings(), logo: null, updatedAt: '' });
    noQuote();
    localStorage.removeItem(DOCUMENT_FORMAT_KEY);
  });

  describe('format à l’ouverture : ticket sur téléphone, facture A4 sur ordinateur', () => {
    const realMatchMedia = window.matchMedia;

    function screen(mobile: boolean): void {
      window.matchMedia = ((query: string) => ({ matches: mobile && query === MOBILE_QUERY })) as unknown as typeof window.matchMedia;
    }

    afterEach(() => {
      window.matchMedia = realMatchMedia;
      localStorage.removeItem(DOCUMENT_FORMAT_KEY);
    });

    it('téléphone, aucun choix sur l’appareil : ticket de caisse 80 mm', () => {
      localStorage.removeItem(DOCUMENT_FORMAT_KEY);
      screen(true);
      expect(initialFormat()).toBe('RECEIPT');
    });

    it('ordinateur, aucun choix sur l’appareil : facture A4', () => {
      localStorage.removeItem(DOCUMENT_FORMAT_KEY);
      screen(false);
      expect(initialFormat()).toBe('A4');
    });

    it('le choix fait sur l’appareil l’emporte toujours', () => {
      screen(true);
      localStorage.setItem(DOCUMENT_FORMAT_KEY, 'A4');
      expect(initialFormat()).toBe('A4');
      screen(false);
      localStorage.setItem(DOCUMENT_FORMAT_KEY, 'RECEIPT');
      expect(initialFormat()).toBe('RECEIPT');
    });
  });
});
