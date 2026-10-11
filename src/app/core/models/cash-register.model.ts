import { PaymentMethod } from './sale.model';

export type CashRegisterSessionStatus = 'OPEN' | 'CLOSED';
/** Sens du mouvement d'argent. */
export type CashOperationType = 'IN' | 'OUT';

/** Nature de l'écriture (backend) : vente, règlement client, apport, sortie, paiement fournisseur… */
export type CashEntryType =
  | 'SALE'
  | 'CUSTOMER_PAYMENT'
  | 'CASH_IN'
  | 'CORRECTION_IN'
  | 'EXPENSE_CANCELLATION'
  | 'SALE_REFUND'
  | 'RETURN_REFUND'
  | 'CASH_OUT'
  | 'CORRECTION_OUT'
  | 'SUPPLIER_PAYMENT'
  | 'EXPENSE';

export interface CashOperation {
  id: string;
  sessionId: string;
  type: CashOperationType;
  amount: number;
  createdAt: string;
  createdByUserId: string;
  note?: string | null;
  // Champs du backend.
  /** Référence OPC-AAAA-nnnnnn. */
  number?: string;
  entryType?: CashEntryType;
  paymentMethod?: PaymentMethod;
  /** Pièce d'origine (numéro de vente, de paiement fournisseur…). */
  sourceReference?: string | null;
}

export interface CashRegisterSession {
  id: string;
  status: CashRegisterSessionStatus;

  openedAt: string;
  openedByUserId: string;
  openingBalance: number;

  closedAt?: string | null;
  closedByUserId?: string | null;
  countedCash?: number | null;

  // Récapitulatif calculé par le backend à partir des écritures de la session.
  cashSalesTotal: number;
  totalIn: number;
  totalOut: number;
  expectedCash: number;
  difference: number;

  // Champs du backend.
  number?: string;
  warehouseId?: string;
  terminal?: string | null;
  /** Solde net par moyen de paiement (rapprochement mobile money, virements). */
  totalsByMethod?: Partial<Record<PaymentMethod, number>>;
}
