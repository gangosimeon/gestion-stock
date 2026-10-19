/** État d'un transfert : effectué, ou stock revenu au dépôt d'origine. */
export type StockTransferStatus = 'COMPLETED' | 'RETURNED';

/** Sens d'un transfert vu du dépôt courant. */
export type StockTransferDirection = 'SENT' | 'RECEIVED';

/** Produit transféré (quantité positive) ; référence et nom au jour du transfert. */
export interface StockTransferLine {
  lineNumber: number;
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
}

/** Transfert entre dépôts (pièce du reçu, GET /api/stock/transfers). Noms au jour du transfert. */
export interface StockTransfer {
  id: string;
  /** TRF-AAAA-nnnnnn */
  number: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  /** Produits transférés, dans l'ordre de saisie. */
  lines: StockTransferLine[];
  /** Somme des quantités des lignes. */
  totalQuantity: number;
  note?: string | null;
  status: StockTransferStatus;
  createdAt: string;
  createdByUserId?: string | null;
  createdByUsername?: string | null;
  returnedAt?: string | null;
  returnedByUserId?: string | null;
  returnedByUsername?: string | null;
  returnReason?: string | null;
}

export const stockTransferStatusLabels: Record<StockTransferStatus, string> = {
  COMPLETED: 'Effectué',
  RETURNED: 'Retourné'
};

export const stockTransferDirectionLabels: Record<StockTransferDirection, string> = {
  SENT: 'Envoyé',
  RECEIVED: 'Reçu'
};
