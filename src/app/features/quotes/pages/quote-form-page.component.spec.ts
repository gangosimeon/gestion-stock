import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { defaultInvoiceSettings } from '../../../core/models/invoice-settings.model';
import { Quote } from '../../../core/models/quote.model';
import { QuoteFormPageComponent } from './quote-form-page.component';

const API = environment.apiUrl;
const HELP = { id: 'c-help', name: 'ONG HELP', phone: '+226 70 00 00 00', priceCategory: 'RETAIL' };
const CEMENT = { id: 'p-cim', sku: 'CIM-50', name: 'Sac de ciment 50 kg CPA 45', retailPrice: 6500, wholesalePrice: 6200, stockQuantity: 0 };
const IRON = { id: 'p-fer', sku: 'FER-10', name: 'Barre de fer diamètre 10', retailPrice: 5800, wholesalePrice: 5500, stockQuantity: 0 };
const WIRE = { id: 'p-fil', sku: 'FIL-10', name: 'Rouleau de 10 m de fil de fer mou', retailPrice: 650, wholesalePrice: 600, stockQuantity: 0 };

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('QuoteFormPageComponent (nouveau devis)', { timeout: 20_000 }, () => {
  let http: HttpTestingController;
  let snackbar: { open: ReturnType<typeof vi.fn> };

  function setup(id: string | null = null) {
    snackbar = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [QuoteFormPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MatSnackBar, useValue: snackbar },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(QuoteFormPageComponent);
    fixture.detectChanges();
    http.expectOne(`${API}/settings/invoice`).flush({ ...defaultInvoiceSettings(), logo: null, updatedAt: '' });
    http.expectOne(`${API}/customers`).flush({ items: [HELP], total: 1 });
    http.expectOne(`${API}/products`).flush({ items: [CEMENT, IRON, WIRE], total: 3 });
    return { fixture, page: fixture.componentInstance, navigate };
  }

  /** Saisie de l'exemple du cahier des charges (prix illustratifs propres au devis). */
  function fillExample(page: QuoteFormPageComponent): void {
    page.form.patchValue({
      customerId: HELP.id,
      quoteDate: '2022-03-23',
      subject: 'Fourniture des matériels de latrine au profit des PDI de la commune de Pissila',
      lotReference: '2',
      beneficiaries: 20
    });
    for (const [product, quantity, price] of [[CEMENT, 120, 6000], [IRON, 40, 5500], [WIRE, 20, 600]] as const) {
      page.addProduct(product.id);
      const line = page.lines.at(page.lines.length - 1);
      line.patchValue({ quantity, unitPrice: price });
    }
  }

  afterEach(() => http.verify());

  it('clients et produits du catalogue ; prix prérempli avec le tarif, modifiable pour le devis', () => {
    const { page } = setup();
    expect(page.customers().map((c) => c.name)).toEqual(['ONG HELP']);
    page.addProduct(CEMENT.id);
    expect(page.lines.at(0).getRawValue()).toMatchObject({ productId: CEMENT.id, quantity: 1, unitPrice: 6500 });
    // Un produit déjà dans le devis n'est plus proposé.
    expect(page.availableProducts().map((p) => p.id)).toEqual([IRON.id, WIRE.id]);
    page.lines.at(0).controls.unitPrice.setValue(6000);
    expect(page.lineTotal(0)).toBe(6000);
  });

  it('exemple ONG HELP : 952 000 FCFA calculés à partir des lignes, aperçu DEVIS à jour', () => {
    const { page, fixture } = setup();
    fillExample(page);
    fixture.detectChanges();

    expect(page.estimatedTotal()).toBe(952000);
    const preview = (fixture.nativeElement as HTMLElement).querySelector('.preview')!.textContent!.replace(/\s+/g, ' ');
    expect(preview).toContain('DEVIS');
    expect(preview).toContain('ONG HELP');
    expect(preview).toContain('23/03/2022');
    expect(preview).toContain('Lot2');
    expect(preview).toContain('952 000 FCFA');
    // Champ facultatif vide : absent de l'aperçu.
    expect(preview).not.toContain('Observations');
    expect(preview).not.toContain('Délai');
  });

  it('enregistrement : champs vides envoyés à null, aucun total transmis, puis ouverture du devis', async () => {
    const { page, navigate } = setup();
    fillExample(page);
    page.form.controls.notes.setValue('   ');

    const saving = page.save();
    void page.save(); // double clic : un seul envoi
    const post = http.expectOne((r) => r.url === `${API}/quotes` && r.method === 'POST');
    expect(post.request.body).toEqual({
      customerId: HELP.id,
      quoteDate: '2022-03-23',
      validUntil: null,
      subject: 'Fourniture des matériels de latrine au profit des PDI de la commune de Pissila',
      lotReference: '2',
      beneficiaries: 20,
      deliveryAddress: null,
      contractReference: null,
      deliveryTerms: null,
      paymentTerms: null,
      executionDelay: null,
      notes: null,
      lines: [
        { productId: CEMENT.id, quantity: 120, unitPrice: 6000 },
        { productId: IRON.id, quantity: 40, unitPrice: 5500 },
        { productId: WIRE.id, quantity: 20, unitPrice: 600 }
      ]
    });
    expect('total' in post.request.body).toBe(false);
    post.flush({ id: 'q1', number: 'DEV-2026-000001' });
    await saving;
    expect(navigate).toHaveBeenCalledWith(['/quotes', 'q1']);
  });

  it('client et produits obligatoires ; erreurs du serveur affichées', async () => {
    const { page, fixture } = setup();
    await page.save();
    expect(page.saveError()).toContain('au moins un produit');

    page.addProduct(CEMENT.id);
    await page.save();
    expect(page.saveError()).toContain('invalides'); // client manquant
    http.expectNone(`${API}/quotes`);

    page.form.controls.customerId.setValue(HELP.id);
    const saving = page.save();
    http
      .expectOne(`${API}/quotes`)
      .flush({ code: 'PRODUCT_INACTIVE', message: 'Le produit CIM-50 est désactivé : retirez-le du devis.' }, { status: 422, statusText: 'Unprocessable' });
    await saving;
    fixture.detectChanges();
    expect(page.saveError()).toContain('désactivé');
    expect(page.saving()).toBe(false);
  });

  it('modification : le devis enregistré est rechargé dans le formulaire', async () => {
    snackbar = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [QuoteFormPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: MatSnackBar, useValue: snackbar },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'q1' }) } } }
      ]
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(QuoteFormPageComponent);
    fixture.detectChanges();
    http.expectOne(`${API}/settings/invoice`).flush({ ...defaultInvoiceSettings(), logo: null, updatedAt: '' });
    http.expectOne(`${API}/customers`).flush({ items: [HELP], total: 1 });
    http.expectOne(`${API}/products`).flush({ items: [CEMENT], total: 1 });
    const quote: Partial<Quote> = {
      id: 'q1',
      number: 'DEV-2026-000001',
      status: 'ISSUED',
      customerId: HELP.id,
      quoteDate: '2022-03-23',
      validUntil: null,
      subject: null,
      lotReference: '2',
      beneficiaries: null,
      lines: [{ id: 'l', lineNumber: 1, productId: CEMENT.id, productSku: 'CIM-50', productName: CEMENT.name, quantity: 120, unitPrice: 6000, lineTotal: 720000 }]
    };
    http.expectOne(`${API}/quotes/q1`).flush(quote);
    await flushMicrotasks();
    const page = fixture.componentInstance;
    expect(page.isEdit()).toBe(true);
    expect(page.form.controls.subject.value).toBe('');
    expect(page.lines.at(0).getRawValue()).toMatchObject({ quantity: 120, unitPrice: 6000 });

    const saving = page.save();
    const put = http.expectOne(`${API}/quotes/q1`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.subject).toBeNull();
    put.flush({ ...quote });
    await saving;
  });
});
