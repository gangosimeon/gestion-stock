import { TestBed } from '@angular/core/testing';

import { defaultInvoiceSettings } from '../../core/models/invoice-settings.model';
import { InvoiceDocumentComponent } from './invoice-document.component';
import { QuoteDocumentInput, quoteDetails, quoteSections, quoteToDocumentData, withQuoteReference } from './quote-document';
import { InvoiceData } from './invoice-data';

const EMPTY_FIELDS = {
  subject: null,
  lotReference: null,
  beneficiaries: null,
  deliveryAddress: null,
  contractReference: null,
  deliveryTerms: null,
  paymentTerms: null,
  executionDelay: null,
  notes: null
};

/** Exemple du cahier des charges : 952 000 FCFA calculés à partir des lignes. */
const ONG_HELP: QuoteDocumentInput = {
  ...EMPTY_FIELDS,
  number: 'DEV-2026-000001',
  quoteDate: '2022-03-23',
  validUntil: null,
  customerName: 'ONG HELP',
  subject: 'Fourniture des matériels de latrine au profit des PDI de la commune de Pissila',
  lotReference: '2',
  beneficiaries: 20,
  lines: [
    { productSku: 'CIM', productName: 'Sac de ciment 50 kg CPA 45', quantity: 120, unitPrice: 6000 },
    { productSku: 'FER', productName: 'Barre de fer diamètre 10', quantity: 40, unitPrice: 5500 },
    { productSku: 'FIL', productName: 'Rouleau de 10 m de fil de fer mou', quantity: 20, unitPrice: 600 }
  ]
};

function render(data: InvoiceData): string {
  TestBed.configureTestingModule({ imports: [InvoiceDocumentComponent] });
  const fixture = TestBed.createComponent(InvoiceDocumentComponent);
  fixture.componentRef.setInput('settings', defaultInvoiceSettings());
  fixture.componentRef.setInput('data', data);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
}

describe('Devis mis en page (aperçu, impression, PDF)', () => {
  it('exemple ONG HELP : titre DEVIS, lignes, total 952 000 calculé, montant en lettres du devis', () => {
    const data = quoteToDocumentData(ONG_HELP);
    expect(data.total).toBe(952000);
    expect(data.lines.map((l) => l.lineTotal)).toEqual([720000, 220000, 12000]);

    const text = render(data);
    expect(text).toContain('DEVIS');
    expect(text).not.toContain('FACTURE');
    expect(text).toContain('23/03/2022');
    expect(text).toContain('ONG HELP');
    // Intitulé et valeur (le « : » est ajouté par la feuille de style).
    expect(text).toContain('ObjetFourniture des matériels de latrine');
    expect(text).toContain('Lot2');
    expect(text).toContain('Nombre de bénéficiaires20');
    expect(text).toContain('952 000 FCFA');
    expect(text).toContain('Arrêté le présent devis à la somme de : Neuf cent cinquante-deux mille francs CFA');
    // Un devis n'est pas une vente : ni règlement, ni montant payé.
    expect(text).not.toContain('Règlement');
    expect(text).not.toContain('Payé');
  });

  it('champs facultatifs absents : aucun intitulé vide, ni null, ni bénéficiaires à 0', () => {
    const data = quoteToDocumentData({
      ...ONG_HELP,
      ...EMPTY_FIELDS,
      subject: '   ',
      beneficiaries: 0
    });
    expect(data.details).toEqual([]);
    expect(data.sections).toEqual([]);

    const text = render(data);
    for (const absent of ['Objet', 'Lot', 'bénéficiaires', 'Lieu de livraison', 'Référence du marché', 'Conditions', 'Délai', 'Observations', 'Valable', 'null', 'undefined']) {
      expect(text, absent).not.toContain(absent);
    }
    expect(text).not.toMatch(/:\s*(Lot|Objet|$)/);
  });

  it('conditions et observations renseignées seulement, validité affichée si elle existe', () => {
    const fields = { ...EMPTY_FIELDS, paymentTerms: '50 % à la commande', notes: '  ' };
    expect(quoteSections(fields)).toEqual([{ title: 'Conditions de paiement', text: '50 % à la commande' }]);
    expect(quoteDetails({ ...fields, deliveryAddress: 'Pissila' })).toEqual([
      { label: 'Lieu de livraison / d’exécution', value: 'Pissila' }
    ]);

    const text = render(quoteToDocumentData({ ...ONG_HELP, ...fields, validUntil: '2022-04-23' }));
    expect(text).toContain("Valable jusqu'au23/04/2022");
    expect(text).toContain('Conditions de paiement');
    expect(text).not.toContain('Observations');
  });

  it('lignes par bénéficiaire : colonnes « Quantité par bénéficiaire » et « Quantité totale », absentes sinon', () => {
    const perBeneficiary = render(
      quoteToDocumentData({
        ...ONG_HELP,
        lines: [
          { productSku: 'CIM', productName: 'Sac de ciment', quantity: 120, quantityPerBeneficiary: 6, unitPrice: 6000 },
          { productSku: 'FIL', productName: 'Rouleau de fil', quantity: 20, quantityPerBeneficiary: null, unitPrice: 600 }
        ]
      })
    );
    expect(perBeneficiary).toContain('Quantité par bénéficiaire');
    expect(perBeneficiary).toContain('Quantité totale');
    // Ciment : 6 par bénéficiaire, 120 au total, 720 000.
    expect(perBeneficiary).toContain('Sac de ciment61206 000720 000');
    TestBed.resetTestingModule();

    expect(render(quoteToDocumentData(ONG_HELP))).not.toContain('Quantité par bénéficiaire');
  });

  it('libellés écrits en entier, sans abréviation', () => {
    const text = render(
      quoteToDocumentData({
        ...ONG_HELP,
        customerPhone: '+226 70 00 00 00',
        contractReference: 'Marché 2022/045',
        lines: [{ productSku: 'CIM', productName: 'Sac de ciment', quantity: 120, quantityPerBeneficiary: 6, unitPrice: 6000 }]
      })
    );
    for (const full of ['Numéro', 'Référence', 'Désignation', 'Quantité par bénéficiaire', 'Quantité totale', 'Prix unitaire', 'Téléphone', 'Référence du marché']) {
      expect(text, full).toContain(full);
    }
    for (const abbreviation of ['Qté', 'Réf.', 'Tél.', 'bénéf.', 'N°']) {
      expect(text, abbreviation).not.toContain(abbreviation);
    }
  });

  it('facture d’une vente issue d’un devis : référence du devis et seulement ses informations renseignées', () => {
    const sale: InvoiceData = {
      number: 'VTE-2026-000010',
      date: '2026-10-16T10:00:00Z',
      customerName: 'ONG HELP',
      paymentMethodLabel: 'Cash',
      lines: [],
      discountTotal: 0,
      total: 0,
      paidAmount: 0,
      creditAmount: 0
    };
    const withQuote = withQuoteReference(sale, {
      id: 'q1',
      number: 'DEV-2026-000001',
      quoteDate: '2022-03-23',
      ...EMPTY_FIELDS,
      lotReference: '2'
    });
    expect(withQuote.title).toBe('FACTURE DÉFINITIVE');
    expect(withQuote.quoteNumber).toBe('DEV-2026-000001');
    expect(withQuote.details).toEqual([{ label: 'Lot', value: '2' }]);
    expect(withQuote.sections).toEqual([]);
    expect(withQuoteReference(sale, null)).toBe(sale);
  });
});
