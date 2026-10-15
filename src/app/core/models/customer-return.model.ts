import { PaymentMethod } from './sale.model';

/** Règlement d'un retour : remboursement depuis la caisse, ou avoir sur la dette du client. */
export type ReturnSettlement = 'REFUND' | 'ACCOUNT_CREDIT';

/** État de l'article rendu : revendable (remis en stock) ou défectueux (pas remis en stock). */
export type ItemCondition = 'RESELLABLE' | 'DEFECTIVE';

export interface CustomerReturnLine {
  id: string;
  lineNumber: number;
  saleLineId: string;
  productId: string;
  productSku?: string;
  productName?: string;
  quantity: number;
  /** Montant remboursé ou crédité, au prix net de la vente (calculé par le serveur). */
  amount: number;
  condition: ItemCondition;
  stockMovementId?: string | null;
}

/** Retour client (avoir), tel que renvoyé par le backend. */
export interface CustomerReturn {
  id: string;
  number: string;
  saleId: string;
  warehouseId: string;
  customerId?: string | null;
  settlement: ReturnSettlement;
  refundMethod?: PaymentMethod | null;
  totalAmount: number;
  reason: string;
  createdAt: string;
  createdByUserId: string;
  lines: CustomerReturnLine[];
}

/** POST /api/sales/{id}/returns : aucun montant envoyé, le serveur le calcule. */
export interface CreateCustomerReturnRequest {
  settlement: ReturnSettlement;
  refundMethod?: PaymentMethod;
  reason: string;
  items: { productId: string; quantity: number; condition: ItemCondition }[];
}

export const settlementLabels: Record<ReturnSettlement, string> = {
  REFUND: 'Remboursement',
  ACCOUNT_CREDIT: 'Avoir sur la dette'
};

export const conditionLabels: Record<ItemCondition, string> = {
  RESELLABLE: 'Revendable (remis en stock)',
  DEFECTIVE: 'Défectueux (pas remis en stock)'
};
