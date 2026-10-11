import { Product } from '../../../core/models/product.model';
import { PurchaseOrder, PurchaseOrderDocumentStatus, PurchaseOrderStatus } from '../../../core/models/purchase-order.model';
import { Supplier } from '../../../core/models/supplier.model';

export interface PurchasesVm {
  isLoading: boolean;
  errorMessage: string | null;
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  products: Product[];
  filter: string;
  /** purchase:create — nouvelle commande (interface seulement). */
  canCreate: boolean;
  /** purchase:receive — réception. */
  canReceive: boolean;
  /** purchase:pay — paiement et facture fournisseur. */
  canPay: boolean;
}

export type PurchaseDrawerMode = 'CREATE' | 'DETAIL';

export interface PurchaseDrawerState {
  opened: boolean;
  mode: PurchaseDrawerMode;
  orderId: string | null;
}

export const purchaseStatusLabels: Record<PurchaseOrderStatus, string> = {
  PENDING: 'En attente',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulée'
};

/** Statut détaillé du backend (préféré au statut historique quand il est présent). */
export const purchaseDocumentStatusLabels: Record<PurchaseOrderDocumentStatus, string> = {
  ORDERED: 'Commandée',
  PARTIALLY_RECEIVED: 'Reçue en partie',
  RECEIVED: 'Reçue',
  CLOSED: 'Soldée',
  CANCELLED: 'Annulée'
};
