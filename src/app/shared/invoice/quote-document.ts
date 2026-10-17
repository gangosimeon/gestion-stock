import { QuoteReference } from '../../core/models/quote.model';
import { DocumentDetail, DocumentSection, InvoiceData } from './invoice-data';

/** Champs facultatifs d'un devis, tels qu'ils sont repris sur le devis et sur sa facture. */
export type QuoteOptionalFields = Pick<
  QuoteReference,
  | 'subject'
  | 'lotReference'
  | 'beneficiaries'
  | 'deliveryAddress'
  | 'contractReference'
  | 'deliveryTerms'
  | 'paymentTerms'
  | 'executionDelay'
  | 'notes'
>;

/** Contenu d'un devis à mettre en page : enregistré, ou en cours de saisie (aperçu). */
export interface QuoteDocumentInput extends QuoteOptionalFields {
  number: string;
  quoteDate: string;
  validUntil: string | null;
  customerName: string;
  customerPhone?: string | null;
  warehouseName?: string | null;
  lines: {
    productSku?: string | null;
    productName: string;
    quantity: number;
    quantityPerBeneficiary?: number | null;
    unitPrice: number;
    lineTotal?: number;
  }[];
  /** Total du serveur (devis enregistré) ; à défaut, somme des lignes (aperçu de saisie). */
  total?: number;
}

/** Texte renseigné, sans espaces superflus ; null s'il est vide ou absent. */
function filled(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  return text ? text : null;
}

/** Objet, lot, bénéficiaires et références : seulement ceux qui sont renseignés. */
export function quoteDetails(q: QuoteOptionalFields): DocumentDetail[] {
  const rows: DocumentDetail[] = [];
  const add = (label: string, value: string | null) => {
    if (value) rows.push({ label, value });
  };
  add('Objet', filled(q.subject));
  add('Lot', filled(q.lotReference));
  // Un nombre de bénéficiaires absent (ou nul) n'est pas affiché.
  add('Nombre de bénéficiaires', q.beneficiaries && q.beneficiaries > 0 ? String(q.beneficiaries) : null);
  add('Lieu de livraison / d’exécution', filled(q.deliveryAddress));
  add('Référence du marché / bon de commande', filled(q.contractReference));
  return rows;
}

/** Conditions et observations : seulement celles qui sont renseignées. */
export function quoteSections(q: QuoteOptionalFields): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const add = (title: string, text: string | null) => {
    if (text) sections.push({ title, text });
  };
  add('Conditions de livraison', filled(q.deliveryTerms));
  add('Conditions de paiement', filled(q.paymentTerms));
  add('Délai d’exécution', filled(q.executionDelay));
  add('Observations', filled(q.notes));
  return sections;
}

/** Devis mis en page (titre DEVIS, sans règlement) : montants du serveur s'il les a calculés. */
export function quoteToDocumentData(q: QuoteDocumentInput): InvoiceData {
  const lines = q.lines.map((l) => ({
    sku: l.productSku ?? null,
    name: l.productName,
    quantity: l.quantity,
    quantityPerBeneficiary: l.quantityPerBeneficiary ?? null,
    unitPrice: l.unitPrice,
    discountPercent: null,
    lineTotal: l.lineTotal ?? l.quantity * l.unitPrice
  }));
  return {
    title: 'DEVIS',
    kind: 'quote',
    number: q.number,
    date: q.quoteDate,
    validUntil: q.validUntil,
    customerName: q.customerName,
    customerPhone: q.customerPhone ?? null,
    warehouseName: q.warehouseName ?? null,
    paymentMethodLabel: null,
    details: quoteDetails(q),
    sections: quoteSections(q),
    lines,
    subtotal: null,
    discountTotal: 0,
    total: q.total ?? lines.reduce((sum, l) => sum + l.lineTotal, 0),
    paidAmount: null,
    creditAmount: null,
    cancelled: null,
    returns: []
  };
}

/**
 * Facture d'une vente issue d'un devis : FACTURE DÉFINITIVE, n° du devis dans les références,
 * et les informations du devis qui sont renseignées (objet, lot, bénéficiaires, conditions…).
 */
export function withQuoteReference(data: InvoiceData, quote: QuoteReference | null): InvoiceData {
  if (!quote) return data;
  return {
    ...data,
    title: 'FACTURE DÉFINITIVE',
    quoteNumber: quote.number,
    details: quoteDetails(quote),
    sections: quoteSections(quote)
  };
}
