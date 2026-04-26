import { Product } from '../../../core/models/product.model';
import { PurchaseOrder, PurchaseOrderStatus } from '../../../core/models/purchase-order.model';
import { Supplier } from '../../../core/models/supplier.model';

export interface PurchasesVm {
  isLoading: boolean;
  errorMessage: string | null;
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  products: Product[];
  filter: string;
}

export type PurchaseDrawerMode = 'CREATE' | 'DETAIL';

export interface PurchaseDrawerState {
  opened: boolean;
  mode: PurchaseDrawerMode;
  orderId: string | null;
}

export const purchaseStatusLabels: Record<PurchaseOrderStatus, string> = {
  PENDING: 'En attente',
  DELIVERED: 'Livré'
};
