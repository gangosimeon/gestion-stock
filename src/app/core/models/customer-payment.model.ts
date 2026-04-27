export interface CustomerPayment {
  id: string;
  customerId: string;
  paymentDateIso: string;
  amount: number;
  note?: string;
}
