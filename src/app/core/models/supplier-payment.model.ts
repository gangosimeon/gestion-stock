export type SupplierPaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER';

export interface SupplierPaymentAllocation {
  orderId: string;
  orderNumber: string;
  amount: number;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  paymentDateIso: string;
  amount: number;
  /** Commande réglée quand le paiement porte sur une seule commande. */
  orderId?: string | null;
  note?: string | null;
  // Champs du backend.
  number?: string;
  paymentMethod?: SupplierPaymentMethod;
  /** Répartition du paiement sur les commandes (somme = montant). */
  allocations?: SupplierPaymentAllocation[];
  externalReference?: string | null;
}
