export type PurchaseOrderStatus = 'PENDING' | 'DELIVERED';

export interface PurchaseOrderLine {
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  unitPurchasePrice: number;
  lineTotal: number;
}

export interface SupplierInvoice {
  invoiceNumber: string;
  invoiceDateIso: string;
  totalAmount: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  createdAt: string;
  deliveredAt?: string;
  lines: PurchaseOrderLine[];
  totalAmount: number;
  paidAmount: number;
  invoice?: SupplierInvoice;
}
