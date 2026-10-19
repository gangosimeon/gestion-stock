import { StockTransfer } from '../../core/models/stock-transfer.model';
import { DocumentSection, InvoiceData } from './invoice-data';

/**
 * Bon de transfert entre dépôts, mis en page comme les factures (configuration de la
 * facture) mais sans prix : dépôts d'origine et de destination, produits et quantités, note et,
 * le cas échéant, le retour au dépôt d'origine.
 */
export function transferToDocumentData(t: StockTransfer): InvoiceData {
  const sections: DocumentSection[] = [];
  const note = (t.note ?? '').trim();
  if (note) sections.push({ title: 'Note', text: note });

  return {
    title: 'BON DE TRANSFERT',
    kind: 'transfer',
    number: t.number,
    date: t.createdAt,
    customerName: '',
    parties: [
      {
        title: 'Dépôt d’origine',
        name: t.fromWarehouseName,
        lines: t.createdByUsername ? [`Transféré par : ${t.createdByUsername}`] : []
      },
      { title: 'Dépôt de destination', name: t.toWarehouseName }
    ],
    sections,
    lines: t.lines.map((l) => ({
      sku: l.productSku,
      name: l.productName,
      quantity: l.quantity,
      unitPrice: 0,
      lineTotal: 0
    })),
    discountTotal: 0,
    total: 0,
    cancelled:
      t.status === 'RETURNED'
        ? {
            label: 'TRANSFERT RETOURNÉ AU DÉPÔT D’ORIGINE',
            at: t.returnedAt ?? null,
            reason: [t.returnReason, t.returnedByUsername ? `par ${t.returnedByUsername}` : null]
              .filter((v) => !!v)
              .join(' — ') || null
          }
        : null,
    returns: []
  };
}
