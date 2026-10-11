export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  deliveryLeadTimeDays: number;
  // Champs du backend (absents des fournisseurs simulés).
  code?: string;
  contactName?: string | null;
  taxId?: string | null;
  paymentTermsDays?: number;
  note?: string | null;
  active?: boolean;
}

/** Compte fournisseur calculé par le backend (GET /api/suppliers/{id}/account). */
export interface SupplierAccount {
  supplierId: string;
  /** Total commandé, hors commandes annulées. */
  orderedAmount: number;
  receivedAmount: number;
  /** Montant dû : commandé pour les commandes en cours ou reçues, reçu pour les soldées. */
  payableAmount: number;
  paidAmount: number;
  remainingToPay: number;
  /** Acomptes : payé au-delà de la valeur reçue. */
  advanceAmount: number;
  ordersToPay: number;
}
