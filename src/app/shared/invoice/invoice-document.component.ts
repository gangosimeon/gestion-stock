import { Component, ElementRef, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { InvoiceSettings } from '../../core/models/invoice-settings.model';
import { settlementLabels } from '../../core/models/customer-return.model';
import { InvoiceData } from './invoice-data';
import {
  amountInWords,
  formatInvoiceAmount,
  formatInvoiceDate,
  formatInvoiceMoney,
  formatInvoiceTime
} from './invoice-format';

/** Polices imposées par la configuration (MODEL : celle du modèle, rien à imposer). */
const FONTS: Partial<Record<string, string>> = {
  TIMES_NEW_ROMAN: "'Times New Roman', Times, serif",
  ARIAL: 'Arial, Helvetica, sans-serif'
};

interface FooterBlock {
  title: string | null;
  text: string;
  kind: 'section' | 'promo' | 'legal' | 'thanks' | 'closing';
}

/**
 * Facture mise en page selon la configuration : seul rendu des factures (écran, impression,
 * PDF) et de l'aperçu de la page de configuration. Les styles sont globaux et préfixés
 * (`gsi-`) pour être recopiés tels quels dans la fenêtre d'impression et dans l'export PDF.
 *
 * Présentation uniquement : chaque montant vient de `data`, rien n'est recalculé. Un texte
 * vide de la configuration n'est jamais affiché.
 */
@Component({
  selector: 'app-invoice-document',
  standalone: true,
  templateUrl: './invoice-document.component.html',
  styleUrl: './invoice-document.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class InvoiceDocumentComponent {
  readonly settings = input.required<InvoiceSettings>();
  readonly data = input.required<InvoiceData>();
  readonly logoUrl = input<string | null>(null);
  /** Aperçu : données d'exemple, signalées comme telles. */
  readonly preview = input(false);

  readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly settlementLabels = settlementLabels;

  readonly company = computed(() => this.settings().company);
  readonly header = computed(() => this.settings().header);
  readonly appearance = computed(() => this.settings().appearance);

  readonly cssVars = computed(() => {
    const a = this.appearance();
    const font = FONTS[a.fontFamily];
    return {
      '--gsi-primary': a.primaryColor,
      '--gsi-secondary': a.secondaryColor,
      '--gsi-text': a.textColor,
      // Police imposée : elle remplace celle du modèle sur tout le document.
      ...(font ? { 'font-family': font } : {})
    };
  });

  readonly showLogo = computed(() => this.header().showLogo && !!this.logoUrl());

  /** Raison sociale affichée seulement si elle diffère du nom commercial. */
  readonly legalName = computed(() => {
    const c = this.company();
    return c.legalName && c.legalName !== c.companyName ? c.legalName : '';
  });

  readonly cityCountry = computed(() => {
    const c = this.company();
    return [c.city, c.country].filter((v) => !!v).join(' – ');
  });

  /** Coordonnées de l'en-tête, dans l'ordre d'affichage, sans les champs vides ou masqués. */
  readonly contacts = computed(() => {
    const c = this.company();
    const h = this.header();
    const rows: { label: string | null; value: string }[] = [];
    if (h.showAddress && c.address) rows.push({ label: null, value: c.address });
    if (h.showCityCountry && this.cityCountry()) rows.push({ label: null, value: this.cityCountry() });
    if (h.showPhone && c.phone) rows.push({ label: 'Téléphone', value: c.phone });
    if (h.showEmail && c.email) rows.push({ label: 'Email', value: c.email });
    if (h.showWebsite && c.website) rows.push({ label: 'Site web', value: c.website });
    return rows;
  });

  readonly legalIds = computed(() => {
    const c = this.company();
    const h = this.header();
    const ids: { label: string; value: string }[] = [];
    if (h.showRegistrationNumber && c.registrationNumber) ids.push({ label: 'RCCM', value: c.registrationNumber });
    if (h.showTaxId && c.taxId) ids.push({ label: 'IFU/NIF', value: c.taxId });
    return ids;
  });

  /** Colonne « Remise » : demandée par la configuration et utile (au moins une ligne remisée). */
  readonly showDiscountColumn = computed(
    () => this.appearance().showDiscountColumn && this.data().lines.some((l) => Number(l.discountPercent ?? 0) > 0)
  );

  /** Colonne « Quantité par bénéficiaire » : seulement si une ligne est chiffrée par bénéficiaire. */
  readonly showPerBeneficiaryColumn = computed(() => this.data().lines.some((l) => !!l.quantityPerBeneficiary));

  /** Alignement des en-têtes du tableau ; centré pour une configuration enregistrée avant ce réglage. */
  readonly tableHeadClass = computed(
    () => 'gsi-lines--head-' + (this.appearance().tableHeaderAlignment || 'CENTER').toLowerCase()
  );

  readonly showSkuColumn = computed(() => this.appearance().showSku && this.data().lines.some((l) => !!l.sku));

  readonly footerBlocks = computed<FooterBlock[]>(() => {
    const f = this.settings().footer;
    const blocks: FooterBlock[] = [];
    const add = (show: boolean, text: string, title: string | null, kind: FooterBlock['kind']) => {
      if (show && text) blocks.push({ title, text, kind });
    };
    add(f.showSalesTerms, f.salesTerms, 'Conditions de vente', 'section');
    add(f.showReturnPolicy, f.returnPolicy, 'Retours et échanges', 'section');
    add(f.showPaymentTerms, f.paymentTerms, 'Modalités de paiement', 'section');
    add(f.showPaymentDetails, f.paymentDetails, 'Coordonnées de paiement', 'section');
    add(f.showPromoMessage, f.promoMessage, null, 'promo');
    add(f.showLegalText, f.legalText, null, 'legal');
    return blocks;
  });

  readonly thankYou = computed(() => {
    const f = this.settings().footer;
    return f.showThankYou ? f.thankYouMessage : '';
  });

  readonly signature = computed(() => {
    const f = this.settings().footer;
    return f.showSignature ? f.signatureText : '';
  });

  readonly closing = computed(() => {
    const f = this.settings().footer;
    return f.showClosingText ? f.closingText : '';
  });

  readonly pageFooter = computed(() => {
    const a = this.appearance();
    return a.showPageFooterText ? a.pageFooterText : '';
  });

  readonly returnedTotal = computed(() =>
    (this.data().returns ?? []).reduce((sum, r) => sum + Number(r.totalAmount ?? 0), 0)
  );

  amount(value: number | null | undefined): string {
    return formatInvoiceAmount(value, this.appearance());
  }

  money(value: number | null | undefined): string {
    return formatInvoiceMoney(value, this.appearance());
  }

  date(value: string | null | undefined): string {
    return formatInvoiceDate(value, this.appearance().dateFormat);
  }

  time(value: string | null | undefined): string {
    return formatInvoiceTime(value);
  }

  words(value: number): string {
    return amountInWords(value);
  }

  alignClass(alignment: string): string {
    return `gsi-align-${alignment.toLowerCase()}`;
  }

  /** Racine HTML de la facture (impression, PDF). */
  root(): HTMLElement {
    return this.element.nativeElement.querySelector('.gsi') as HTMLElement;
  }
}
