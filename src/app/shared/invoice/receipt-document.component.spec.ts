import { TestBed } from '@angular/core/testing';

import { InvoiceSettings, defaultInvoiceSettings } from '../../core/models/invoice-settings.model';
import { Sale } from '../../core/models/sale.model';
import { InvoiceData, saleToInvoiceData } from './invoice-data';
import { RECEIPT_PAGE_RULES } from './invoice-output';
import { ReceiptDocumentComponent } from './receipt-document.component';

const SALE: Sale = {
  id: 's1',
  number: 'VTE-2026-000042',
  type: 'RETAIL',
  status: 'COMPLETED',
  items: [
    { productId: 'p1', productSku: 'CIM', productName: 'Ciment 42.5', quantity: 2, unitPrice: 7500, discountPercent: 0, lineTotal: 15000 },
    { productId: 'p2', productSku: 'FER', productName: 'Fer à béton 10 mm', quantity: 3, unitPrice: 1000, discountPercent: 10, lineTotal: 2700 }
  ],
  subtotal: 18000,
  discountTotal: 300,
  total: 17700,
  paidAmount: 10000,
  creditAmount: 7700,
  paymentMethod: 'CASH',
  cashReceived: 10000,
  changeGiven: 0,
  profit: 0,
  createdAt: '2026-10-15T10:30:00Z',
  createdByUserId: 'u'
};

function configured(change: (s: InvoiceSettings) => void = () => undefined): InvoiceSettings {
  const s = defaultInvoiceSettings();
  s.company = {
    ...s.company,
    companyName: 'Quincaillerie Moderne',
    address: 'Avenue de l’Indépendance',
    city: 'Ouagadougou',
    country: 'Burkina Faso',
    phone: '+226 70 12 34 56',
    taxId: '00012345X'
  };
  change(s);
  return s;
}

function data(sale: Sale = SALE, customerName: string | null = null): InvoiceData {
  return saleToInvoiceData(sale, { customerName, paymentMethodLabel: 'Espèces', warehouseName: 'Dépôt central' });
}

function render(settings: InvoiceSettings, d: InvoiceData) {
  TestBed.configureTestingModule({ imports: [ReceiptDocumentComponent] });
  const fixture = TestBed.createComponent(ReceiptDocumentComponent);
  fixture.componentRef.setInput('settings', settings);
  fixture.componentRef.setInput('data', d);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const text = el.textContent?.replace(/\s+/g, ' ') ?? '';
  return { fixture, el, text };
}

describe('ReceiptDocumentComponent (ticket de caisse 80 mm)', () => {
  // Libellé et valeur sont deux cellules voisines : le texte brut les accole (« TOTAL17 700 »).
  it('reprend les montants de la vente enregistrée, sans recalcul', () => {
    const { text } = render(configured(), data());

    expect(text).toContain('VTE-2026-000042');
    expect(text).toContain('Ciment 42.5');
    expect(text).toContain('2 x 7 500');
    expect(text).toContain('15 000');
    expect(text).toContain('(-10 %)');
    expect(text).toContain('Sous-total');
    expect(text).toContain('-300 FCFA');
    expect(text).toContain('TOTAL17 700 FCFA');
    expect(text).toContain('Payé (Espèces)10 000 FCFA');
    expect(text).toContain('Reste à payer7 700 FCFA');
    expect(text).toContain('Montant reçu');
  });

  it('en-tête issu de la configuration ; champs vides ou masqués jamais affichés', () => {
    const { el, text } = render(configured((s) => (s.header.showTaxId = false)), data());

    expect(text).toContain('Quincaillerie Moderne');
    expect(text).toContain('Tél. +226 70 12 34 56');
    expect(text).toContain('Ouagadougou – Burkina Faso');
    expect(text).not.toContain('IFU/NIF');
    expect(text).not.toContain('RCCM');
    expect(text).not.toContain('null');
    expect(el.querySelector('.gsr-logo')).toBeNull();
  });

  it('client comptoir non affiché ; client nommé affiché', () => {
    expect(render(configured(), data()).text).not.toContain('Client comptoir');
    TestBed.resetTestingModule();
    expect(render(configured(), data(SALE, 'Alpha Traoré')).text).toContain('ClientAlpha Traoré');
  });

  it('sans remise : ni sous-total ni ligne de remise', () => {
    const sale: Sale = {
      ...SALE,
      items: [SALE.items[0]],
      subtotal: 15000,
      discountTotal: 0,
      total: 15000,
      paidAmount: 15000,
      creditAmount: 0
    };
    const { text } = render(configured(), data(sale));

    expect(text).not.toContain('Sous-total');
    expect(text).not.toContain('Remise');
    expect(text).not.toContain('Reste à payer');
  });

  it('vente annulée : bandeau visible avec le motif', () => {
    const sale: Sale = { ...SALE, status: 'CANCELLED', cancelledAt: '2026-10-15T11:00:00Z', cancellationReason: 'Erreur de saisie' };
    const { text } = render(configured(), data(sale));

    expect(text).toContain('VENTE ANNULÉE');
    expect(text).toContain('Erreur de saisie');
  });

  it('mentions courtes du pied (retours, remerciement) ; conditions longues réservées à la facture A4', () => {
    const settings = configured((s) => {
      s.footer.thankYouMessage = 'Merci de votre visite';
      s.footer.showThankYou = true;
      s.footer.returnPolicy = 'Retour sous 7 jours avec le ticket.';
      s.footer.showReturnPolicy = true;
      s.footer.salesTerms = 'Conditions générales de vente détaillées';
      s.footer.showSalesTerms = true;
    });
    const { text } = render(settings, data());

    expect(text).toContain('Merci de votre visite');
    expect(text).toContain('Retour sous 7 jours avec le ticket.');
    expect(text).not.toContain('Conditions générales de vente détaillées');
  });

  it('impression : aucune marge imposée ; format du rouleau laissé au pilote de l’imprimante', () => {
    expect(RECEIPT_PAGE_RULES).toContain('@page { margin: 0; }');
    expect(RECEIPT_PAGE_RULES).not.toContain('size:');
  });

  it('largeur imprimable d’un rouleau de 80 mm : 72 mm', () => {
    const { el } = render(configured(), data());
    const root = el.querySelector('.gsr') as HTMLElement;
    expect(root).not.toBeNull();
    expect(getComputedStyle(root).width).toBe('72mm');
  });
});
