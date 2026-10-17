/** Statut enregistré d'un devis (backend, enum QuoteStatus). */
export type QuoteStatus = 'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'REFUSED' | 'INVOICED' | 'CANCELLED';

/** Statut affiché : « expiré » se déduit d'un devis émis dont la validité est passée. */
export type QuoteDisplayStatus = QuoteStatus | 'EXPIRED';

export interface QuoteLine {
  id: string;
  lineNumber: number;
  productId: string;
  productSku: string;
  productName: string;
  /** Quantité totale : chiffrée, puis sortie du stock par la vente qui facture le devis. */
  quantity: number;
  /** Quantité pour un bénéficiaire (quantité totale = × nombre de bénéficiaires), ou null. */
  quantityPerBeneficiary: number | null;
  unitPrice: number;
  lineTotal: number;
}

/** Devis renvoyé par le backend. Champs facultatifs non renseignés : null. */
export interface Quote {
  id: string;
  number: string;
  warehouseId: string;
  customerId: string;
  customerName: string;
  /** AAAA-MM-JJ */
  quoteDate: string;
  validUntil: string | null;
  subject: string | null;
  lotReference: string | null;
  beneficiaries: number | null;
  deliveryAddress: string | null;
  contractReference: string | null;
  deliveryTerms: string | null;
  paymentTerms: string | null;
  executionDelay: string | null;
  notes: string | null;
  status: QuoteStatus;
  displayStatus: QuoteDisplayStatus;
  lines: QuoteLine[];
  total: number;
  saleId: string | null;
  saleNumber: string | null;
  invoicedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Création ou modification : aucun total transmis, le serveur le calcule. */
export interface QuoteRequest {
  customerId: string;
  quoteDate: string | null;
  validUntil: string | null;
  subject: string | null;
  lotReference: string | null;
  beneficiaries: number | null;
  deliveryAddress: string | null;
  contractReference: string | null;
  deliveryTerms: string | null;
  paymentTerms: string | null;
  executionDelay: string | null;
  notes: string | null;
  /** quantityPerBeneficiary renseignée : la quantité totale est calculée par le serveur. */
  lines: { productId: string; quantity: number | null; quantityPerBeneficiary: number | null; unitPrice: number }[];
}

/** Informations d'un devis reprises sur la facture de la vente qui en est issue. */
export interface QuoteReference {
  id: string;
  number: string;
  quoteDate: string;
  subject: string | null;
  lotReference: string | null;
  beneficiaries: number | null;
  deliveryAddress: string | null;
  contractReference: string | null;
  deliveryTerms: string | null;
  paymentTerms: string | null;
  executionDelay: string | null;
  notes: string | null;
}

export interface QuoteSearchFilters {
  status?: QuoteDisplayStatus | null;
  from?: string | null;
  to?: string | null;
  allWarehouses?: boolean | null;
}

export const quoteStatusLabels: Record<QuoteDisplayStatus, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Émis',
  ACCEPTED: 'Accepté',
  REFUSED: 'Refusé',
  EXPIRED: 'Expiré',
  INVOICED: 'Facturé',
  CANCELLED: 'Annulé'
};

/** Modifiable tant qu'il est brouillon ou émis (règle du backend). */
export function isQuoteEditable(q: Pick<Quote, 'status'>): boolean {
  return q.status === 'DRAFT' || q.status === 'ISSUED';
}

/** Facturable : émis ou accepté. */
export function isQuoteInvoiceable(q: Pick<Quote, 'status'>): boolean {
  return q.status === 'ISSUED' || q.status === 'ACCEPTED';
}
