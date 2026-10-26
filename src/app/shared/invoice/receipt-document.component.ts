import { Component, ElementRef, ViewEncapsulation, computed, inject, input } from '@angular/core';

import { InvoiceSettings } from '../../core/models/invoice-settings.model';
import { settlementLabels } from '../../core/models/customer-return.model';
import { InvoiceData } from './invoice-data';
import { formatInvoiceAmount, formatInvoiceDate, formatInvoiceMoney, formatInvoiceTime } from './invoice-format';

/**
 * Ticket de caisse 80 mm (imprimante thermique) d'une vente : même contenu que la facture A4
 * (`InvoiceData`) et même configuration (coordonnées, logo, mentions, format des montants), dans
 * une présentation étroite et monochrome. La facture A4 reste disponible à côté.
 *
 * Présentation uniquement : chaque montant vient de `data`, rien n'est recalculé. Un texte vide
 * de la configuration n'est jamais affiché. Styles globaux préfixés (`gsr-`) pour être recopiés
 * tels quels dans la fenêtre d'impression.
 */
@Component({
  selector: 'app-receipt-document',
  standalone: true,
  templateUrl: './receipt-document.component.html',
  styleUrl: './receipt-document.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ReceiptDocumentComponent {
  readonly settings = input.required<InvoiceSettings>();
  readonly data = input.required<InvoiceData>();
  readonly logoUrl = input<string | null>(null);

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly settlementLabels = settlementLabels;

  readonly company = computed(() => this.settings().company);
  readonly header = computed(() => this.settings().header);
  readonly appearance = computed(() => this.settings().appearance);

  readonly showLogo = computed(() => this.header().showLogo && !!this.logoUrl());

  /** Coordonnées de l'en-tête (une par ligne), sans les champs vides ou masqués. */
  readonly contacts = computed(() => {
    const c = this.company();
    const h = this.header();
    const rows: string[] = [];
    if (h.showAddress && c.address) rows.push(c.address);
    const cityCountry = [c.city, c.country].filter((v) => !!v).join(' – ');
    if (h.showCityCountry && cityCountry) rows.push(cityCountry);
    if (h.showPhone && c.phone) rows.push(`Tél. ${c.phone}`);
    if (h.showRegistrationNumber && c.registrationNumber) rows.push(`RCCM ${c.registrationNumber}`);
    if (h.showTaxId && c.taxId) rows.push(`IFU/NIF ${c.taxId}`);
    return rows;
  });

  /** Client nommé uniquement (le client comptoir n'apporte rien sur un ticket). */
  readonly namedCustomer = computed(() => {
    const name = this.data().customerName;
    return name && name !== 'Client comptoir' ? name : '';
  });

  readonly hasDiscount = computed(() => Number(this.data().discountTotal ?? 0) > 0);

  readonly showCashTender = computed(() => this.appearance().showCashTender !== false);

  readonly returnedTotal = computed(() =>
    (this.data().returns ?? []).reduce((sum, r) => sum + Number(r.totalAmount ?? 0), 0)
  );

  readonly thankYou = computed(() => {
    const f = this.settings().footer;
    return f.showThankYou ? f.thankYouMessage : '';
  });

  /** Mentions courtes utiles au client (retours, promotion) ; les conditions longues restent sur la facture A4. */
  readonly footerNotes = computed(() => {
    const f = this.settings().footer;
    return [
      f.showReturnPolicy ? f.returnPolicy : '',
      f.showPromoMessage ? f.promoMessage : '',
      f.showLegalText ? f.legalText : ''
    ].filter((text) => !!text);
  });

  amount(value: number | null | undefined): string {
    return formatInvoiceAmount(value, this.appearance());
  }

  money(value: number | null | undefined): string {
    return formatInvoiceMoney(value, this.appearance());
  }

  date(value: string | null | undefined): string {
    return formatInvoiceDate(value, 'dd/MM/yyyy');
  }

  time(value: string | null | undefined): string {
    return formatInvoiceTime(value);
  }

  /** Racine HTML du ticket (impression). */
  root(): HTMLElement {
    return this.element.nativeElement.querySelector('.gsr') as HTMLElement;
  }
}
