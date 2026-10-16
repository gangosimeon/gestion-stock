import { CustomerReturn } from '../../core/models/customer-return.model';
import { Sale } from '../../core/models/sale.model';

/** Ligne de facture : montants de la vente enregistrée, jamais recalculés. */
export interface InvoiceLine {
  sku?: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number | null;
  lineTotal: number;
}

/** Contenu d'une facture, indépendant de sa présentation (configuration). */
export interface InvoiceData {
  number: string;
  date: string;
  customerName: string;
  customerPhone?: string | null;
  warehouseName?: string | null;
  saleTypeLabel?: string | null;
  paymentMethodLabel: string;
  lines: InvoiceLine[];
  /** Total avant remises, s'il est connu. */
  subtotal?: number | null;
  discountTotal: number;
  total: number;
  paidAmount: number;
  creditAmount: number;
  cancelled?: { at?: string | null; reason?: string | null } | null;
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
