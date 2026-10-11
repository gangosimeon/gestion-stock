import { PaymentMethod } from './sale.model';

export interface CustomerPayment {
  id: string;
  customerId: string;
  /** Date de l'encaissement (le backend encaisse maintenant). */
  paymentDateIso: string;
  amount: number;
  note?: string | null;
  // Champs du backend.
  paymentMethod?: PaymentMethod;
  /** Référence de l'encaissement en caisse (OPC-AAAA-nnnnnn). */
  reference?: string;
  sessionId?: string;
  createdAt?: string;
}
