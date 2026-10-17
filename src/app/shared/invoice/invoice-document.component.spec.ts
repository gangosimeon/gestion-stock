import { TestBed } from '@angular/core/testing';

import { InvoiceSettings, defaultInvoiceSettings } from '../../core/models/invoice-settings.model';
import { Sale } from '../../core/models/sale.model';
import { InvoiceData, saleToInvoiceData, sampleInvoiceData } from './invoice-data';
import { InvoiceDocumentComponent } from './invoice-document.component';

const SALE: Sale = {
  id: 's1',
  number: 'VTE-2026-000042',
  type: 'RETAIL',
  status: 'COMPLETED',
  customerId: undefined,
  customerName: null,
  items: [
    { productId: 'p1', productSku: 'CIM', productName: 'Ciment', quantity: 2, unitPrice: 7500, discountPercent: 0, lineTotal: 15000 },
    { productId: 'p2', productSku: 'FER', productName: 'Fer', quantity: 3, unitPrice: 1000, discountPercent: 0, lineTotal: 3000 }
  ],
  subtotal: 18000,
  discountTotal: 0,
  total: 18000,
  paidAmount: 18000,
  creditAmount: 0,
  paymentMethod: 'CASH',
  profit: 0,
  createdAt: '2026-10-15T10:30:00Z',
  createdByUserId: 'u'
};

function configured(change: (s: InvoiceSettings) => void = () => undefined): InvoiceSettings {
  const s = defaultInvoiceSettings();
  s.company = {
    ...s.company,
    companyName: 'Quincaillerie Moderne',
    slogan: 'Qualité et confiance',
    address: 'Avenue de l’Indépendance',
    city: 'Ouagadougou',
    country: 'Burkina Faso',
    phone: '+226 70 12 34 56',
    email: 'contact@qm.bf',
    registrationNumber: 'BF OUA 2023 B 4567',
    taxId: '00012345X'
  };
  change(s);
  return s;
}

function render(settings: InvoiceSettings, data: InvoiceData = saleToInvoiceData(SALE, { paymentMethodLabel: 'Espèces' }), logoUrl: string | null = null) {
  TestBed.configureTestingModule({ imports: [InvoiceDocumentComponent] });
  const fixture = TestBed.createComponent(InvoiceDocumentComponent);
  fixture.componentRef.setInput('settings', settings);
  fixture.componentRef.setInput('data', data);
  fixture.componentRef.setInput('logoUrl', logoUrl);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  // Espaces (insécables compris) ramenés à une espace simple.
  return { fixture, root, text: () => root.textContent?.replace(/\s+/g, ' ') ?? '' };
}

describe('InvoiceDocumentComponent (rendu des factures)', () => {
  it('coordonnées de l’entreprise, numéro et montants de la vente enregistrée', () => {
    const { text } = render(configured());
    expect(text()).toContain('Quincaillerie Moderne');
    expect(text()).toContain('Ouagadougou – Burkina Faso');
    expect(text()).toContain('+226 70 12 34 56');
    expect(text()).toContain('RCCM : BF OUA 2023 B 4567');
    expect(text()).toContain('IFU/NIF : 00012345X');
    expect(text()).toContain('VTE-2026-000042');
    expect(text()).toContain('18 000 FCFA');
    expect(text()).toContain('Client comptoir');
  });

  it('entreprise non configurée : aucune coordonnée inventée', () => {
    const { root, text } = render(defaultInvoiceSettings());
    expect(root.querySelector('.gsi-company')).toBeNull();
    expect(root.querySelector('.gsi-contacts')).toBeNull();
    expect(text()).not.toContain('Téléphone');
    expect(text()).not.toContain('exemple');
  });

  it('éléments masqués par la configuration', () => {
    const { text } = render(
      configured((s) => {
        s.header.showPhone = false;
        s.header.showTaxId = false;
        s.header.showSlogan = false;
      })
    );
    expect(text()).not.toContain('+226 70 12 34 56');
    expect(text()).not.toContain('00012345X');
    expect(text()).not.toContain('Qualité et confiance');
    expect(text()).toContain('BF OUA 2023 B 4567');
  });

  it('pas de taxe : le modèle de vente n’en a pas, la facture n’en invente pas', () => {
    const { text } = render(configured());
    expect(text()).not.toMatch(/TVA|taxe/i);
  });

  it('remises : colonne et ligne de remise seulement si la vente en a', () => {
    const plain = render(configured());
    expect(plain.text()).not.toContain('Remise');
    TestBed.resetTestingModule();

    const discounted = render(configured(), sampleInvoiceData());
    expect(discounted.text()).toContain('Remise');
    expect(discounted.text()).toContain('5 %');
    expect(discounted.text()).toContain('Sous-total');
    expect(discounted.text()).toContain('-2 800 FCFA');
    TestBed.resetTestingModule();

    const hidden = render(configured((s) => (s.appearance.showDiscountColumn = false)), sampleInvoiceData());
    expect(hidden.root.querySelector('.gsi-lines thead')?.textContent).not.toContain('Remise');
  });

  it('montant en lettres et colonnes facultatives selon la configuration', () => {
    const shown = render(configured());
    expect(shown.text()).toContain('Dix-huit mille francs CFA');
    expect(shown.root.querySelector('.gsi-num')).not.toBeNull();
    expect(shown.text()).toContain('CIM');
    TestBed.resetTestingModule();

    const hidden = render(
      configured((s) => {
        s.appearance.showAmountInWords = false;
        s.appearance.showLineNumber = false;
        s.appearance.showSku = false;
      })
    );
    expect(hidden.text()).not.toContain('francs CFA');
    expect(hidden.root.querySelector('.gsi-num')).toBeNull();
    expect(hidden.text()).not.toContain('CIM');
  });

  it('pied de page : une mention n’apparaît que si elle est activée et renseignée', () => {
    const { text } = render(
      configured((s) => {
        s.footer.salesTerms = 'Marchandise non reprise.';
        s.footer.returnPolicy = 'Retour sous 7 jours.';
        s.footer.showReturnPolicy = false;
        s.footer.paymentDetails = '';
        s.footer.signatureText = 'Le gérant';
      })
    );
    expect(text()).toContain('Conditions de vente');
    expect(text()).toContain('Marchandise non reprise.');
    expect(text()).not.toContain('Retour sous 7 jours.');
    expect(text()).not.toContain('Coordonnées de paiement');
    expect(text()).toContain('Merci pour votre confiance !');
    expect(text()).toContain('Le gérant');
  });

  it('modèle, couleurs, format de date et logo appliqués', () => {
    const { root } = render(
      configured((s) => {
        s.appearance.template = 'COMPACT';
        s.appearance.primaryColor = '#0F766E';
        s.appearance.dateFormat = 'yyyy-MM-dd';
        s.header.logoPosition = 'TOP';
      }),
      undefined,
      'data:image/png;base64,AAAA'
    );
    const article = root.querySelector('.gsi') as HTMLElement;
    expect(article.classList).toContain('gsi--compact');
    expect(article.style.getPropertyValue('--gsi-primary')).toBe('#0F766E');
    expect(root.querySelector('.gsi-header--logo-top')).not.toBeNull();
    expect(root.querySelector('.gsi-meta')?.textContent).toContain('2026-10-15');
    expect(root.querySelector<HTMLImageElement>('.gsi-logo')?.src).toContain('data:image/png');
  });

  it('logo masqué par la configuration', () => {
    const { root } = render(configured((s) => (s.header.showLogo = false)), undefined, 'data:image/png;base64,AAAA');
    expect(root.querySelector('.gsi-logo')).toBeNull();
  });

  it('vente annulée : bandeau visible sur la facture', () => {
    const cancelled = saleToInvoiceData(
      { ...SALE, status: 'CANCELLED', cancelledAt: '2026-10-15T12:00:00Z', cancellationReason: 'Erreur de saisie' },
      { paymentMethodLabel: 'Espèces' }
    );
    const { text } = render(configured(), cancelled);
    expect(text()).toContain('VENTE ANNULÉE');
    expect(text()).toContain('Erreur de saisie');
  });

  it('en-têtes du tableau des produits : centrés par défaut, alignement configurable', () => {
    const table = (root: HTMLElement) => root.querySelector('table.gsi-lines') as HTMLElement;

    expect(table(render(configured()).root).classList).toContain('gsi-lines--head-center');
    TestBed.resetTestingModule();
    expect(table(render(configured((s) => (s.appearance.tableHeaderAlignment = 'AUTO'))).root).classList).toContain(
      'gsi-lines--head-auto'
    );
    TestBed.resetTestingModule();
    expect(table(render(configured((s) => (s.appearance.tableHeaderAlignment = 'RIGHT'))).root).classList).toContain(
      'gsi-lines--head-right'
    );
    TestBed.resetTestingModule();
    // Configuration enregistrée avant ce réglage : centré.
    const legacy = configured((s) => delete (s.appearance as Partial<typeof s.appearance>).tableHeaderAlignment);
    expect(table(render(legacy).root).classList).toContain('gsi-lines--head-center');
  });

  it('police : celle du modèle par défaut, Times New Roman ou Arial imposée à tout le document', () => {
    const article = (root: HTMLElement) => root.querySelector('.gsi') as HTMLElement;

    expect(article(render(configured()).root).style.fontFamily).toBe('');
    TestBed.resetTestingModule();
    const times = article(render(configured((s) => (s.appearance.fontFamily = 'TIMES_NEW_ROMAN'))).root);
    expect(times.style.fontFamily).toContain('Times New Roman');
    TestBed.resetTestingModule();
    const arial = article(render(configured((s) => (s.appearance.fontFamily = 'ARIAL'))).root);
    expect(arial.style.fontFamily).toContain('Arial');
  });

  it('signature : titre, espace pour signature et cachet, puis nom complet en gras', () => {
    const { root } = render(
      configured((s) => {
        s.footer.signatureText = 'Le responsable';
        s.footer.signatureName = 'Awa Koné';
      })
    );
    const block = root.querySelector('.gsi-signature') as HTMLElement;
    const parts = Array.from(block.children).map((c) => c.className || c.textContent?.trim());
    expect(parts).toEqual(['Le responsable', 'gsi-signature__line', 'gsi-signature__name']);
    expect(root.querySelector('.gsi-signature__name')?.textContent?.trim()).toBe('Awa Koné');
    TestBed.resetTestingModule();

    // Nom vide (ou configuration antérieure sans nom) : pas de ligne de nom.
    const noName = render(configured((s) => (s.footer.signatureText = 'Le responsable'))).root;
    expect(noName.querySelector('.gsi-signature__name')).toBeNull();
    TestBed.resetTestingModule();

    // Signature masquée : ni titre ni nom.
    const hidden = render(
      configured((s) => {
        s.footer.signatureText = 'Le responsable';
        s.footer.signatureName = 'Awa Koné';
        s.footer.showSignature = false;
      })
    ).root;
    expect(hidden.querySelector('.gsi-signature')).toBeNull();
  });
});
