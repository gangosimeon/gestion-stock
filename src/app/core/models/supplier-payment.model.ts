export interface SupplierPayment {
  id: string;
  supplierId: string;
  paymentDateIso: string;
  amount: number;
  orderId?: string;
  note?: string;
}
