import { CustomerReturn } from '../../core/models/customer-return.model';
import { Sale } from '../../core/models/sale.model';

/** Ligne de facture : montants de la vente enregistrée, jamais recalculés. */
export interface InvoiceLine {
  sku?: string | null;
  name: string;
  quantity: number;
  /** Quantité pour un bénéficiaire (devis), affichée à côté de la quantité totale. */
  quantityPerBeneficiary?: number | null;
  unitPrice: number;
  discountPercent?: number | null;
  lineTotal: number;
}

/** Information du document (objet, lot…) : n'est transmise que si elle est renseignée. */
export interface DocumentDetail {
  label: string;
  value: string;
}

/** Partie du document (titre, nom, lignes complémentaires renseignées). */
export interface DocumentParty {
  title: string;
  name: string;
  lines?: string[];
}

/** Section de texte libre (conditions, observations) : transmise seulement si renseignée. */
export interface DocumentSection {
  title: string;
  text: string;
}

/**
 * Contenu d'une facture ou d'un devis, indépendant de sa présentation (configuration). Une
 * information absente n'est jamais transmise : le document n'affiche ni intitulé vide ni
 * valeur de remplacement.
 */
export interface InvoiceData {
  /** Titre du document : FACTURE par défaut, DEVIS pour un devis. */
  title?: string;
  /**
   * Formule du montant en lettres ; facture par défaut. Un bon de transfert (`transfer`) n'est
   * pas chiffré : ni prix, ni totaux, ni conditions de vente.
   */
  kind?: 'invoice' | 'quote' | 'transfer';
  /** Parties affichées à la place du client et du règlement (ex. dépôts d'origine et de destination). */
  parties?: DocumentParty[];
  number: string;
  date: string;
  /** Date de fin de validité (devis). */
  validUntil?: string | null;
  /** Devis d'origine (facture définitive d'un devis). */
  quoteNumber?: string | null;
  customerName: string;
  customerPhone?: string | null;
  warehouseName?: string | null;
  saleTypeLabel?: string | null;
  /** Mode de règlement (vente) ; absent pour un devis. */
  paymentMethodLabel?: string | null;
  /** Objet, lot, références… (seulement les informations renseignées). */
  details?: DocumentDetail[];
  /** Conditions et observations (seulement celles renseignées). */
  sections?: DocumentSection[];
  lines: InvoiceLine[];
  /** Total avant remises, s'il est connu. */
  subtotal?: number | null;
  discountTotal: number;
  total: number;
  /** Montants réglés (vente) ; absents pour un devis. */
  paidAmount?: number | null;
  creditAmount?: number | null;
  /** Espèces remises par le client et monnaie rendue (vente en espèces, si saisies). */
  cashReceived?: number | null;
  changeGiven?: number | null;
  /** Bandeau d'annulation ; `label` remplace « VENTE ANNULÉE » (ex. transfert retourné). */
  cancelled?: { at?: string | null; reason?: string | null; label?: string } | null;
  returns?: CustomerReturn[];
}

/** Facture d'une vente réelle : uniquement des données renvoyées par le serveur. */
export function saleToInvoiceData(
  sale: Sale,
  options: {
    customerName?: string | null;
    customerPhone?: string | null;
    warehouseName?: string | null;
    paymentMethodLabel: string;
    returns?: CustomerReturn[];
  }
): InvoiceData {
  return {
    number: sale.number ?? sale.id,
    date: sale.createdAt,
    customerName: sale.customerName ?? options.customerName ?? 'Client comptoir',
    customerPhone: options.customerPhone ?? null,
    warehouseName: options.warehouseName ?? null,
    saleTypeLabel: sale.type === 'WHOLESALE' ? 'Vente en gros' : 'Vente au détail',
    paymentMethodLabel: options.paymentMethodLabel,
    lines: sale.items.map((it) => ({
      sku: it.productSku ?? null,
      name: it.productName ?? it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountPercent: it.discountPercent ?? null,
      // Le serveur renvoie toujours le total de ligne ; le repli ne sert qu'aux anciennes réponses.
      lineTotal: it.lineTotal ?? it.unitPrice * it.quantity
    })),
    subtotal: sale.subtotal ?? null,
    discountTotal: Number(sale.discountTotal ?? 0),
    total: sale.total,
    paidAmount: sale.paidAmount,
    creditAmount: Number(sale.creditAmount ?? 0),
    cashReceived: sale.cashReceived ?? null,
    changeGiven: sale.changeGiven ?? null,
    cancelled: sale.status === 'CANCELLED' ? { at: sale.cancelledAt, reason: sale.cancellationReason } : null,
    returns: options.returns ?? []
  };
}

/**
 * Données d'exemple de l'aperçu (page de configuration uniquement). Elles ne sont jamais
 * utilisées pour une vraie facture. Les montants sont cohérents entre eux.
 */
export function sampleInvoiceData(): InvoiceData {
  return {
    number: 'VTE-EXEMPLE-0001',
    date: new Date().toISOString(),
    customerName: 'Alpha Traoré (exemple)',
    customerPhone: '+226 78 90 12 34',
    warehouseName: 'Dépôt principal',
    saleTypeLabel: 'Vente au détail',
    paymentMethodLabel: 'Espèces',
    lines: [
      { sku: 'CIM-425', name: 'Ciment 42.5 (50 kg)', quantity: 10, unitPrice: 7500, discountPercent: 0, lineTotal: 75000 },
      { sku: 'FER-10', name: 'Fer à béton 10 mm', quantity: 20, unitPrice: 2800, discountPercent: 5, lineTotal: 53200 },
      { sku: 'CLO-5', name: 'Clous 5 cm (kg)', quantity: 5, unitPrice: 1200, discountPercent: 0, lineTotal: 6000 },
      { sku: 'PEI-5L', name: 'Peinture 5 L', quantity: 2, unitPrice: 12000, discountPercent: 0, lineTotal: 24000 }
    ],
    subtotal: 161000,
    discountTotal: 2800,
    total: 158200,
    paidAmount: 100000,
    creditAmount: 58200,
    cancelled: null,
    returns: []
  };
}
